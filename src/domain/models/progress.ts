import type { BrainCategory, ThinkingDimension, TournamentTier } from '../../core/constants/categories';
import type { ID, SyncMeta } from './common';

/** Aggregate, denormalised counters for the dashboard (spec §36). */
export interface UserProgress extends SyncMeta {
  userId: ID;
  xp: number;
  coins: number;
  level: number;
  questionsSolved: number;
  questionsCorrect: number;
  totalTimeMs: number;
  lessonsCompleted: number;
  examsTaken: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDay?: string | null;
  overallMastery: number;
  thinkingScore: number;
  tier: TournamentTier;
}

export interface TopicProgress extends SyncMeta {
  id: ID;
  topicId: ID;
  attempts: number;
  correct: number;
  totalTimeMs: number;
  /** 0..1 mastery from the mastery engine, not raw accuracy. */
  mastery: number;
  bestDifficulty: number;
  lastPracticedAt?: number | null;
  bossDefeatedAt?: number | null;
}

export interface SkillProgress extends SyncMeta {
  id: ID;
  skillId: ID;
  topicId: ID;
  attempts: number;
  correct: number;
  totalTimeMs: number;
  mastery: number;
  /** Rolling window of recent outcomes, newest last, as `1`/`0` characters. */
  recentOutcomes: string;
  lastPracticedAt?: number | null;
}

export interface CompletedLesson extends SyncMeta {
  id: ID;
  lessonId: ID;
  topicId: ID;
  completedAt: number;
  masteryScore: number;
}

export interface DailyActivity extends SyncMeta {
  id: ID;
  /** `YYYY-MM-DD` local day key. */
  day: string;
  questionsAnswered: number;
  correct: number;
  minutesStudied: number;
  xpEarned: number;
  brainScore: number;
  goalMet: boolean;
}

export interface StreakState extends SyncMeta {
  id: ID;
  currentStreak: number;
  longestStreak: number;
  lastActiveDay?: string | null;
  freezesAvailable: number;
}

export interface Achievement {
  id: ID;
  code: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  emoji: string;
  /** Metric the achievement watches. */
  metric: AchievementMetric;
  threshold: number;
  xpReward: number;
  coinReward: number;
}

export type AchievementMetric =
  | 'questions_solved'
  | 'questions_correct'
  | 'streak_days'
  | 'lessons_completed'
  | 'exams_taken'
  | 'topics_mastered'
  | 'accuracy_percent'
  | 'daily_brain_days'
  | 'games_played'
  | 'mistakes_resolved'
  | 'thinking_score'
  | 'bosses_defeated';

export interface UnlockedAchievement extends SyncMeta {
  id: ID;
  achievementCode: string;
  unlockedAt: number;
  seen: boolean;
}

export interface ThinkingScoreState extends SyncMeta {
  id: ID;
  /** 0..1000 composite score. */
  score: number;
  dimensions: Record<ThinkingDimension, number>;
  updatedDay: string;
}

export interface BrainCategoryProgress extends SyncMeta {
  id: ID;
  category: BrainCategory;
  attempts: number;
  correct: number;
  mastery: number;
  lastPracticedAt?: number | null;
}

/** Study goals (spec §39). */
export interface StudyGoal extends SyncMeta {
  id: ID;
  kind: StudyGoalKind;
  target: number;
  progress: number;
  /** `YYYY-MM-DD` for daily goals, ISO week for weekly, else null. */
  periodKey?: string | null;
  topicId?: ID | null;
  examId?: ID | null;
  active: boolean;
}

export type StudyGoalKind =
  | 'daily_questions'
  | 'daily_minutes'
  | 'weekly_questions'
  | 'topic_mastery'
  | 'exam_target';

export interface MasteryBreakdown {
  topicId: ID;
  topicName: string;
  topicNameBn: string;
  emoji: string;
  mastery: number;
  attempts: number;
  accuracy: number;
}

export interface DashboardSummary {
  overallMastery: number;
  topicsMastered: number;
  topicsInProgress: number;
  questionsSolved: number;
  accuracy: number;
  averageSpeedMs: number;
  currentStreak: number;
  longestStreak: number;
  weakTopics: MasteryBreakdown[];
  strongTopics: MasteryBreakdown[];
  dailyBrainScore: number;
  examReadiness: number;
  thinkingScore: number;
  xp: number;
  level: number;
  coins: number;
  tier: TournamentTier;
  last7Days: DailyActivity[];
}
