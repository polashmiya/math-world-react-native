import { examReadiness, masteryLabel, overallMastery } from '../../core/adaptive-learning/masteryEngine';
import { thinkingBand, weakestDimensions } from '../../core/adaptive-learning/thinkingScore';
import { strongTopicIds, weakTopicIds } from '../../core/adaptive-learning/adaptiveSelector';
import { dayKey } from '../../core/utils/date';
import { mean } from '../../core/utils/array';
import { uuid } from '../../core/utils/id';
import { newSyncMeta, touchSyncMeta } from '../models';
import type {
  DailyActivity,
  DashboardSummary,
  ID,
  MasteryBreakdown,
  Mistake,
  Question,
  ReviewItem,
  StudyGoal,
  StudyGoalKind,
} from '../models';
import type { RepositoryRegistry } from '../repositories';
import { levelProgress } from '../rules/xp';

export interface MistakeGroup {
  topicId: ID;
  topicName: string;
  topicNameBn: string;
  emoji: string;
  count: number;
  mistakes: Mistake[];
}

export interface RevisionQueue {
  dueNow: number;
  items: ReviewItem[];
  /** Questions restored for the due items, in the same order. */
  questions: Question[];
}

export interface StudyPlanBlock {
  kind: 'learn' | 'practice' | 'mistakes' | 'brain' | 'exam';
  minutes: number;
  label: { en: string; bn: string };
  detail: { en: string; bn: string };
  topicId?: ID;
}

/** Dashboard, mistake bank, revision queue, goals and study plan. */
export class ProgressService {
  constructor(private readonly repos: RepositoryRegistry) {}

  /** The progress dashboard (spec §36). */
  async getDashboard(now = Date.now()): Promise<DashboardSummary> {
    const profile = await this.repos.users.getProfile();
    const [progress, topicProgress, topics, streak, thinking, activity, attempts, exams] =
      await Promise.all([
        this.repos.progress.getProgress(profile.id),
        this.repos.progress.getTopicProgress(),
        this.repos.topics.getTopics(),
        this.repos.progress.getStreak(),
        this.repos.progress.getThinkingScore(),
        this.repos.progress.getDailyActivity(7),
        this.repos.attempts.getAttempts({ limit: 100 }),
        this.repos.exams.getExams(),
      ]);

    const topicById = new Map(topics.map((t) => [t.id, t]));
    const toBreakdown = (topicId: ID): MasteryBreakdown => {
      const topic = topicById.get(topicId);
      const entry = topicProgress.find((p) => p.topicId === topicId);
      return {
        topicId,
        topicName: topic?.name ?? topicId,
        topicNameBn: topic?.nameBn ?? topicId,
        emoji: topic?.emoji ?? '📘',
        mastery: entry?.mastery ?? 0,
        attempts: entry?.attempts ?? 0,
        accuracy: entry && entry.attempts > 0 ? Number((entry.correct / entry.attempts).toFixed(4)) : 0,
      };
    };

    // Exam readiness uses the exam the user's goal points at, else the best of all.
    const readinessByExam = exams.map((exam) =>
      examReadiness(Array.from(new Set(exam.sections.flatMap((s) => s.topicIds))), topicProgress),
    );

    const solved = progress.questionsSolved;
    return {
      overallMastery: overallMastery(topicProgress),
      topicsMastered: topicProgress.filter((t) => t.mastery >= 0.8).length,
      topicsInProgress: topicProgress.filter((t) => t.attempts > 0 && t.mastery < 0.8).length,
      questionsSolved: solved,
      accuracy: solved === 0 ? 0 : Number((progress.questionsCorrect / solved).toFixed(4)),
      averageSpeedMs: attempts.length === 0 ? 0 : Math.round(mean(attempts.map((a) => a.timeSpentMs))),
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      weakTopics: weakTopicIds(topicProgress).map(toBreakdown),
      strongTopics: strongTopicIds(topicProgress).map(toBreakdown),
      dailyBrainScore: activity.find((a) => a.day === dayKey(now))?.brainScore ?? 0,
      examReadiness: readinessByExam.length ? Math.max(...readinessByExam) : 0,
      thinkingScore: thinking.score,
      xp: progress.xp,
      level: progress.level,
      coins: progress.coins,
      tier: progress.tier,
      last7Days: fillMissingDays(activity, now),
    };
  }

  async getLevelProgress(): Promise<ReturnType<typeof levelProgress>> {
    const profile = await this.repos.users.getProfile();
    const progress = await this.repos.progress.getProgress(profile.id);
    return levelProgress(progress.xp);
  }

  async getThinkingProfile(): Promise<{
    score: number;
    band: ReturnType<typeof thinkingBand>;
    dimensions: { key: string; value: number }[];
    weakest: string[];
  }> {
    const state = await this.repos.progress.getThinkingScore();
    return {
      score: state.score,
      band: thinkingBand(state.score),
      dimensions: Object.entries(state.dimensions).map(([key, value]) => ({ key, value })),
      weakest: weakestDimensions(state.dimensions, 3),
    };
  }

  /** The mistake bank, grouped by topic (spec §18). */
  async getMistakeGroups(): Promise<MistakeGroup[]> {
    const [mistakes, topics] = await Promise.all([
      this.repos.mistakes.getMistakes({ limit: 300 }),
      this.repos.topics.getTopics(),
    ]);
    const topicById = new Map(topics.map((t) => [t.id, t]));
    const groups = new Map<ID, MistakeGroup>();

    for (const mistake of mistakes) {
      const topic = topicById.get(mistake.topicId);
      const group =
        groups.get(mistake.topicId) ??
        {
          topicId: mistake.topicId,
          topicName: topic?.name ?? mistake.topicId,
          topicNameBn: topic?.nameBn ?? mistake.topicId,
          emoji: topic?.emoji ?? '📘',
          count: 0,
          mistakes: [],
        };
      group.count++;
      group.mistakes.push(mistake);
      groups.set(mistake.topicId, group);
    }

    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }

  /** Restores the questions behind open mistakes so they can be retried. */
  async getMistakeQuestions(topicId?: ID, limit = 20): Promise<{ mistake: Mistake; question: Question }[]> {
    const mistakes = await this.repos.mistakes.getMistakes({ topicId, limit });
    const out: { mistake: Mistake; question: Question }[] = [];
    for (const mistake of mistakes) {
      const question = await this.restoreQuestion(mistake.questionId, mistake.questionSnapshot);
      if (question) out.push({ mistake, question });
    }
    return out;
  }

  async removeMistake(mistake: Mistake): Promise<void> {
    await this.repos.mistakes.removeMistake(mistake.id);
  }

  /** The spaced-repetition revision queue (spec §19). */
  async getRevisionQueue(now = Date.now(), limit = 20): Promise<RevisionQueue> {
    const items = await this.repos.reviews.getDueItems(now, limit);
    const questions: Question[] = [];
    const kept: ReviewItem[] = [];
    for (const item of items) {
      if (item.itemType !== 'question') continue;
      const question = await this.restoreQuestion(item.itemId, item.snapshot);
      if (!question) continue;
      kept.push(item);
      questions.push(question);
    }
    return { dueNow: await this.repos.reviews.countDue(now), items: kept, questions };
  }

  /* ── goals (spec §39) ──────────────────────────────────────────────────── */

  async getGoals(now = Date.now()): Promise<StudyGoal[]> {
    const goals = await this.repos.progress.getGoals();
    if (goals.length > 0) return goals;

    // Seed the two default goals from the profile on first visit.
    const profile = await this.repos.users.getProfile();
    const defaults: StudyGoal[] = [
      {
        ...newSyncMeta(now),
        id: uuid(),
        kind: 'daily_questions',
        target: profile.dailyGoalQuestions,
        progress: 0,
        periodKey: dayKey(now),
        topicId: null,
        examId: null,
        active: true,
      },
      {
        ...newSyncMeta(now),
        id: uuid(),
        kind: 'daily_minutes',
        target: profile.dailyGoalMinutes,
        progress: 0,
        periodKey: dayKey(now),
        topicId: null,
        examId: null,
        active: true,
      },
    ];
    for (const goal of defaults) await this.repos.progress.upsertGoal(goal);
    return defaults;
  }

  async setGoal(kind: StudyGoalKind, target: number, options: { topicId?: ID; examId?: ID } = {}, now = Date.now()): Promise<StudyGoal> {
    const goals = await this.repos.progress.getGoals();
    const existing = goals.find((g) => g.kind === kind && (g.topicId ?? null) === (options.topicId ?? null));
    const goal: StudyGoal = existing
      ? { ...touchSyncMeta(existing, now), target: Math.max(1, target), active: true }
      : {
          ...newSyncMeta(now),
          id: uuid(),
          kind,
          target: Math.max(1, target),
          progress: 0,
          periodKey: kind.startsWith('daily') ? dayKey(now) : null,
          topicId: options.topicId ?? null,
          examId: options.examId ?? null,
          active: true,
        };
    await this.repos.progress.upsertGoal(goal);
    return goal;
  }

  /** Refreshes today's goal progress from the activity log. */
  async refreshGoalProgress(now = Date.now()): Promise<StudyGoal[]> {
    const [goals, activity, topicProgress] = await Promise.all([
      this.getGoals(now),
      this.repos.progress.getDailyActivityForDay(dayKey(now)),
      this.repos.progress.getTopicProgress(),
    ]);

    const out: StudyGoal[] = [];
    for (const goal of goals) {
      let progress = goal.progress;
      if (goal.kind === 'daily_questions') progress = activity?.questionsAnswered ?? 0;
      else if (goal.kind === 'daily_minutes') progress = activity?.minutesStudied ?? 0;
      else if (goal.kind === 'topic_mastery' && goal.topicId) {
        progress = Math.round((topicProgress.find((t) => t.topicId === goal.topicId)?.mastery ?? 0) * 100);
      }
      const updated = { ...touchSyncMeta(goal, now), progress, periodKey: goal.periodKey ?? dayKey(now) };
      if (updated.progress !== goal.progress) await this.repos.progress.upsertGoal(updated);
      out.push(updated);
    }
    return out;
  }

  /**
   * The adaptive study planner (spec §40): splits the available minutes across
   * learning, practice, mistakes and brain math based on what is weakest.
   */
  async getStudyPlan(availableMinutes = 30, now = Date.now()): Promise<StudyPlanBlock[]> {
    const minutes = Math.max(5, Math.min(240, availableMinutes));
    const [topicProgress, topics, mistakes, revision] = await Promise.all([
      this.repos.progress.getTopicProgress(),
      this.repos.topics.getTopics(),
      this.repos.mistakes.getMistakes({ limit: 50 }),
      this.getRevisionQueue(now, 5),
    ]);

    const weakest = weakTopicIds(topicProgress, 1)[0];
    const topic = weakest ? topics.find((t) => t.id === weakest) : undefined;

    const blocks: StudyPlanBlock[] = [];
    const share = (ratio: number): number => Math.max(1, Math.round(minutes * ratio));

    blocks.push({
      kind: 'learn',
      minutes: share(0.3),
      label: { en: 'Learn', bn: 'শেখা' },
      detail: topic
        ? { en: 'Lesson on ' + topic.name, bn: topic.nameBn + ' এর পাঠ' }
        : { en: 'Continue your next lesson', bn: 'পরের পাঠ চালিয়ে যান' },
      topicId: topic?.id,
    });

    blocks.push({
      kind: 'practice',
      minutes: share(0.3),
      label: { en: 'Practice', bn: 'অভ্যাস' },
      detail: topic
        ? { en: 'Adaptive practice in ' + topic.name, bn: topic.nameBn + ' এ অ্যাডাপটিভ অভ্যাস' }
        : { en: 'Adaptive practice', bn: 'অ্যাডাপটিভ অভ্যাস' },
      topicId: topic?.id,
    });

    if (mistakes.length > 0 || revision.dueNow > 0) {
      blocks.push({
        kind: 'mistakes',
        minutes: share(0.2),
        label: { en: 'Mistakes & revision', bn: 'ভুল ও পুনরালোচনা' },
        detail: {
          en: mistakes.length + ' open mistakes, ' + revision.dueNow + ' due for review',
          bn: mistakes.length + ' টি ভুল, ' + revision.dueNow + ' টি পুনরালোচনার সময় হয়েছে',
        },
      });
    }

    blocks.push({
      kind: 'brain',
      minutes: share(0.2),
      label: { en: 'Brain math', bn: 'ব্রেইন ম্যাথ' },
      detail: { en: "Today's thinking set", bn: 'আজকের চিন্তন সেট' },
    });

    return blocks;
  }

  /** Restores a question from the database, falling back to a stored snapshot. */
  private async restoreQuestion(questionId: ID, snapshot?: string | null): Promise<Question | null> {
    const stored = await this.repos.questions.getQuestionById(questionId);
    if (stored) return stored;
    if (!snapshot) return null;
    try {
      const parsed = JSON.parse(snapshot) as Question;
      return parsed?.id ? parsed : null;
    } catch {
      return null;
    }
  }
}

/** Pads the activity list so a chart always has seven bars. */
function fillMissingDays(activity: readonly DailyActivity[], now: number): DailyActivity[] {
  const byDay = new Map(activity.map((a) => [a.day, a]));
  const out: DailyActivity[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = dayKey(now - i * 86400000);
    const existing = byDay.get(day);
    out.push(
      existing ?? {
        ...newSyncMeta(now),
        id: 'empty-' + day,
        day,
        questionsAnswered: 0,
        correct: 0,
        minutesStudied: 0,
        xpEarned: 0,
        brainScore: 0,
        goalMet: false,
      },
    );
  }
  return out;
}

export { masteryLabel };
