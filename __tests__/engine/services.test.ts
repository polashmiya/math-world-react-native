import { createNodeDatabase } from '../support/nodeDatabase';
import { runMigrations } from '../../src/data/database/migrations';
import { seedContent } from '../../src/data/database/seed/seeder';
import { createLocalRepositories } from '../../src/data/repositories/local';
import { createServices, SolverService, type AppServices } from '../../src/domain/services';
import { isoWeekKey } from '../../src/domain/services/ChallengeService';
import type { SqlDatabase } from '../../src/data/database/sqlite/adapter';
import { LOCAL_USER_ID, type Question } from '../../src/domain/models';
import { dayKey, MS_PER_DAY } from '../../src/core/utils/date';
import { levelForXp, levelProgress, updateStreak, xpForAttempt } from '../../src/domain/rules/xp';
import { offlinePercentile, scoreChallenge, scoreExam, scoreGame, summariseSession } from '../../src/domain/rules/scoring';
import { newSyncMeta } from '../../src/domain/models/common';
import { MathError } from '../../src/core/errors';

jest.setTimeout(180000);

async function boot(): Promise<{ db: SqlDatabase; services: AppServices }> {
  const db = createNodeDatabase();
  await runMigrations(db);
  await seedContent(db);
  return { db, services: createServices(createLocalRepositories(db)) };
}

/** Answers a set of questions, optionally getting them all right. */
async function answerAll(
  services: AppServices,
  questions: readonly Question[],
  correct: boolean,
  mode: 'practice' | 'daily_brain' | 'exam' | 'mistake_review' = 'practice',
  startTime = Date.now(),
) {
  const results = [];
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    results.push(
      await services.practice.submitAnswer({
        question,
        givenAnswer: correct ? question.correctAnswer : 'definitely-wrong-42',
        timeSpentMs: 15000,
        hintsUsed: 0,
        mode,
        now: startTime + i * 1000,
      }),
    );
  }
  return results;
}

describe('xp and streak rules', () => {
  it('scales levels with xp', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(300)).toBe(2);
    expect(levelForXp(1200)).toBe(3);
    const progress = levelProgress(500);
    expect(progress.level).toBe(2);
    expect(progress.ratio).toBeGreaterThan(0);
    expect(progress.ratio).toBeLessThan(1);
  });

  it('awards more xp for harder, faster, unaided work', () => {
    const base = { isCorrect: true, mode: 'practice' as const, streakDays: 0 };
    const easy = xpForAttempt({ ...base, difficulty: 1, hintsUsed: 0, speedScore: 0.5 });
    const hard = xpForAttempt({ ...base, difficulty: 9, hintsUsed: 0, speedScore: 0.5 });
    const hinted = xpForAttempt({ ...base, difficulty: 9, hintsUsed: 2, speedScore: 0.5 });
    const fast = xpForAttempt({ ...base, difficulty: 9, hintsUsed: 0, speedScore: 0.95 });
    expect(hard.xp).toBeGreaterThan(easy.xp);
    expect(hinted.xp).toBeLessThan(hard.xp);
    expect(fast.xp).toBeGreaterThan(hard.xp);
  });

  it('still gives a little xp for a wrong answer', () => {
    const award = xpForAttempt({
      isCorrect: false,
      difficulty: 5,
      mode: 'practice',
      hintsUsed: 0,
      speedScore: 0.5,
      streakDays: 3,
    });
    expect(award.xp).toBeGreaterThan(0);
    expect(award.coins).toBe(0);
  });

  it('caps the streak bonus', () => {
    const short = xpForAttempt({ isCorrect: true, difficulty: 5, mode: 'practice', hintsUsed: 0, speedScore: 0.5, streakDays: 5 });
    const long = xpForAttempt({ isCorrect: true, difficulty: 5, mode: 'practice', hintsUsed: 0, speedScore: 0.5, streakDays: 500 });
    expect(long.xp / short.xp).toBeLessThan(1.5);
  });

  it('increments, holds and breaks streaks correctly', () => {
    const base = { ...newSyncMeta(), id: 'local', currentStreak: 4, longestStreak: 9, lastActiveDay: null as string | null, freezesAvailable: 0 };
    const now = new Date('2026-09-07T10:00:00').getTime();

    const first = updateStreak({ ...base }, now);
    expect(first.streak.currentStreak).toBe(1);

    const yesterday = { ...base, lastActiveDay: dayKey(now - MS_PER_DAY) };
    const continued = updateStreak(yesterday, now);
    expect(continued.streak.currentStreak).toBe(5);
    expect(continued.streak.longestStreak).toBe(9);

    const sameDay = { ...base, lastActiveDay: dayKey(now) };
    const held = updateStreak(sameDay, now);
    expect(held.incremented).toBe(false);
    expect(held.streak.currentStreak).toBe(4);

    const gap = { ...base, lastActiveDay: dayKey(now - 5 * MS_PER_DAY) };
    const broken = updateStreak(gap, now);
    expect(broken.streak.currentStreak).toBe(1);
    expect(broken.broken).toBe(true);
  });

  it('spends a freeze to survive a one-day gap', () => {
    const now = new Date('2026-09-07T10:00:00').getTime();
    const state = {
      ...newSyncMeta(),
      id: 'local',
      currentStreak: 10,
      longestStreak: 10,
      lastActiveDay: dayKey(now - 2 * MS_PER_DAY),
      freezesAvailable: 1,
    };
    const result = updateStreak(state, now);
    expect(result.streak.currentStreak).toBe(11);
    expect(result.streak.freezesAvailable).toBe(0);
  });
});

describe('scoring rules', () => {
  const exam = {
    id: 'exam.test',
    code: 'T',
    family: 'custom' as const,
    name: 'Test',
    nameBn: 'পরীক্ষা',
    description: '',
    descriptionBn: '',
    emoji: '📝',
    totalQuestions: 4,
    durationSeconds: 600,
    markPerQuestion: 1,
    negativeMarkPerWrong: 0.5,
    shuffleQuestions: false,
    shuffleOptions: false,
    sections: [],
    years: [],
    contentVersion: 1,
  };

  const question = (id: string, topicId: string): Question => ({
    id,
    topicId,
    skillIds: [],
    difficulty: 4,
    questionType: 'numeric',
    curriculumIds: ['bangladesh'],
    examIds: [],
    tags: [],
    prompt: 'p',
    correctAnswer: '1',
    solutionSteps: [{ order: 1, detail: 'x' }],
    source: 'static',
    questionVersion: 1,
    contentVersion: 1,
  });

  it('applies negative marking and never goes below zero', () => {
    const runtime = [
      { question: question('a', 't1'), sectionId: 's', index: 0, state: 'answered' as const, givenAnswer: '1', timeSpentMs: 1000 },
      { question: question('b', 't1'), sectionId: 's', index: 1, state: 'answered' as const, givenAnswer: '9', timeSpentMs: 2000 },
      { question: question('c', 't2'), sectionId: 's', index: 2, state: 'answered' as const, givenAnswer: '9', timeSpentMs: 3000 },
      { question: question('d', 't2'), sectionId: 's', index: 3, state: 'skipped' as const, timeSpentMs: 500 },
    ];
    const result = scoreExam({
      exam,
      attemptId: 'att',
      questions: runtime,
      topicNames: { t1: 'Topic One', t2: 'Topic Two' },
      isCorrect: (r) => r.givenAnswer === '1',
    });

    expect(result.correct).toBe(1);
    expect(result.wrong).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.rawScore).toBe(1);
    expect(result.negativeMarks).toBe(1);
    expect(result.finalScore).toBe(0);
    expect(result.accuracy).toBeCloseTo(1 / 3, 4);
    expect(result.breakdown).toHaveLength(2);
    expect(result.weakTopics.length).toBeGreaterThan(0);
  });

  it('never reports a negative final score', () => {
    const runtime = [1, 2, 3, 4].map((i) => ({
      question: question('q' + i, 't1'),
      sectionId: 's',
      index: i,
      state: 'answered' as const,
      givenAnswer: '9',
      timeSpentMs: 1000,
    }));
    const result = scoreExam({
      exam,
      attemptId: 'att',
      questions: runtime,
      topicNames: {},
      isCorrect: () => false,
    });
    expect(result.finalScore).toBe(0);
  });

  it('ranks a score against an offline cohort', () => {
    expect(offlinePercentile(50, [], 50)).toBeGreaterThan(80);
    expect(offlinePercentile(5, [], 50)).toBeLessThan(20);
  });

  it('scores games on accuracy and combo, not just count', () => {
    const sloppy = scoreGame({ correct: 10, wrong: 10, maxCombo: 2, difficultyReached: 3, durationMs: 60000, kind: 'speed_math' });
    const clean = scoreGame({ correct: 10, wrong: 0, maxCombo: 10, difficultyReached: 3, durationMs: 60000, kind: 'speed_math' });
    expect(clean).toBeGreaterThan(sloppy);
  });

  it('passes a boss at 70%', () => {
    expect(scoreChallenge(7, 10).passed).toBe(true);
    expect(scoreChallenge(6, 10).passed).toBe(false);
  });

  it('summarises a session including the best run', () => {
    const summary = summariseSession([
      { isCorrect: true, timeSpentMs: 1000, xp: 10 },
      { isCorrect: true, timeSpentMs: 2000, xp: 10 },
      { isCorrect: false, timeSpentMs: 3000, xp: 2 },
      { isCorrect: true, timeSpentMs: 1000, xp: 10 },
    ]);
    expect(summary.answered).toBe(4);
    expect(summary.correct).toBe(3);
    expect(summary.bestStreak).toBe(2);
    expect(summary.xpEarned).toBe(32);
  });
});

describe('practice service', () => {
  it('builds a practice set and persists the generated questions', async () => {
    const { db, services } = await boot();
    const set = await services.practice.getPracticeQuestions({
      mode: 'practice',
      count: 8,
      topicIds: ['percentage'],
      seed: 'set-1',
    });
    expect(set.questions).toHaveLength(8);
    expect(set.questions.every((q) => q.topicId === 'percentage')).toBe(true);
    expect(set.origins).toHaveLength(8);

    // Every generated question is retrievable afterwards.
    for (const question of set.questions) {
      expect(await services.repositories.questions.getQuestionById(question.id)).not.toBeNull();
    }
    await db.close();
  });

  it('records an attempt and every derived record', async () => {
    const { db, services } = await boot();
    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 1, topicIds: ['percentage'], seed: 1 });
    const question = set.questions[0];
    const result = await services.practice.submitAnswer({
      question,
      givenAnswer: question.correctAnswer,
      timeSpentMs: 12000,
      hintsUsed: 0,
      mode: 'practice',
    });

    expect(result.isCorrect).toBe(true);
    expect(result.xpEarned).toBeGreaterThan(0);
    expect(result.streakDays).toBe(1);

    const attempts = await services.repositories.attempts.getAttempts({});
    expect(attempts).toHaveLength(1);

    const progress = await services.repositories.progress.getProgress(LOCAL_USER_ID);
    expect(progress.questionsSolved).toBe(1);
    expect(progress.questionsCorrect).toBe(1);
    expect(progress.xp).toBeGreaterThan(0);

    const topicProgress = await services.repositories.progress.getTopicProgress('percentage');
    expect(topicProgress[0].attempts).toBe(1);
    expect(topicProgress[0].mastery).toBeGreaterThan(0);

    const review = await services.repositories.reviews.getReviewItem('question', question.id);
    expect(review).not.toBeNull();
    expect(review!.repetitions).toBe(1);

    const activity = await services.repositories.progress.getDailyActivityForDay(dayKey());
    expect(activity!.questionsAnswered).toBe(1);

    const thinking = await services.repositories.progress.getThinkingScore();
    expect(thinking.score).toBeGreaterThan(0);
    await db.close();
  });

  it('adds a wrong answer to the mistake bank and clears it after two retries', async () => {
    const { db, services } = await boot();
    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 1, topicIds: ['fractions'], seed: 2 });
    const question = set.questions[0];

    await services.practice.submitAnswer({
      question,
      givenAnswer: 'wrong-answer-xyz',
      timeSpentMs: 20000,
      hintsUsed: 0,
      mode: 'practice',
    });
    let mistakes = await services.repositories.mistakes.getMistakes();
    expect(mistakes).toHaveLength(1);
    expect(mistakes[0].mistakeCount).toBe(1);

    // Missing it again increments rather than duplicating.
    await services.practice.submitAnswer({
      question,
      givenAnswer: 'wrong-again',
      timeSpentMs: 20000,
      hintsUsed: 0,
      mode: 'practice',
    });
    mistakes = await services.repositories.mistakes.getMistakes();
    expect(mistakes).toHaveLength(1);
    expect(mistakes[0].mistakeCount).toBe(2);

    const first = await services.practice.submitAnswer({
      question,
      givenAnswer: question.correctAnswer,
      timeSpentMs: 9000,
      hintsUsed: 0,
      mode: 'mistake_review',
    });
    expect(first.mistakeResolved).toBe(false);

    const second = await services.practice.submitAnswer({
      question,
      givenAnswer: question.correctAnswer,
      timeSpentMs: 9000,
      hintsUsed: 0,
      mode: 'mistake_review',
    });
    expect(second.mistakeResolved).toBe(true);
    expect(await services.repositories.mistakes.getMistakes()).toHaveLength(0);
    await db.close();
  });

  it('brings a missed question back sooner than a mastered one', async () => {
    const { db, services } = await boot();
    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 2, topicIds: ['arithmetic'], seed: 3 });
    const [good, bad] = set.questions;

    await services.practice.submitAnswer({ question: good, givenAnswer: good.correctAnswer, timeSpentMs: 5000, hintsUsed: 0, mode: 'practice' });
    await services.practice.submitAnswer({ question: bad, givenAnswer: 'nope', timeSpentMs: 40000, hintsUsed: 0, mode: 'practice' });

    const goodReview = await services.repositories.reviews.getReviewItem('question', good.id);
    const badReview = await services.repositories.reviews.getReviewItem('question', bad.id);
    expect(badReview!.dueAt).toBeLessThan(goodReview!.dueAt);
    expect(badReview!.lapses).toBe(1);
    await db.close();
  });

  it('scores a Think First estimate', async () => {
    const { db, services } = await boot();
    const questions = await services.repositories.questions.getQuestions({ topicIds: ['percentage'], questionTypes: ['numeric'], limit: 5 });
    const numeric = questions.find((q) => Number.isFinite(Number(q.correctAnswer)));
    if (!numeric) {
      await db.close();
      return;
    }
    const exact = Number(numeric.correctAnswer);
    const result = await services.practice.submitAnswer({
      question: numeric,
      givenAnswer: numeric.correctAnswer,
      timeSpentMs: 12000,
      hintsUsed: 0,
      mode: 'practice',
      estimateValue: exact,
      strategy: 'mental_math',
    });
    expect(result.estimateAccuracy).toBe(1);

    const attempts = await services.repositories.attempts.getAttempts({ limit: 1 });
    expect(attempts[0].strategy).toBe('mental_math');
    expect(attempts[0].estimateAccuracy).toBe(1);
    await db.close();
  });

  it('unlocks achievements as the counters pass their thresholds', async () => {
    const { db, services } = await boot();
    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 12, seed: 'ach' });
    const results = await answerAll(services, set.questions, true);
    const unlocked = results.flatMap((r) => r.unlockedAchievementCodes);
    expect(unlocked).toContain('first_steps');
    expect(unlocked).toContain('ten_down');

    const stored = await services.repositories.achievements.getUnlocked();
    expect(stored.length).toBeGreaterThanOrEqual(2);
    // Unlocking is once-only.
    const again = await answerAll(services, set.questions.slice(0, 2), true);
    expect(again.flatMap((r) => r.unlockedAchievementCodes)).not.toContain('first_steps');
    await db.close();
  });

  it('raises difficulty as the learner succeeds', async () => {
    const { db, services } = await boot();
    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 8, topicIds: ['arithmetic'], seed: 'ramp' });
    const results = [];
    for (const question of set.questions) {
      results.push(
        await services.practice.submitAnswer({
          question,
          givenAnswer: question.correctAnswer,
          timeSpentMs: 4000,
          hintsUsed: 0,
          mode: 'practice',
        }),
      );
    }
    expect(results[results.length - 1].nextDifficulty).toBeGreaterThanOrEqual(set.questions[0].difficulty);
    await db.close();
  });

  it('honours a manual difficulty choice', async () => {
    const { db, services } = await boot();
    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 5, difficulty: 8, seed: 'manual' });
    expect(set.reason).toBe('manual');
    expect(set.questions.every((q) => q.difficulty === 8)).toBe(true);
    await db.close();
  });

  it('records a study session', async () => {
    const { db, services } = await boot();
    const session = await services.practice.startSession('practice', 'percentage');
    await services.practice.endSession(session, { answered: 10, correct: 8, xp: 120 });
    const sessions = await services.repositories.attempts.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].questionsAnswered).toBe(10);
    expect(sessions[0].endedAt).not.toBeNull();
    await db.close();
  });
});

describe('learning service', () => {
  it('builds the skill tree with mastery and gating', async () => {
    const { db, services } = await boot();
    const tree = await services.learning.getSkillTree();
    expect(tree.length).toBeGreaterThan(5);
    const numbers = tree.find((n) => n.topic.id === 'numbers');
    expect(numbers).toBeDefined();
    expect(numbers!.children.length).toBeGreaterThan(3);

    const flat = await services.learning.getFlatSkillTree();
    expect(flat.length).toBeGreaterThan(50);
    expect(flat.some((n) => n.depth > 0)).toBe(true);

    // Percentage requires fractions, which has no mastery yet.
    const percentage = flat.find((n) => n.topic.id === 'percentage')!;
    expect(percentage.unlocked).toBe(false);
    expect(percentage.label.key).toBe('new');
    await db.close();
  });

  it('unlocks a gated topic once every prerequisite has mastery', async () => {
    const { db, services } = await boot();
    const flatBefore = await services.learning.getFlatSkillTree();
    const percentageTopic = flatBefore.find((n) => n.topic.id === 'percentage')!;
    // Percentage is gated behind BOTH fractions and decimals.
    expect(percentageTopic.topic.prerequisiteTopicIds.sort()).toEqual(['decimals', 'fractions']);

    const fractions = await services.practice.getPracticeQuestions({ mode: 'practice', count: 20, topicIds: ['fractions'], seed: 'unlock-f' });
    await answerAll(services, fractions.questions, true);
    // One prerequisite is not enough.
    expect((await services.learning.getFlatSkillTree()).find((n) => n.topic.id === 'percentage')!.unlocked).toBe(false);

    const decimals = await services.practice.getPracticeQuestions({ mode: 'practice', count: 20, topicIds: ['decimals'], seed: 'unlock-d' });
    await answerAll(services, decimals.questions, true);
    expect((await services.learning.getFlatSkillTree()).find((n) => n.topic.id === 'percentage')!.unlocked).toBe(true);
    await db.close();
  });

  it('returns topic detail with lessons and practice ids', async () => {
    const { db, services } = await boot();
    const detail = await services.learning.getTopicDetail('percentage');
    expect(detail.topic!.name).toBe('Percentage');
    expect(detail.skills.length).toBeGreaterThan(0);
    expect(detail.lessons.length).toBeGreaterThan(0);
    expect(detail.lessons[0].completed).toBe(false);
    expect(detail.practiceTopicIds).toContain('percentage');
    await db.close();
  });

  it('completes a lesson and counts it', async () => {
    const { db, services } = await boot();
    const detail = await services.learning.getTopicDetail('percentage');
    const lesson = detail.lessons[0].lesson;
    await services.learning.completeLesson(lesson, 0.9);

    const after = await services.learning.getLesson(lesson.id);
    expect(after!.completed).toBe(true);
    expect(after!.masteryScore).toBeCloseTo(0.9, 4);

    const progress = await services.repositories.progress.getProgress(LOCAL_USER_ID);
    expect(progress.lessonsCompleted).toBe(1);
    await db.close();
  });

  it('suggests something to continue', async () => {
    const { db, services } = await boot();
    const target = await services.learning.getContinueTarget();
    expect(target).not.toBeNull();
    expect(target!.topic.id.length).toBeGreaterThan(0);
    await db.close();
  });
});

describe('daily brain service', () => {
  it("builds today's set with several categories", async () => {
    const { db, services } = await boot();
    const set = await services.dailyBrain.getTodaySet();
    expect(set.day).toBe(dayKey());
    expect(set.blocks.length).toBeGreaterThanOrEqual(4);
    expect(set.totalQuestions).toBeGreaterThan(10);
    expect(set.blocks.every((b) => b.questions.length > 0)).toBe(true);
    expect(set.blocks.every((b) => b.questions.every((q) => q.brainCategory === b.category))).toBe(true);
    await db.close();
  });

  it('is stable within the same day', async () => {
    const { db, services } = await boot();
    const now = new Date('2026-09-07T09:00:00').getTime();
    const first = await services.dailyBrain.getTodaySet(now);
    const second = await services.dailyBrain.getTodaySet(now + 3600000);
    expect(first.blocks.map((b) => b.category)).toEqual(second.blocks.map((b) => b.category));
    expect(first.blocks[0].questions.map((q) => q.id)).toEqual(second.blocks[0].questions.map((q) => q.id));
    await db.close();
  });

  it('changes from one day to the next', async () => {
    const { db, services } = await boot();
    const today = await services.dailyBrain.getTodaySet(new Date('2026-09-07T09:00:00').getTime());
    const tomorrow = await services.dailyBrain.getTodaySet(new Date('2026-09-08T09:00:00').getTime());
    expect(today.blocks[0].questions.map((q) => q.id)).not.toEqual(tomorrow.blocks[0].questions.map((q) => q.id));
    await db.close();
  });

  it('records brain progress and score when answered', async () => {
    const { db, services } = await boot();
    const set = await services.dailyBrain.getTodaySet();
    const block = set.blocks[0];
    await services.dailyBrain.prepareBlock(block);
    await answerAll(services, block.questions, true, 'daily_brain');

    const progress = await services.dailyBrain.getCategoryProgress();
    const entry = progress.find((p) => p.category === block.category)!;
    expect(entry.attempts).toBe(block.questions.length);
    expect(entry.mastery).toBeGreaterThan(0);

    const activity = await services.repositories.progress.getDailyActivityForDay(dayKey());
    expect(activity!.brainScore).toBeGreaterThan(0);
    await db.close();
  });
});

describe('exam service', () => {
  it('lists exams with readiness', async () => {
    const { db, services } = await boot();
    const list = await services.exams.listExams();
    expect(list.length).toBeGreaterThan(8);
    expect(list.every((e) => e.readiness >= 0 && e.readiness <= 1)).toBe(true);
    await db.close();
  });

  it('builds a full BCS paper from the blueprint', async () => {
    const { db, services } = await boot();
    const snapshot = await services.exams.startExam('exam.bcs-math', { seed: 'paper' });
    expect(snapshot).not.toBeNull();
    expect(snapshot!.questions).toHaveLength(50);
    expect(snapshot!.durationSeconds).toBe(1800);
    // Indexes are contiguous and ids unique.
    expect(snapshot!.questions.map((q) => q.index)).toEqual(Array.from({ length: 50 }, (_, i) => i));
    expect(new Set(snapshot!.questions.map((q) => q.question.id)).size).toBe(50);
    // Every question is retrievable, so an attempt can reference it.
    for (const runtime of snapshot!.questions.slice(0, 5)) {
      expect(await services.repositories.questions.getQuestionById(runtime.question.id)).not.toBeNull();
    }
    await db.close();
  });

  it('scores a submitted paper with negative marking and analysis', async () => {
    const { db, services } = await boot();
    const snapshot = await services.exams.startExam('exam.ntrca-math', { seed: 'ntrca' });
    const answered = {
      ...snapshot!,
      questions: snapshot!.questions.map((runtime, index) => ({
        ...runtime,
        state: 'answered' as const,
        givenAnswer: index % 3 === 0 ? 'wrong-xyz' : runtime.question.correctAnswer,
        timeSpentMs: 20000,
      })),
    };

    const result = await services.exams.submitExam(answered);
    expect(result).not.toBeNull();
    expect(result!.totalQuestions).toBe(30);
    expect(result!.correct).toBeGreaterThan(15);
    expect(result!.wrong).toBeGreaterThan(0);
    expect(result!.negativeMarks).toBeGreaterThan(0);
    expect(result!.finalScore).toBeLessThan(result!.rawScore);
    expect(result!.percentile).toBeGreaterThanOrEqual(0);
    expect(result!.breakdown.length).toBeGreaterThan(0);

    const stored = await services.exams.getAttemptResult(result!.attemptId);
    expect(stored!.correct).toBe(result!.correct);

    const progress = await services.repositories.progress.getProgress(LOCAL_USER_ID);
    expect(progress.examsTaken).toBe(1);

    const analysis = await services.exams.getExamAnalysis('exam.ntrca-math');
    expect(analysis.attempts).toBe(1);
    expect(analysis.weakTopics.length + analysis.strongTopics.length).toBeGreaterThan(0);
    await db.close();
  });

  it('counts unanswered questions as skipped, not wrong', async () => {
    const { db, services } = await boot();
    const snapshot = await services.exams.startExam('exam.quick-10', { seed: 'quick' });
    const result = await services.exams.submitExam(snapshot!);
    expect(result!.skipped).toBe(result!.totalQuestions);
    expect(result!.wrong).toBe(0);
    expect(result!.finalScore).toBe(0);
    await db.close();
  });
});

describe('game service and math lab', () => {
  it('runs a game round, moving difficulty and lives', async () => {
    const { db, services } = await boot();
    const started = await services.games.startRun('number_ninja');
    expect(started).not.toBeNull();
    const { game } = started!;
    let state = started!.state;
    expect(state.livesLeft).toBe(3);

    const round = await services.games.nextRound(game, state, 0);
    expect(round).not.toBeNull();

    const correct = services.games.answerRound(game, state, round!.question, round!.question.correctAnswer);
    expect(correct.isCorrect).toBe(true);
    expect(correct.state.difficulty).toBeGreaterThanOrEqual(state.difficulty);
    expect(correct.state.combo).toBe(1);

    const wrong = services.games.answerRound(game, correct.state, round!.question, 'nope-xyz');
    expect(wrong.isCorrect).toBe(false);
    expect(wrong.state.livesLeft).toBe(2);
    expect(wrong.state.combo).toBe(0);

    state = wrong.state;
    const record = await services.games.finishRun(state);
    expect(record.score).toBeGreaterThanOrEqual(0);
    const high = await services.repositories.games.getHighScores();
    expect(high[0].bestScore).toBe(record.score);
    await db.close();
  });

  it('ends a run when lives run out', async () => {
    const { db, services } = await boot();
    const started = await services.games.startRun('logic_escape');
    const { game } = started!;
    const round = await services.games.nextRound(game, started!.state, 0);
    const result = services.games.answerRound(game, started!.state, round!.question, 'wrong-xyz');
    expect(result.state.finished).toBe(true);
    await db.close();
  });

  it('runs the probability lab reproducibly and converges', async () => {
    const { db, services } = await boot();
    const a = services.games.runProbabilityLab('die', 6000, 'lab-seed');
    const b = services.games.runProbabilityLab('die', 6000, 'lab-seed');
    expect(a.outcomes.map((o) => o.count)).toEqual(b.outcomes.map((o) => o.count));
    expect(a.maxDeviation).toBeLessThan(0.05);
    expect(a.explanation.length).toBeGreaterThan(10);

    const space = services.games.probabilitySpace('two_dice_sum');
    expect(space.labels).toHaveLength(11);
    await db.close();
  });

  it('samples the function lab and finds the vertex', async () => {
    const { db, services } = await boot();
    const lab = services.games.functionLab(1, -4, 3);
    expect(lab.expression).toContain('x^2');
    expect(lab.points.length).toBeGreaterThan(100);
    expect(lab.vertex!.x).toBeCloseTo(2, 6);
    expect(lab.vertex!.y).toBeCloseTo(-1, 6);
    expect(lab.realRootCount).toBe(2);
    await db.close();
  });
});

describe('challenge service', () => {
  it('locks a boss until the topic has mastery', async () => {
    const { db, services } = await boot();
    const bosses = await services.challenges.listBosses();
    expect(bosses.length).toBeGreaterThan(10);
    const percentageBoss = bosses.find((b) => b.challenge.topicId === 'percentage')!;
    expect(percentageBoss.unlocked).toBe(false);
    expect(percentageBoss.defeated).toBe(false);
    await db.close();
  });

  it('runs a boss battle with a difficulty ramp and records the win', async () => {
    const { db, services } = await boot();
    const started = await services.challenges.startChallenge('challenge.boss.arithmetic', 'boss-seed');
    expect(started).not.toBeNull();
    expect(started!.questions).toHaveLength(10);
    expect(started!.questions[9].difficulty).toBeGreaterThan(started!.questions[0].difficulty);

    const outcome = await services.challenges.finishChallenge(started!.challenge, 9, 10, Date.now() - 60000);
    expect(outcome.passed).toBe(true);
    expect(outcome.xpEarned).toBe(started!.challenge.xpReward);

    const attempts = await services.repositories.challenges.getChallengeAttempts('challenge.boss.arithmetic');
    expect(attempts[0].passed).toBe(true);
    await db.close();
  });

  it('does not award xp for a failed boss', async () => {
    const { db, services } = await boot();
    const started = await services.challenges.startChallenge('challenge.boss.fractions', 'fail-seed');
    const outcome = await services.challenges.finishChallenge(started!.challenge, 3, 10, Date.now() - 60000);
    expect(outcome.passed).toBe(false);
    expect(outcome.xpEarned).toBe(0);
    await db.close();
  });

  it('creates and advances daily, weekly and monthly missions', async () => {
    const { db, services } = await boot();
    const now = new Date('2026-09-07T09:00:00').getTime();
    const missions = await services.challenges.getMissions(now);
    expect(missions.length).toBeGreaterThan(3);
    expect(missions.some((m) => m.mission.periodKey === dayKey(now))).toBe(true);
    expect(missions.some((m) => m.mission.periodKey === isoWeekKey(now))).toBe(true);

    // Calling again is idempotent.
    const again = await services.challenges.getMissions(now);
    expect(again).toHaveLength(missions.length);

    const daily = missions.find((m) => m.mission.code === 'challenge.daily-10')!;
    const completed = await services.challenges.advanceMissions({ [daily.mission.code]: daily.mission.target }, now);
    expect(completed.map((m) => m.code)).toContain(daily.mission.code);

    const xp = await services.challenges.claimMission(completed[0], now);
    expect(xp).toBeGreaterThan(0);
    // Claiming twice pays nothing.
    const refreshed = (await services.challenges.getMissions(now)).find((m) => m.mission.code === daily.mission.code)!;
    expect(await services.challenges.claimMission(refreshed.mission, now)).toBe(0);
    await db.close();
  });

  it('reports an offline tournament standing', async () => {
    const { db, services } = await boot();
    const standing = await services.challenges.getTournamentStanding();
    expect(standing.tier).toBe('bronze');
    expect(standing.rivals.length).toBeGreaterThan(2);
    expect(standing.nextTier!.tier).toBe('silver');
    expect(standing.nextTier!.xpNeeded).toBeGreaterThan(0);
    await db.close();
  });

  it('computes stable ISO week keys', () => {
    expect(isoWeekKey(new Date('2026-01-05T00:00:00Z').getTime())).toBe('2026-W02');
    expect(isoWeekKey(new Date('2026-09-07T00:00:00Z').getTime())).toMatch(/^2026-W\d\d$/);
  });
});

describe('progress service', () => {
  it('reports an empty dashboard for a new user', async () => {
    const { db, services } = await boot();
    const dashboard = await services.progress.getDashboard();
    expect(dashboard.questionsSolved).toBe(0);
    expect(dashboard.overallMastery).toBe(0);
    expect(dashboard.currentStreak).toBe(0);
    expect(dashboard.last7Days).toHaveLength(7);
    await db.close();
  });

  it('fills the dashboard after practice', async () => {
    const { db, services } = await boot();
    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 14, topicIds: ['percentage'], seed: 'dash' });
    await answerAll(services, set.questions.slice(0, 10), true);
    await answerAll(services, set.questions.slice(10), false);

    const dashboard = await services.progress.getDashboard();
    expect(dashboard.questionsSolved).toBe(14);
    expect(dashboard.accuracy).toBeCloseTo(10 / 14, 2);
    expect(dashboard.currentStreak).toBe(1);
    expect(dashboard.averageSpeedMs).toBeGreaterThan(0);
    expect(dashboard.thinkingScore).toBeGreaterThan(0);
    expect(dashboard.last7Days[6].questionsAnswered).toBe(14);
    await db.close();
  });

  it('groups the mistake bank by topic and restores the questions', async () => {
    const { db, services } = await boot();
    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 6, topicIds: ['fractions'], seed: 'mistakes' });
    await answerAll(services, set.questions, false);

    const groups = await services.progress.getMistakeGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].topicId).toBe('fractions');
    expect(groups[0].count).toBe(6);
    expect(groups[0].topicNameBn).toBe('ভগ্নাংশ');

    const restored = await services.progress.getMistakeQuestions('fractions');
    expect(restored).toHaveLength(6);
    expect(restored[0].question.prompt.length).toBeGreaterThan(0);

    await services.progress.removeMistake(restored[0].mistake);
    expect(await services.progress.getMistakeQuestions('fractions')).toHaveLength(5);
    await db.close();
  });

  it('builds the revision queue from due items', async () => {
    const { db, services } = await boot();
    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 3, seed: 'revision' });
    await answerAll(services, set.questions, false);

    // Wrong answers are scheduled within minutes, so they are due shortly.
    const queue = await services.progress.getRevisionQueue(Date.now() + 2 * MS_PER_DAY);
    expect(queue.dueNow).toBeGreaterThan(0);
    expect(queue.questions.length).toBeGreaterThan(0);
    expect(queue.items.length).toBe(queue.questions.length);
    await db.close();
  });

  it('creates default goals and refreshes their progress', async () => {
    const { db, services } = await boot();
    const goals = await services.progress.getGoals();
    expect(goals.map((g) => g.kind).sort()).toEqual(['daily_minutes', 'daily_questions']);

    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 5, seed: 'goals' });
    await answerAll(services, set.questions, true);

    const refreshed = await services.progress.refreshGoalProgress();
    expect(refreshed.find((g) => g.kind === 'daily_questions')!.progress).toBe(5);

    const custom = await services.progress.setGoal('topic_mastery', 80, { topicId: 'percentage' });
    expect(custom.target).toBe(80);
    expect((await services.progress.getGoals()).length).toBe(3);
    await db.close();
  });

  it('builds a study plan that fits the available minutes', async () => {
    const { db, services } = await boot();
    const plan = await services.progress.getStudyPlan(30);
    expect(plan.length).toBeGreaterThanOrEqual(3);
    const total = plan.reduce((acc, b) => acc + b.minutes, 0);
    expect(total).toBeLessThanOrEqual(40);
    expect(plan.map((b) => b.kind)).toContain('practice');
    expect(plan.every((b) => b.label.bn.length > 0)).toBe(true);
    await db.close();
  });

  it('reports the thinking profile with a band', async () => {
    const { db, services } = await boot();
    const profile = await services.progress.getThinkingProfile();
    expect(profile.dimensions).toHaveLength(8);
    expect(profile.band.key).toBe('developing');
    expect(profile.weakest).toHaveLength(3);
    await db.close();
  });
});

describe('solver service', () => {
  // The solver is stateless, so it needs no database of its own.
  const solver = new SolverService();

  it('evaluates arithmetic with steps', () => {
    const result = solver.solve('calculator', '12 + 6 × 3 - 8 ÷ 4');
    expect(result.answer).toBe('28');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('adds fractions exactly', () => {
    const result = solver.solve('fraction', '2/3 + 3/4');
    expect(result.answer).toBe('17/12');
    expect(result.steps.some((s) => s.includes('Common denominator'))).toBe(true);
  });

  it('simplifies a single fraction', () => {
    expect(solver.solve('fraction', '18/24').answer).toBe('3/4');
  });

  it('solves equations and systems', () => {
    expect(solver.solve('equation', '3x + 5 = 20').answer).toBe('x = 5');
    expect(solver.solve('equation', 'x^2 - 5x + 6 = 0').answer).toContain('x = 2');
    const system = solver.solve('system', '2x + 3y = 12; x - y = 1');
    expect(system.answer).toContain('x = 3');
    expect(system.answer).toContain('y = 2');
  });

  it('computes geometry with the working shown', () => {
    const circle = solver.solve('geometry', 'circle area 7');
    expect(Number(circle.answer.split(' ')[0])).toBeCloseTo(153.938, 2);
    expect(solver.solve('geometry', 'triangle 10 6').answer).toContain('30');
    expect(solver.solve('geometry', 'heron 13 14 15').answer).toContain('84');
  });

  it('handles trigonometry with exact values', () => {
    const sin30 = solver.solve('trigonometry', 'sin 30');
    expect(sin30.answer).toContain('1/2');
    expect(solver.solve('trigonometry', 'asin 0.5').answer).toContain('30');
  });

  it('summarises statistics', () => {
    const result = solver.solve('statistics', '2, 4, 4, 4, 5, 5, 7, 9');
    expect(result.answer).toContain('mean 5');
    expect(result.answer).toContain('median 4.5');
  });

  it('computes probability and counting', () => {
    expect(solver.solve('probability', '3 of 6').answer).toContain('1/2');
    expect(solver.solve('probability', 'C(8,3)').answer).toBe('56');
    expect(solver.solve('probability', 'binomial 5 2 0.5').answer).toContain('0.3125');
  });

  it('works with matrices', () => {
    expect(solver.solve('matrix', '1 2; 3 4').answer).toContain('-2');
    expect(solver.solve('matrix', '1 2; 3 4 | inverse').steps.length).toBeGreaterThan(0);
    expect(solver.solve('matrix', '1 2; 3 4 | 1 0; 0 1').answer).toContain('1');
  });

  it('differentiates, integrates and takes limits', () => {
    expect(solver.solve('calculus', 'd/dx x^3 + 2x').answer).toContain('3 * x ^ 2');
    expect(Number(solver.solve('calculus', 'integrate x^2 from 0 to 3').answer)).toBeCloseTo(9, 4);
    expect(Number(solver.solve('calculus', 'limit 1 (x^2 - 1)/(x - 1)').answer)).toBeCloseTo(2, 3);
  });

  it('factorises numbers and finds HCF/LCM', () => {
    expect(solver.solve('number_theory', '360').answer).toBe('2^3 × 3^2 × 5');
    expect(solver.solve('number_theory', '12 and 18').answer).toBe('HCF 6, LCM 36');
  });

  it('handles money maths', () => {
    expect(solver.solve('financial', '15% of 2400').answer).toBe('360');
    expect(solver.solve('financial', 'simple interest 10000 5 2').answer).toBe('1000');
    expect(solver.solve('financial', 'discount 1200 25').answer).toBe('900');
  });

  it('reports a clear error instead of guessing', () => {
    expect(() => solver.solve('calculator', 'not maths at all $$')).toThrow(MathError);
    expect(() => solver.solve('equation', 'sin(x) = 0.5')).toThrow(MathError);
    expect(() => solver.solve('calculator', '')).toThrow(MathError);
  });
});

describe('search and bookmarks', () => {
  it('searches across every content kind', async () => {
    const { db, services } = await boot();
    const results = await services.search.search('percentage', 'en');
    expect(results.total).toBeGreaterThan(0);
    expect(results.byKind.topic.length).toBeGreaterThan(0);
    expect(results.byKind.formula.length).toBeGreaterThan(0);
    expect(results.top[0].score).toBeGreaterThanOrEqual(results.top[results.top.length - 1].score);
    await db.close();
  });

  it('searches in Bangla', async () => {
    const { db, services } = await boot();
    const results = await services.search.search('ভগ্নাংশ', 'bn');
    expect(results.total).toBeGreaterThan(0);
    await db.close();
  });

  it('ignores a too-short query', async () => {
    const { db, services } = await boot();
    expect((await services.search.search('a')).total).toBe(0);
    await db.close();
  });

  it('finds generators by name', async () => {
    const { db, services } = await boot();
    const found = services.search.searchGenerators('percent');
    expect(found.length).toBeGreaterThan(0);
    await db.close();
  });

  it('toggles bookmarks', async () => {
    const { db, services } = await boot();
    expect(await services.search.toggleBookmark('formula', 'formula.pythagoras', 'Pythagoras')).toBe(true);
    expect(await services.search.isBookmarked('formula', 'formula.pythagoras')).toBe(true);
    expect(await services.search.toggleBookmark('formula', 'formula.pythagoras', 'Pythagoras')).toBe(false);
    expect(await services.search.getBookmarks()).toHaveLength(0);
    await db.close();
  });

  it('groups the formula library by category', async () => {
    const { db, services } = await boot();
    const library = await services.search.getFormulaLibrary('bn');
    expect(library.length).toBeGreaterThan(5);
    expect(library.every((group) => group.formulas.length > 0)).toBe(true);
    expect(library[0].label.length).toBeGreaterThan(0);
    await db.close();
  });
});

describe('profile service', () => {
  it('reports onboarding until a name is set', async () => {
    const { db, services } = await boot();
    expect(await services.profile.needsOnboarding()).toBe(true);
    await services.profile.updateProfile({ name: 'Nusrat', learningGoal: 'competitive' });
    expect(await services.profile.needsOnboarding()).toBe(false);
    await db.close();
  });

  it('keeps language in sync between profile and settings', async () => {
    const { db, services } = await boot();
    await services.profile.setLanguage('en');
    expect((await services.repositories.users.getProfile()).language).toBe('en');
    expect((await services.repositories.users.getSettings()).language).toBe('en');

    await services.profile.updateProfile({ language: 'bn' });
    expect((await services.repositories.users.getSettings()).language).toBe('bn');
    await db.close();
  });

  it('keeps the retired large-text flag in step with the text size', async () => {
    const { db, services } = await boot();

    await services.profile.setFontScale('xLarge');
    let settings = await services.repositories.users.getSettings();
    expect(settings.fontScale).toBe('xLarge');
    expect(settings.largeText).toBe(true);

    await services.profile.setFontScale('xSmall');
    settings = await services.repositories.users.getSettings();
    expect(settings.fontScale).toBe('xSmall');
    expect(settings.largeText).toBe(false);
    await db.close();
  });

  it('clamps the sound volume instead of storing what it was handed', async () => {
    const { db, services } = await boot();
    expect((await services.repositories.users.getSettings()).soundVolume).toBe(80);

    await services.profile.setSoundVolume(140);
    expect((await services.repositories.users.getSettings()).soundVolume).toBe(100);

    await services.profile.setSoundVolume(-20);
    expect((await services.repositories.users.getSettings()).soundVolume).toBe(0);

    await services.profile.setSoundEnabled(false);
    expect((await services.repositories.users.getSettings()).soundEnabled).toBe(false);
    await db.close();
  });

  it('returns an overview with achievement progress', async () => {
    const { db, services } = await boot();
    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 3, seed: 'profile' });
    await answerAll(services, set.questions, true);

    const overview = await services.profile.getOverview();
    expect(overview.achievements.length).toBeGreaterThan(20);
    const firstSteps = overview.achievements.find((a) => a.achievement.code === 'first_steps')!;
    expect(firstSteps.unlocked).toBeDefined();
    expect(firstSteps.ratio).toBe(1);

    const century = overview.achievements.find((a) => a.achievement.code === 'century')!;
    expect(century.unlocked).toBeUndefined();
    expect(century.progress).toBe(3);
    expect(overview.contentStats.questions).toBeGreaterThan(0);
    expect(overview.unseenAchievementCodes.length).toBeGreaterThan(0);

    await services.profile.markAchievementsSeen(overview.unseenAchievementCodes);
    expect((await services.profile.getOverview()).unseenAchievementCodes).toHaveLength(0);
    await db.close();
  });

  it('toggles a non-core content pack', async () => {
    const { db, services } = await boot();
    const packs = await services.profile.setPackEnabled('pack.olympiad', false);
    expect(packs.find((p) => p.id === 'pack.olympiad')!.enabled).toBe(false);
    await db.close();
  });

  it('changes the difficulty preference and honours it in practice', async () => {
    const { db, services } = await boot();
    await services.profile.setDifficultyPreference('expert');
    const set = await services.practice.getPracticeQuestions({ mode: 'practice', count: 4, seed: 'pref' });
    expect(set.questions.every((q) => q.difficulty >= 5)).toBe(true);
    await db.close();
  });
});
