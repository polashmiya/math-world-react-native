import type { BrainCategory } from '../../core/constants/categories';
import { clampDifficulty } from '../../core/constants/difficulty';
import { validateAnswer, scoreEstimate } from '../../core/question-engine/answerValidator';
import { nextDifficulty as computeNextDifficulty, speedScore, startingDifficulty } from '../../core/question-engine/difficultyEngine';
import { generateQuestions } from '../../core/question-engine/registry';
import { computeMastery, pushOutcome } from '../../core/adaptive-learning/masteryEngine';
import {
  fillPlan,
  planAdaptiveSet,
  type AdaptivePlanSlot,
} from '../../core/adaptive-learning/adaptiveSelector';
import { updateDimensions, compositeScore } from '../../core/adaptive-learning/thinkingScore';
import { scheduleReview } from '../../core/spaced-repetition/scheduler';
import { dayKey } from '../../core/utils/date';
import { uuid } from '../../core/utils/id';
import { tierForXp } from '../../core/constants/categories';
import { newSyncMeta, touchSyncMeta, MISTAKE_MASTERY_RETRIES } from '../models';
import type {
  ID,
  Mistake,
  PracticeMode,
  Question,
  QuestionAttempt,
  StudySession,
} from '../models';
import type { RepositoryRegistry } from '../repositories';
import { levelForXp, updateStreak, xpForAttempt } from '../rules/xp';

export interface PracticeRequest {
  count?: number;
  topicIds?: ID[];
  skillIds?: ID[];
  examIds?: ID[];
  brainCategories?: BrainCategory[];
  generatorIds?: string[];
  mode: PracticeMode;
  /** Overrides the adaptive difficulty when the user picked one. */
  difficulty?: number;
  seed?: string | number;
  /** Boss battles and challenges ramp difficulty across the set. */
  difficultyRamp?: { from: number; to: number };
}

export interface PracticeSet {
  sessionId: ID;
  mode: PracticeMode;
  questions: Question[];
  /** Where each question came from, for the "why this question" hint. */
  origins: AdaptivePlanSlot['kind'][];
  targetDifficulty: number;
  reason: string;
}

export interface SubmitAnswerRequest {
  sessionId?: ID | null;
  question: Question;
  givenAnswer: string;
  timeSpentMs: number;
  hintsUsed: number;
  mode: PracticeMode;
  /** Think First inputs (spec §21). */
  estimateValue?: number | null;
  strategy?: string | null;
  now?: number;
}

export interface SubmitAnswerResult {
  attempt: QuestionAttempt;
  isCorrect: boolean;
  nearMiss: boolean;
  expectedAnswer: string;
  xpEarned: number;
  coinsEarned: number;
  newLevel?: number;
  streakDays: number;
  streakIncremented: boolean;
  topicMastery: number;
  nextDifficulty: number;
  mistakeResolved: boolean;
  estimateAccuracy: number | null;
  unlockedAchievementCodes: string[];
}

/**
 * The practice use cases (spec §3): the UI calls these, they call the domain
 * repositories, and nothing here knows that SQLite exists.
 */
export class PracticeService {
  constructor(private readonly repos: RepositoryRegistry) {}

  /** Builds an adaptive set of questions (spec §16). */
  async getPracticeQuestions(request: PracticeRequest): Promise<PracticeSet> {
    const count = Math.max(1, Math.min(60, request.count ?? 10));
    const now = Date.now();
    const [recentAttempts, topicProgress, skillProgress, openMistakes, dueReviews, settings, profile] =
      await Promise.all([
        this.repos.attempts.getAttempts({ limit: 20 }),
        this.repos.progress.getTopicProgress(),
        this.repos.progress.getSkillProgress(),
        this.repos.mistakes.getMistakes({ limit: 30 }),
        this.repos.reviews.getDueItems(now, 30),
        this.repos.users.getSettings(),
        this.repos.users.getProfile(),
      ]);

    const currentDifficulty = await this.resolveDifficulty(request, topicProgress, profile);
    const seed = request.seed ?? now;

    if (!settings.adaptiveDifficultyEnabled || request.difficulty !== undefined) {
      // Straight generation at a fixed difficulty when the user has chosen one.
      const questions = generateQuestions({
        count,
        difficulty: currentDifficulty,
        topicIds: request.topicIds,
        skillIds: request.skillIds,
        examIds: request.examIds,
        brainCategories: request.brainCategories,
        generatorIds: request.generatorIds,
        difficultyRamp: request.difficultyRamp,
        seed,
      });
      await this.repos.questions.upsertQuestions(questions);
      return {
        sessionId: uuid(),
        mode: request.mode,
        questions,
        origins: questions.map(() => 'fresh'),
        targetDifficulty: currentDifficulty,
        reason: request.difficulty !== undefined ? 'manual' : 'fixed',
      };
    }

    const input = {
      count,
      topicIds: request.topicIds,
      skillIds: request.skillIds,
      examIds: request.examIds,
      brainCategories: request.brainCategories,
      recentAttempts,
      topicProgress,
      skillProgress,
      openMistakes: settings.spacedRepetitionEnabled ? openMistakes : [],
      dueReviews: settings.spacedRepetitionEnabled ? dueReviews : [],
      currentDifficulty,
      seed,
      now,
    };

    const plan = planAdaptiveSet(input);
    const filled = fillPlan(plan, input);

    const questions: Question[] = [];
    const origins: AdaptivePlanSlot['kind'][] = [];
    for (const slot of filled) {
      const question = slot.question ?? (await this.hydrateSlot(slot));
      if (!question) continue;
      if (questions.some((q) => q.id === question.id)) continue;
      questions.push(question);
      origins.push(slot.kind);
    }

    // Top up if reviews or mistakes could not be hydrated.
    if (questions.length < count) {
      const extra = generateQuestions({
        count: count - questions.length,
        difficulty: plan.targetDifficulty,
        topicIds: request.topicIds,
        skillIds: request.skillIds,
        examIds: request.examIds,
        brainCategories: request.brainCategories,
        generatorIds: request.generatorIds,
        seed: String(seed) + ':topup',
        excludeIds: questions.map((q) => q.id),
      });
      for (const question of extra) {
        questions.push(question);
        origins.push('fresh');
      }
    }

    await this.repos.questions.upsertQuestions(questions.filter((q) => q.source === 'generated'));

    return {
      sessionId: uuid(),
      mode: request.mode,
      questions: questions.slice(0, count),
      origins: origins.slice(0, count),
      targetDifficulty: plan.targetDifficulty,
      reason: plan.reason,
    };
  }

  /**
   * Records an answer and updates every derived record in one place: attempt,
   * mistake bank, topic and skill mastery, spaced repetition, streak, XP,
   * daily activity, thinking score and achievements.
   */
  async submitAnswer(request: SubmitAnswerRequest): Promise<SubmitAnswerResult> {
    const now = request.now ?? Date.now();
    const { question } = request;
    const validation = validateAnswer(question, request.givenAnswer);
    const estimateAccuracy =
      request.estimateValue === undefined || request.estimateValue === null
        ? null
        : scoreEstimate(question, request.estimateValue);

    const attempt: QuestionAttempt = {
      ...newSyncMeta(now),
      id: uuid(),
      questionId: question.id,
      topicId: question.topicId,
      skillIds: question.skillIds,
      sessionId: request.sessionId ?? null,
      mode: request.mode,
      difficulty: question.difficulty,
      isCorrect: validation.isCorrect,
      givenAnswer: validation.normalizedAnswer,
      correctAnswer: question.correctAnswer,
      timeSpentMs: Math.max(0, request.timeSpentMs),
      hintsUsed: Math.max(0, request.hintsUsed),
      estimateValue: request.estimateValue ?? null,
      estimateAccuracy,
      strategy: request.strategy ?? null,
    };

    // The question must exist before an attempt can reference it.
    if (question.source === 'generated') {
      await this.repos.questions.upsertQuestions([question]);
    }
    await this.repos.attempts.saveAttempt(attempt);

    const settings = await this.repos.users.getSettings();
    const speed = speedScore(attempt.timeSpentMs, attempt.difficulty);

    const streakState = await this.repos.progress.getStreak();
    const streakUpdate = updateStreak(streakState, now);
    if (streakUpdate.incremented || streakUpdate.broken) {
      await this.repos.progress.updateStreak(touchSyncMeta(streakUpdate.streak, now));
    }

    const award = xpForAttempt({
      isCorrect: validation.isCorrect,
      difficulty: attempt.difficulty,
      mode: attempt.mode,
      hintsUsed: attempt.hintsUsed,
      speedScore: speed,
      streakDays: streakUpdate.streak.currentStreak,
    });

    const mistakeResolved = await this.updateMistakeBank(question, validation.isCorrect, now);
    const topicMastery = await this.updateTopicProgress(question, attempt, now);
    await this.updateSkillProgress(question, attempt, now);
    if (settings.spacedRepetitionEnabled) {
      await this.updateReviewSchedule(question, validation.isCorrect, speed, attempt.hintsUsed, now);
    }
    await this.updateBrainProgress(question, validation.isCorrect, now);
    const thinkingScore = await this.updateThinkingScore(attempt, question, now);
    const progressAfter = await this.updateUserProgress(attempt, award, streakUpdate.streak, topicMastery, thinkingScore, now);
    await this.updateDailyActivity(attempt, award.xp, now);
    const unlocked = await this.checkAchievements(now);

    const recent = await this.repos.attempts.getAttempts({ topicIds: [question.topicId], limit: 10 });
    const nextDifficulty = clampDifficulty(
      recent.length >= 3
        ? computeNextDifficulty({ attempts: recent, currentDifficulty: question.difficulty }).nextDifficulty
        : question.difficulty,
    );

    return {
      attempt,
      isCorrect: validation.isCorrect,
      nearMiss: validation.nearMiss,
      expectedAnswer: validation.expectedAnswer,
      xpEarned: award.xp,
      coinsEarned: award.coins,
      newLevel: progressAfter.levelledUp ? progressAfter.level : undefined,
      streakDays: streakUpdate.streak.currentStreak,
      streakIncremented: streakUpdate.incremented,
      topicMastery,
      nextDifficulty,
      mistakeResolved,
      estimateAccuracy,
      unlockedAchievementCodes: unlocked,
    };
  }

  /* ── internals ─────────────────────────────────────────────────────────── */

  private async resolveDifficulty(
    request: PracticeRequest,
    topicProgress: Awaited<ReturnType<RepositoryRegistry['progress']['getTopicProgress']>>,
    profile: Awaited<ReturnType<RepositoryRegistry['users']['getProfile']>>,
  ): Promise<number> {
    if (request.difficulty !== undefined) return clampDifficulty(request.difficulty);
    const topicId = request.topicIds?.[0];
    const topic = topicId ? await this.repos.topics.getTopicById(topicId) : null;
    const mastery = topicId ? (topicProgress.find((p) => p.topicId === topicId)?.mastery ?? 0) : 0;
    const preference =
      profile.difficultyPreference === 'adaptive'
        ? ('adaptive' as const)
        : difficultyFromBand(profile.difficultyPreference);
    return startingDifficulty(topic?.baseDifficulty ?? 3, preference, mastery);
  }

  /** Restores the exact question behind a review or mistake slot. */
  private async hydrateSlot(slot: AdaptivePlanSlot): Promise<Question | null> {
    if (!slot.itemId) return null;
    const stored = await this.repos.questions.getQuestionById(slot.itemId);
    if (stored) return stored;
    if (!slot.snapshot) return null;
    try {
      const parsed = JSON.parse(slot.snapshot) as Question;
      return parsed && parsed.id ? parsed : null;
    } catch {
      return null;
    }
  }

  private async updateMistakeBank(question: Question, isCorrect: boolean, now: number): Promise<boolean> {
    const existing = await this.repos.mistakes.getMistakeByQuestionId(question.id);

    if (!isCorrect) {
      const mistake: Mistake = existing
        ? { ...existing, lastMistakeAt: now, difficulty: question.difficulty, questionSnapshot: JSON.stringify(question) }
        : {
            ...newSyncMeta(now),
            id: uuid(),
            questionId: question.id,
            topicId: question.topicId,
            skillIds: question.skillIds,
            difficulty: question.difficulty,
            mistakeCount: 1,
            lastMistakeAt: now,
            correctStreak: 0,
            resolved: false,
            questionSnapshot: JSON.stringify(question),
            reason: null,
          };
      await this.repos.mistakes.recordMistake(mistake);
      return false;
    }

    if (!existing || existing.resolved) return false;
    const correctStreak = existing.correctStreak + 1;
    const resolved = correctStreak >= MISTAKE_MASTERY_RETRIES;
    await this.repos.mistakes.updateMistake({
      ...touchSyncMeta(existing, now),
      correctStreak,
      resolved,
    });
    return resolved;
  }

  private async updateTopicProgress(
    question: Question,
    attempt: QuestionAttempt,
    now: number,
  ): Promise<number> {
    const attempts = await this.repos.attempts.getAttempts({
      topicIds: [question.topicId],
      limit: 40,
    });
    const mastery = computeMastery({ attempts, lastPracticedAt: now, now });
    const existing = (await this.repos.progress.getTopicProgress(question.topicId))[0];
    const base =
      existing ??
      ({
        ...newSyncMeta(now),
        id: uuid(),
        topicId: question.topicId,
        attempts: 0,
        correct: 0,
        totalTimeMs: 0,
        mastery: 0,
        bestDifficulty: 1,
        lastPracticedAt: null,
        bossDefeatedAt: null,
      } as const);

    await this.repos.progress.upsertTopicProgress({
      ...touchSyncMeta(base, now),
      attempts: base.attempts + 1,
      correct: base.correct + (attempt.isCorrect ? 1 : 0),
      totalTimeMs: base.totalTimeMs + attempt.timeSpentMs,
      mastery: mastery.mastery,
      bestDifficulty: attempt.isCorrect
        ? Math.max(base.bestDifficulty, attempt.difficulty)
        : base.bestDifficulty,
      lastPracticedAt: now,
    });
    return mastery.mastery;
  }

  private async updateSkillProgress(
    question: Question,
    attempt: QuestionAttempt,
    now: number,
  ): Promise<void> {
    if (question.skillIds.length === 0) return;
    const existing = await this.repos.progress.getSkillProgress(question.skillIds);
    const byId = new Map(existing.map((s) => [s.skillId, s]));

    for (const skillId of question.skillIds) {
      const current =
        byId.get(skillId) ??
        {
          ...newSyncMeta(now),
          id: uuid(),
          skillId,
          topicId: question.topicId,
          attempts: 0,
          correct: 0,
          totalTimeMs: 0,
          mastery: 0,
          recentOutcomes: '',
          lastPracticedAt: null,
        };
      const recentOutcomes = pushOutcome(current.recentOutcomes, attempt.isCorrect);
      const skillAttempts = await this.repos.attempts.getAttempts({ skillIds: [skillId], limit: 30 });
      const mastery = computeMastery({ attempts: skillAttempts, lastPracticedAt: now, now });

      await this.repos.progress.upsertSkillProgress({
        ...touchSyncMeta(current, now),
        attempts: current.attempts + 1,
        correct: current.correct + (attempt.isCorrect ? 1 : 0),
        totalTimeMs: current.totalTimeMs + attempt.timeSpentMs,
        mastery: mastery.mastery,
        recentOutcomes,
        lastPracticedAt: now,
      });
    }
  }

  private async updateReviewSchedule(
    question: Question,
    isCorrect: boolean,
    speed: number,
    hintsUsed: number,
    now: number,
  ): Promise<void> {
    const existing = await this.repos.reviews.getReviewItem('question', question.id);
    const base =
      existing ??
      {
        ...newSyncMeta(now),
        id: uuid(),
        itemType: 'question' as const,
        itemId: question.id,
        topicId: question.topicId,
        stage: 0,
        dueAt: now,
        lastReviewedAt: null,
        repetitions: 0,
        lapses: 0,
        ease: 2.2,
        snapshot: JSON.stringify(question),
      };

    const scheduled = scheduleReview({ item: base, isCorrect, speed, hintsUsed, now });
    await this.repos.reviews.upsertReviewItem({
      ...touchSyncMeta(base, now),
      ...scheduled,
      lastReviewedAt: now,
      snapshot: base.snapshot ?? JSON.stringify(question),
    });
  }

  private async updateBrainProgress(question: Question, isCorrect: boolean, now: number): Promise<void> {
    if (!question.brainCategory) return;
    const all = await this.repos.progress.getBrainProgress();
    const current = all.find((b) => b.category === question.brainCategory);
    if (!current) return;
    const attempts = current.attempts + 1;
    const correct = current.correct + (isCorrect ? 1 : 0);
    await this.repos.progress.upsertBrainProgress({
      ...touchSyncMeta(current, now),
      attempts,
      correct,
      mastery: Number((correct / attempts).toFixed(4)),
      lastPracticedAt: now,
    });
  }

  private async updateThinkingScore(
    attempt: QuestionAttempt,
    question: Question,
    now: number,
  ): Promise<number> {
    const state = await this.repos.progress.getThinkingScore();
    const dimensions = updateDimensions(state.dimensions, [
      { attempt, brainCategory: question.brainCategory ?? null },
    ]);
    const score = compositeScore(dimensions);
    await this.repos.progress.updateThinkingScore({
      ...touchSyncMeta(state, now),
      dimensions,
      score,
      updatedDay: dayKey(now),
    });
    return score;
  }

  private async updateUserProgress(
    attempt: QuestionAttempt,
    award: { xp: number; coins: number },
    streak: { currentStreak: number; longestStreak: number },
    topicMastery: number,
    thinkingScore: number,
    now: number,
  ): Promise<{ level: number; levelledUp: boolean }> {
    const profile = await this.repos.users.getProfile();
    const progress = await this.repos.progress.getProgress(profile.id);
    const xp = progress.xp + award.xp;
    const previousLevel = progress.level;
    const level = levelForXp(xp);

    const allTopics = await this.repos.progress.getTopicProgress();
    const overall = allTopics.length
      ? Number(
          (
            allTopics.reduce((acc, t) => acc + t.mastery * Math.min(t.attempts, 40), 0) /
            Math.max(1, allTopics.reduce((acc, t) => acc + Math.min(t.attempts, 40), 0))
          ).toFixed(4),
        )
      : topicMastery;

    await this.repos.progress.updateProgress({
      ...touchSyncMeta(progress, now),
      xp,
      coins: progress.coins + award.coins,
      level,
      questionsSolved: progress.questionsSolved + 1,
      questionsCorrect: progress.questionsCorrect + (attempt.isCorrect ? 1 : 0),
      totalTimeMs: progress.totalTimeMs + attempt.timeSpentMs,
      currentStreak: streak.currentStreak,
      longestStreak: Math.max(progress.longestStreak, streak.longestStreak),
      lastActiveDay: dayKey(now),
      overallMastery: overall,
      thinkingScore,
      tier: tierForXp(xp),
    });

    return { level, levelledUp: level > previousLevel };
  }

  private async updateDailyActivity(attempt: QuestionAttempt, xp: number, now: number): Promise<void> {
    const day = dayKey(now);
    const existing = await this.repos.progress.getDailyActivityForDay(day);
    const profile = await this.repos.users.getProfile();
    const base =
      existing ??
      {
        ...newSyncMeta(now),
        id: 'day-' + day,
        day,
        questionsAnswered: 0,
        correct: 0,
        minutesStudied: 0,
        xpEarned: 0,
        brainScore: 0,
        goalMet: false,
      };

    const questionsAnswered = base.questionsAnswered + 1;
    const minutesStudied = base.minutesStudied + Math.round(attempt.timeSpentMs / 60000);
    await this.repos.progress.upsertDailyActivity({
      ...touchSyncMeta(base, now),
      questionsAnswered,
      correct: base.correct + (attempt.isCorrect ? 1 : 0),
      minutesStudied,
      xpEarned: base.xpEarned + xp,
      brainScore: attempt.mode === 'daily_brain' ? base.brainScore + (attempt.isCorrect ? 5 : 1) : base.brainScore,
      goalMet:
        questionsAnswered >= profile.dailyGoalQuestions || minutesStudied >= profile.dailyGoalMinutes,
    });
  }

  /** Evaluates the achievement catalogue against the live counters (spec §33). */
  private async checkAchievements(now: number): Promise<string[]> {
    const [catalog, unlocked, profile] = await Promise.all([
      this.repos.achievements.getCatalog(),
      this.repos.achievements.getUnlocked(),
      this.repos.users.getProfile(),
    ]);
    const already = new Set(unlocked.map((u) => u.achievementCode));
    const pending = catalog.filter((a) => !already.has(a.code));
    if (pending.length === 0) return [];

    const [progress, topicProgress, streak, thinking, mistakes, completedLessons, examAttempts, gameScores] =
      await Promise.all([
        this.repos.progress.getProgress(profile.id),
        this.repos.progress.getTopicProgress(),
        this.repos.progress.getStreak(),
        this.repos.progress.getThinkingScore(),
        this.repos.mistakes.getMistakes({ includeResolved: true, limit: 500 }),
        this.repos.lessons.getCompletedLessons(),
        this.repos.exams.getExamAttempts(undefined, { limit: 200 }),
        this.repos.games.getHighScores(),
      ]);

    const metrics: Record<string, number> = {
      questions_solved: progress.questionsSolved,
      questions_correct: progress.questionsCorrect,
      streak_days: streak.currentStreak,
      lessons_completed: completedLessons.length,
      exams_taken: examAttempts.length,
      topics_mastered: topicProgress.filter((t) => t.mastery >= 0.8).length,
      accuracy_percent:
        progress.questionsSolved >= 50
          ? Math.round((progress.questionsCorrect / progress.questionsSolved) * 100)
          : 0,
      daily_brain_days: (await this.repos.progress.getDailyActivity(400)).filter((d) => d.brainScore > 0).length,
      games_played: gameScores.reduce((acc, g) => acc + g.playCount, 0),
      mistakes_resolved: mistakes.filter((m) => m.resolved).length,
      thinking_score: thinking.score,
      bosses_defeated: topicProgress.filter((t) => t.bossDefeatedAt).length,
    };

    const newlyUnlocked: string[] = [];
    for (const achievement of pending) {
      const value = metrics[achievement.metric] ?? 0;
      if (value < achievement.threshold) continue;
      await this.repos.achievements.unlock({
        ...newSyncMeta(now),
        id: uuid(),
        achievementCode: achievement.code,
        unlockedAt: now,
        seen: false,
      });
      newlyUnlocked.push(achievement.code);
      // Achievement rewards are XP and coins, never content.
      const current = await this.repos.progress.getProgress(profile.id);
      await this.repos.progress.updateProgress({
        ...touchSyncMeta(current, now),
        xp: current.xp + achievement.xpReward,
        coins: current.coins + achievement.coinReward,
      });
    }
    return newlyUnlocked;
  }

  /** Starts and ends a study session record. */
  async startSession(mode: PracticeMode, topicId?: ID, now = Date.now()): Promise<StudySession> {
    const session: StudySession = {
      ...newSyncMeta(now),
      id: uuid(),
      mode,
      startedAt: now,
      endedAt: null,
      questionsAnswered: 0,
      correct: 0,
      xpEarned: 0,
      topicId: topicId ?? null,
      meta: null,
    };
    await this.repos.attempts.saveSession(session);
    return session;
  }

  async endSession(
    session: StudySession,
    totals: { answered: number; correct: number; xp: number },
    now = Date.now(),
  ): Promise<void> {
    await this.repos.attempts.saveSession({
      ...touchSyncMeta(session, now),
      endedAt: now,
      questionsAnswered: totals.answered,
      correct: totals.correct,
      xpEarned: totals.xp,
    });
  }
}

function difficultyFromBand(band: string): number {
  const bands = [
    'beginner',
    'basic',
    'intermediate',
    'medium',
    'advanced',
    'expert',
    'master',
    'olympiad',
    'research',
  ];
  const index = bands.indexOf(band);
  return index < 0 ? 3 : index + 1;
}
