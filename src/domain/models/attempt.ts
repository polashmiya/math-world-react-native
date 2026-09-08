import type { ID, SyncMeta } from './common';

/** Where an attempt came from — drives XP, mastery weighting and analytics. */
export type PracticeMode =
  | 'practice'
  | 'lesson'
  | 'daily_brain'
  | 'exam'
  | 'game'
  | 'mistake_review'
  | 'boss'
  | 'challenge'
  | 'revision';

export interface QuestionAttempt extends SyncMeta {
  id: ID;
  questionId: ID;
  topicId: ID;
  skillIds: ID[];
  sessionId?: ID | null;
  mode: PracticeMode;
  difficulty: number;
  isCorrect: boolean;
  givenAnswer: string;
  correctAnswer: string;
  timeSpentMs: number;
  hintsUsed: number;
  /** Think First estimate, when the user provided one (spec §21). */
  estimateValue?: number | null;
  estimateAccuracy?: number | null;
  strategy?: string | null;
}

export interface AttemptFilter {
  questionIds?: ID[];
  topicIds?: ID[];
  skillIds?: ID[];
  modes?: PracticeMode[];
  isCorrect?: boolean;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  offset?: number;
}

export interface Mistake extends SyncMeta {
  id: ID;
  questionId: ID;
  topicId: ID;
  skillIds: ID[];
  difficulty: number;
  mistakeCount: number;
  lastMistakeAt: number;
  /** Consecutive correct retries; the mistake clears at `MASTERY_RETRIES`. */
  correctStreak: number;
  resolved: boolean;
  /** Cached snapshot so a generated question can be retried later. */
  questionSnapshot: string;
  reason?: string | null;
}

export const MISTAKE_MASTERY_RETRIES = 2;

export interface StudySession extends SyncMeta {
  id: ID;
  mode: PracticeMode;
  startedAt: number;
  endedAt?: number | null;
  questionsAnswered: number;
  correct: number;
  xpEarned: number;
  topicId?: ID | null;
  meta?: string | null;
}

export interface Bookmark extends SyncMeta {
  id: ID;
  itemType: BookmarkItemType;
  itemId: ID;
  label: string;
  note?: string | null;
  /** Snapshot for generated questions that are not in the content DB. */
  snapshot?: string | null;
}

export type BookmarkItemType = 'question' | 'lesson' | 'formula' | 'mistake' | 'topic' | 'exam';

/** Spaced repetition queue item (spec §19). */
export interface ReviewItem extends SyncMeta {
  id: ID;
  itemType: 'question' | 'skill' | 'lesson';
  itemId: ID;
  topicId?: ID | null;
  /** Index into `REVIEW_INTERVALS`. */
  stage: number;
  dueAt: number;
  lastReviewedAt?: number | null;
  repetitions: number;
  lapses: number;
  ease: number;
  snapshot?: string | null;
}
