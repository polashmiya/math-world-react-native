import type { ExamFamily } from '../../core/constants/levels';
import type { ID, SyncMeta } from './common';
import type { Question } from './question';

/**
 * A blueprint, not a fixed paper. Sections describe how to draw questions so
 * new exams can be added as content without touching the engine (spec §23).
 */
export interface ExamSection {
  id: string;
  name: string;
  nameBn: string;
  questionCount: number;
  topicIds: ID[];
  skillIds: ID[];
  difficultyMin: number;
  difficultyMax: number;
  examTag?: string | null;
  /** Fallback generators when the static bank cannot fill the section. */
  generatorIds: string[];
}

export interface Exam {
  id: ID;
  code: string;
  family: ExamFamily;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  emoji: string;
  totalQuestions: number;
  durationSeconds: number;
  markPerQuestion: number;
  /** Marks subtracted per wrong answer; 0 disables negative marking. */
  negativeMarkPerWrong: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  sections: ExamSection[];
  /** Previous-year papers available for this exam. */
  years: number[];
  contentVersion: number;
}

export type ExamQuestionState = 'unseen' | 'answered' | 'skipped' | 'marked';

export interface ExamRuntimeQuestion {
  question: Question;
  sectionId: string;
  index: number;
  state: ExamQuestionState;
  givenAnswer?: string;
  timeSpentMs: number;
}

export interface ExamSessionSnapshot {
  examId: ID;
  attemptId: ID;
  startedAt: number;
  durationSeconds: number;
  questions: ExamRuntimeQuestion[];
  currentIndex: number;
}

export interface ExamTopicBreakdown {
  topicId: ID;
  topicName: string;
  total: number;
  correct: number;
  accuracy: number;
  averageTimeMs: number;
}

export interface ExamResult {
  attemptId: ID;
  examId: ID;
  totalQuestions: number;
  answered: number;
  correct: number;
  wrong: number;
  skipped: number;
  rawScore: number;
  negativeMarks: number;
  finalScore: number;
  maxScore: number;
  accuracy: number;
  averageTimeMs: number;
  totalTimeMs: number;
  percentile?: number;
  weakTopics: ExamTopicBreakdown[];
  strongTopics: ExamTopicBreakdown[];
  breakdown: ExamTopicBreakdown[];
}

export interface ExamAttempt extends SyncMeta {
  id: ID;
  examId: ID;
  startedAt: number;
  finishedAt?: number | null;
  score: number;
  maxScore: number;
  accuracy: number;
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  totalTimeMs: number;
  /** Serialised `ExamResult` for the detail screen. */
  resultJson: string;
}
