/**
 * Display preferences that both the settings model and the theme need to agree
 * on. They live in `core/` because neither side may import the other.
 */

/** Text size, smallest to largest (spec §46). */
export type FontScale = 'xSmall' | 'small' | 'medium' | 'large' | 'xLarge';

export const FONT_SCALES: readonly FontScale[] = ['xSmall', 'small', 'medium', 'large', 'xLarge'];

export const DEFAULT_FONT_SCALE: FontScale = 'medium';

/**
 * Multipliers applied to every type token.
 *
 * The steps are deliberately uneven: below `medium` a small nudge is enough to
 * fit more on screen, while above it the jumps have to be large enough to be
 * worth taking for someone who chose them because reading is hard.
 */
export const FONT_SCALE_FACTORS: Record<FontScale, number> = {
  xSmall: 0.85,
  small: 0.93,
  medium: 1,
  large: 1.15,
  xLarge: 1.32,
};

export function isFontScale(value: unknown): value is FontScale {
  return typeof value === 'string' && (FONT_SCALES as readonly string[]).includes(value);
}

/** Sound effect volume is stored 0..100 so it survives an integer column. */
export const DEFAULT_SOUND_VOLUME = 80;

export const SOUND_VOLUME_STEP = 10;

export function clampSoundVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SOUND_VOLUME;
  return Math.max(0, Math.min(100, Math.round(value)));
}
