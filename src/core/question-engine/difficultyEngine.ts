import { clampDifficulty, DIFFICULTY_MAX, DIFFICULTY_MIN } from '../constants/difficulty';
import { clamp, mean } from '../utils/array';
import type { QuestionAttempt } from '../../domain/models';

export interface PerformanceWindow {
  /** Most recent first. */
  attempts: readonly QuestionAttempt[];
  currentDifficulty: number;
}

export interface DifficultyDecision {
  nextDifficulty: number;
  delta: number;
  reason: DifficultyReason;
  accuracy: number;
  averageTimeMs: number;
}

export type DifficultyReason =
  | 'warmup'
  | 'streak_up'
  | 'accuracy_up'
  | 'hold'
  | 'accuracy_down'
  | 'slow_down'
  | 'struggling';

const WINDOW = 8;
/** Above this accuracy the learner is ready for harder work. */
const UP_THRESHOLD = 0.85;
const DOWN_THRESHOLD = 0.5;

/**
 * Adaptive difficulty (spec §16). Uses accuracy, speed, consecutive results
 * and hint usage — never accuracy alone.
 */
export function nextDifficulty(window: PerformanceWindow): DifficultyDecision {
  const recent = window.attempts.slice(0, WINDOW);
  const current = clampDifficulty(window.currentDifficulty);

  if (recent.length < 3) {
    return {
      nextDifficulty: current,
      delta: 0,
      reason: 'warmup',
      accuracy: recent.length ? recent.filter((a) => a.isCorrect).length / recent.length : 0,
      averageTimeMs: recent.length ? mean(recent.map((a) => a.timeSpentMs)) : 0,
    };
  }

  const correct = recent.filter((a) => a.isCorrect).length;
  const accuracy = correct / recent.length;
  const averageTimeMs = mean(recent.map((a) => a.timeSpentMs));
  const expectedMs = expectedTimeMs(current);
  const hintRate = mean(recent.map((a) => (a.hintsUsed > 0 ? 1 : 0)));

  let streak = 0;
  for (const attempt of recent) {
    if (attempt.isCorrect === recent[0].isCorrect) streak++;
    else break;
  }
  const winStreak = recent[0].isCorrect ? streak : 0;
  const lossStreak = recent[0].isCorrect ? 0 : streak;

  let delta = 0;
  let reason: DifficultyReason = 'hold';

  if (lossStreak >= 3 || accuracy < 0.35) {
    delta = -2;
    reason = 'struggling';
  } else if (accuracy < DOWN_THRESHOLD) {
    delta = -1;
    reason = 'accuracy_down';
  } else if (winStreak >= 4 && averageTimeMs < expectedMs * 0.75 && hintRate < 0.2) {
    delta = 2;
    reason = 'streak_up';
  } else if (accuracy >= UP_THRESHOLD && averageTimeMs <= expectedMs && hintRate < 0.35) {
    delta = 1;
    reason = 'accuracy_up';
  } else if (accuracy >= UP_THRESHOLD && averageTimeMs > expectedMs * 1.6) {
    // Right answers but far too slow: consolidate instead of climbing.
    delta = 0;
    reason = 'slow_down';
  }

  const next = clamp(current + delta, DIFFICULTY_MIN, DIFFICULTY_MAX);
  return { nextDifficulty: next, delta: next - current, reason, accuracy, averageTimeMs };
}

/** Time budget the engine expects at a given difficulty. */
export function expectedTimeMs(difficulty: number): number {
  return (20 + clampDifficulty(difficulty) * 15) * 1000;
}

/** Starting difficulty for a learner with no history on a topic. */
export function startingDifficulty(
  baseDifficulty: number,
  preference: number | 'adaptive',
  mastery = 0,
): number {
  if (preference !== 'adaptive') return clampDifficulty(preference);
  // Mastery nudges the entry point up so returning users are not bored.
  return clampDifficulty(baseDifficulty + Math.round(mastery * 3));
}

/**
 * Speed score in 0..1 comparing actual time against the expected budget.
 * Used by the mastery engine and the Mathematical Thinking Score.
 */
export function speedScore(timeSpentMs: number, difficulty: number): number {
  const expected = expectedTimeMs(difficulty);
  if (timeSpentMs <= 0) return 0;
  const ratio = expected / timeSpentMs;
  return Number(clamp(ratio, 0, 1.5).toFixed(4)) / 1.5;
}
