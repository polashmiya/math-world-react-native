import { clampDifficulty } from '../../core/constants/difficulty';
import { clamp } from '../../core/utils/array';
import { daysBetween, dayKey } from '../../core/utils/date';
import type { PracticeMode, StreakState } from '../models';

/** XP and levels (spec §33). Progression never depends on payment. */
export const XP_PER_LEVEL_BASE = 300;

/** Level thresholds grow gently so early levels feel quick. */
export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / XP_PER_LEVEL_BASE)) + 1;
}

export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return Math.pow(l - 1, 2) * XP_PER_LEVEL_BASE;
}

export function levelProgress(xp: number): { level: number; into: number; needed: number; ratio: number } {
  const level = levelForXp(xp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const needed = Math.max(1, next - start);
  const into = clamp(xp - start, 0, needed);
  return { level, into, needed, ratio: Number((into / needed).toFixed(4)) };
}

/** Mode multipliers reward the harder, less comfortable modes. */
const MODE_MULTIPLIER: Record<PracticeMode, number> = {
  practice: 1,
  lesson: 1.1,
  daily_brain: 1.2,
  exam: 1.3,
  game: 0.9,
  mistake_review: 1.4,
  boss: 1.6,
  challenge: 1.4,
  revision: 1.2,
};

export interface XpInput {
  isCorrect: boolean;
  difficulty: number;
  mode: PracticeMode;
  hintsUsed: number;
  /** 0..1 from the difficulty engine. */
  speedScore: number;
  streakDays: number;
}

export interface XpAward {
  xp: number;
  coins: number;
  reasons: string[];
}

export function xpForAttempt(input: XpInput): XpAward {
  const reasons: string[] = [];
  if (!input.isCorrect) {
    // A wrong answer still earns a token amount: attempting is the habit.
    return { xp: 2, coins: 0, reasons: ['attempted'] };
  }

  const difficulty = clampDifficulty(input.difficulty);
  let xp = 5 + difficulty * 3;
  reasons.push('correct at difficulty ' + difficulty);

  const multiplier = MODE_MULTIPLIER[input.mode] ?? 1;
  if (multiplier !== 1) {
    xp *= multiplier;
    reasons.push(input.mode + ' bonus');
  }

  if (input.hintsUsed > 0) {
    xp *= Math.max(0.5, 1 - 0.2 * input.hintsUsed);
    reasons.push('hints used');
  } else if (input.speedScore > 0.7) {
    xp *= 1.15;
    reasons.push('fast answer');
  }

  // Streak bonus caps at +50% so a long streak never trivialises new work.
  const streakBonus = Math.min(0.5, input.streakDays * 0.02);
  if (streakBonus > 0) {
    xp *= 1 + streakBonus;
    reasons.push(input.streakDays + '-day streak');
  }

  const finalXp = Math.max(1, Math.round(xp));
  return { xp: finalXp, coins: Math.max(1, Math.round(finalXp / 4)), reasons };
}

export interface StreakUpdate {
  streak: StreakState;
  /** True when today is the first activity of the day. */
  incremented: boolean;
  broken: boolean;
}

/**
 * Streak rules (spec §33): a day counts when any question is answered.
 * A single missed day can be absorbed by a freeze if the user has one.
 */
export function updateStreak(streak: StreakState, now = Date.now()): StreakUpdate {
  const today = dayKey(now);
  if (streak.lastActiveDay === today) {
    return { streak, incremented: false, broken: false };
  }

  if (!streak.lastActiveDay) {
    return {
      streak: { ...streak, currentStreak: 1, longestStreak: Math.max(1, streak.longestStreak), lastActiveDay: today },
      incremented: true,
      broken: false,
    };
  }

  const gap = daysBetween(new Date(streak.lastActiveDay + 'T00:00:00').getTime(), now);
  if (gap === 1) {
    const next = streak.currentStreak + 1;
    return {
      streak: {
        ...streak,
        currentStreak: next,
        longestStreak: Math.max(next, streak.longestStreak),
        lastActiveDay: today,
      },
      incremented: true,
      broken: false,
    };
  }

  if (gap === 2 && streak.freezesAvailable > 0) {
    const next = streak.currentStreak + 1;
    return {
      streak: {
        ...streak,
        currentStreak: next,
        longestStreak: Math.max(next, streak.longestStreak),
        lastActiveDay: today,
        freezesAvailable: streak.freezesAvailable - 1,
      },
      incremented: true,
      broken: false,
    };
  }

  return {
    streak: { ...streak, currentStreak: 1, lastActiveDay: today },
    incremented: true,
    broken: gap > 1,
  };
}
