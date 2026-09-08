/**
 * Difficulty is a 1..9 integer and is deliberately INDEPENDENT of academic
 * level / class (spec §11 and §61.12): "Class 8 + Algebra + Expert" is valid.
 */
export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 9;

export type DifficultyBand =
  | 'beginner'
  | 'basic'
  | 'intermediate'
  | 'medium'
  | 'advanced'
  | 'expert'
  | 'master'
  | 'olympiad'
  | 'research';

export const DIFFICULTY_BANDS: readonly DifficultyBand[] = [
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

export function bandForDifficulty(difficulty: number): DifficultyBand {
  const index = Math.min(
    DIFFICULTY_BANDS.length - 1,
    Math.max(0, Math.round(difficulty) - 1),
  );
  return DIFFICULTY_BANDS[index];
}

export function difficultyForBand(band: DifficultyBand): number {
  const index = DIFFICULTY_BANDS.indexOf(band);
  return index < 0 ? 3 : index + 1;
}

export function clampDifficulty(value: number): number {
  if (!Number.isFinite(value)) return DIFFICULTY_MIN;
  return Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, Math.round(value)));
}

/** Points awarded scale with difficulty so hard work is worth more XP. */
export function pointsForDifficulty(difficulty: number): number {
  return clampDifficulty(difficulty) * 10;
}

/** Rough time budget used by the exam engine and speed scoring. */
export function estimatedSecondsForDifficulty(difficulty: number): number {
  return 20 + clampDifficulty(difficulty) * 15;
}
