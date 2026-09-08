import {
  CATEGORY_TO_DIMENSION,
  THINKING_DIMENSIONS,
  type BrainCategory,
  type ThinkingDimension,
} from '../constants/categories';
import { clamp, mean } from '../utils/array';
import { speedScore } from '../question-engine/difficultyEngine';
import type { QuestionAttempt } from '../../domain/models';

/**
 * Mathematical Thinking Score (spec §30). Explicitly NOT an IQ: it is a
 * trainable skill profile across eight dimensions, scored 0..1000.
 */
export const THINKING_SCORE_MAX = 1000;

export type DimensionScores = Record<ThinkingDimension, number>;

export function emptyDimensions(): DimensionScores {
  const out = {} as DimensionScores;
  for (const d of THINKING_DIMENSIONS) out[d] = 0;
  return out;
}

/** Maps a topic id onto the thinking dimension it mostly exercises. */
export function dimensionForTopic(topicId: string): ThinkingDimension {
  if (topicId.includes('probability')) return 'probability';
  if (topicId.includes('logic') || topicId.includes('set')) return 'logic';
  if (topicId.includes('sequence') || topicId.includes('pattern')) return 'pattern_recognition';
  if (topicId.includes('geometry') || topicId.includes('mensuration') || topicId.includes('measurement')) {
    return 'spatial_thinking';
  }
  if (topicId.includes('estimation')) return 'estimation';
  if (topicId.includes('statistic') || topicId.includes('data')) return 'mathematical_reasoning';
  if (topicId.includes('arithmetic') || topicId.includes('mental') || topicId.includes('fraction')) {
    return 'calculation';
  }
  return 'problem_solving';
}

export function dimensionForAttempt(
  attempt: Pick<QuestionAttempt, 'topicId'>,
  brainCategory?: BrainCategory | null,
): ThinkingDimension {
  if (brainCategory) return CATEGORY_TO_DIMENSION[brainCategory];
  return dimensionForTopic(attempt.topicId);
}

export interface ThinkingUpdate {
  attempt: QuestionAttempt;
  brainCategory?: BrainCategory | null;
}

/**
 * Blends a new attempt into the running dimension scores with exponential
 * smoothing, so a single bad day cannot wipe out weeks of progress.
 */
export function updateDimensions(
  current: DimensionScores,
  updates: readonly ThinkingUpdate[],
  smoothing = 0.15,
): DimensionScores {
  const next: DimensionScores = { ...current };
  for (const { attempt, brainCategory } of updates) {
    const dimension = dimensionForAttempt(attempt, brainCategory);
    const speed = speedScore(attempt.timeSpentMs, attempt.difficulty);
    const difficultyWeight = clamp(attempt.difficulty / 9, 0.1, 1);
    // A correct answer scores between 0.5 and 1 depending on difficulty and speed;
    // a wrong one scores low but never zero, since attempting still teaches.
    const sample = attempt.isCorrect
      ? clamp(0.5 + 0.35 * difficultyWeight + 0.15 * speed, 0, 1)
      : clamp(0.12 * difficultyWeight + (attempt.hintsUsed > 0 ? 0.05 : 0), 0, 1);
    const previous = next[dimension] / THINKING_SCORE_MAX;
    const blended = previous + smoothing * (sample - previous);
    next[dimension] = Math.round(clamp(blended, 0, 1) * THINKING_SCORE_MAX);
  }
  return next;
}

export function compositeScore(dimensions: DimensionScores): number {
  return Math.round(mean(THINKING_DIMENSIONS.map((d) => dimensions[d])));
}

export interface ThinkingBand {
  key: 'developing' | 'building' | 'capable' | 'sharp' | 'exceptional';
  en: string;
  bn: string;
}

export function thinkingBand(score: number): ThinkingBand {
  if (score < 200) return { key: 'developing', en: 'Developing', bn: 'গড়ে উঠছে' };
  if (score < 400) return { key: 'building', en: 'Building', bn: 'উন্নতি হচ্ছে' };
  if (score < 620) return { key: 'capable', en: 'Capable', bn: 'সক্ষম' };
  if (score < 820) return { key: 'sharp', en: 'Sharp', bn: 'দক্ষ' };
  return { key: 'exceptional', en: 'Exceptional', bn: 'অসাধারণ' };
}

export function weakestDimensions(dimensions: DimensionScores, count = 3): ThinkingDimension[] {
  return THINKING_DIMENSIONS.slice()
    .sort((a, b) => dimensions[a] - dimensions[b])
    .slice(0, count);
}

export function strongestDimensions(dimensions: DimensionScores, count = 3): ThinkingDimension[] {
  return THINKING_DIMENSIONS.slice()
    .sort((a, b) => dimensions[b] - dimensions[a])
    .slice(0, count);
}

/** Brain categories that feed the weakest dimensions — drives today's set. */
export function categoriesForWeakDimensions(
  dimensions: DimensionScores,
  count = 4,
): BrainCategory[] {
  const weak = new Set(weakestDimensions(dimensions, 3));
  const matching = (Object.keys(CATEGORY_TO_DIMENSION) as BrainCategory[]).filter((c) =>
    weak.has(CATEGORY_TO_DIMENSION[c]),
  );
  return matching.slice(0, count);
}
