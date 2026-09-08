import { mean } from '../../core/utils/array';
import type {
  Exam,
  ExamResult,
  ExamRuntimeQuestion,
  ExamTopicBreakdown,
  GameKind,
  ID,
} from '../models';

/** Exam scoring including negative marking and section analysis (spec §25). */
export interface ScoreExamInput {
  exam: Exam;
  attemptId: ID;
  questions: readonly ExamRuntimeQuestion[];
  topicNames: Readonly<Record<ID, string>>;
  isCorrect: (question: ExamRuntimeQuestion) => boolean;
}

export function scoreExam(input: ScoreExamInput): ExamResult {
  const { exam, questions } = input;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let totalTimeMs = 0;

  const byTopic = new Map<ID, { total: number; correct: number; timeMs: number }>();

  for (const runtime of questions) {
    totalTimeMs += runtime.timeSpentMs;
    const topicId = runtime.question.topicId;
    const bucket = byTopic.get(topicId) ?? { total: 0, correct: 0, timeMs: 0 };
    bucket.total++;
    bucket.timeMs += runtime.timeSpentMs;

    const answered = runtime.givenAnswer !== undefined && runtime.givenAnswer !== '';
    if (!answered) {
      skipped++;
    } else if (input.isCorrect(runtime)) {
      correct++;
      bucket.correct++;
    } else {
      wrong++;
    }
    byTopic.set(topicId, bucket);
  }

  const rawScore = correct * exam.markPerQuestion;
  const negativeMarks = wrong * exam.negativeMarkPerWrong;
  // Marks never go below zero, matching how these exams are actually reported.
  const finalScore = Math.max(0, Number((rawScore - negativeMarks).toFixed(2)));
  const maxScore = Number((questions.length * exam.markPerQuestion).toFixed(2));
  const answered = correct + wrong;

  const breakdown: ExamTopicBreakdown[] = Array.from(byTopic.entries()).map(([topicId, bucket]) => ({
    topicId,
    topicName: input.topicNames[topicId] ?? topicId,
    total: bucket.total,
    correct: bucket.correct,
    accuracy: bucket.total === 0 ? 0 : Number((bucket.correct / bucket.total).toFixed(4)),
    averageTimeMs: bucket.total === 0 ? 0 : Math.round(bucket.timeMs / bucket.total),
  }));

  const ranked = breakdown.slice().sort((a, b) => a.accuracy - b.accuracy);

  return {
    attemptId: input.attemptId,
    examId: exam.id,
    totalQuestions: questions.length,
    answered,
    correct,
    wrong,
    skipped,
    rawScore: Number(rawScore.toFixed(2)),
    negativeMarks: Number(negativeMarks.toFixed(2)),
    finalScore,
    maxScore,
    accuracy: answered === 0 ? 0 : Number((correct / answered).toFixed(4)),
    averageTimeMs: questions.length === 0 ? 0 : Math.round(totalTimeMs / questions.length),
    totalTimeMs,
    weakTopics: ranked.filter((t) => t.accuracy < 0.6).slice(0, 5),
    strongTopics: ranked
      .slice()
      .reverse()
      .filter((t) => t.accuracy >= 0.7)
      .slice(0, 5),
    breakdown,
  };
}

/**
 * Offline percentile: compares a score with the user's own history and a
 * deterministic synthetic field, since there is no server (spec §35).
 */
export function offlinePercentile(score: number, previousScores: readonly number[], maxScore: number): number {
  if (maxScore <= 0) return 0;
  const ratio = score / maxScore;
  // Synthetic cohort: a plausible bell-ish spread of ratios.
  const synthetic = [0.2, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9];
  const cohort = [...synthetic, ...previousScores.map((s) => s / maxScore)];
  const below = cohort.filter((c) => c < ratio).length;
  return Math.round((below / cohort.length) * 100);
}

export interface GameScoreInput {
  correct: number;
  wrong: number;
  maxCombo: number;
  difficultyReached: number;
  durationMs: number;
  kind: GameKind;
}

/** Game score rewards accuracy and combo, not just tapping speed (spec §28). */
export function scoreGame(input: GameScoreInput): number {
  const base = input.correct * 10;
  const difficultyBonus = input.correct * input.difficultyReached * 2;
  const comboBonus = input.maxCombo * 15;
  const accuracyPenalty = input.wrong * 8;
  return Math.max(0, Math.round(base + difficultyBonus + comboBonus - accuracyPenalty));
}

export interface ChallengeOutcome {
  score: number;
  passed: boolean;
  accuracy: number;
}

/** A boss battle is passed at 70% or better (spec §34). */
export const BOSS_PASS_RATIO = 0.7;

export function scoreChallenge(correct: number, total: number, passRatio = BOSS_PASS_RATIO): ChallengeOutcome {
  const accuracy = total === 0 ? 0 : correct / total;
  return {
    score: correct,
    passed: accuracy >= passRatio,
    accuracy: Number(accuracy.toFixed(4)),
  };
}

/** Session summary shown after practice. */
export interface SessionSummary {
  answered: number;
  correct: number;
  accuracy: number;
  averageTimeMs: number;
  xpEarned: number;
  bestStreak: number;
}

export function summariseSession(
  outcomes: readonly { isCorrect: boolean; timeSpentMs: number; xp: number }[],
): SessionSummary {
  const correct = outcomes.filter((o) => o.isCorrect).length;
  let best = 0;
  let current = 0;
  for (const outcome of outcomes) {
    if (outcome.isCorrect) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return {
    answered: outcomes.length,
    correct,
    accuracy: outcomes.length === 0 ? 0 : Number((correct / outcomes.length).toFixed(4)),
    averageTimeMs: outcomes.length === 0 ? 0 : Math.round(mean(outcomes.map((o) => o.timeSpentMs))),
    xpEarned: outcomes.reduce((acc, o) => acc + o.xp, 0),
    bestStreak: best,
  };
}
