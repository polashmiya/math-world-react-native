import type { Migration } from './index';

/**
 * Sound effect volume and the five-step text size.
 *
 * `font_scale` defaults to empty rather than `'medium'` on purpose: an empty
 * value tells the mapper the row predates this migration, so it can carry the
 * old `large_text` toggle forward instead of silently shrinking the type for
 * someone who had asked for it to be large.
 */
export const migration007: Migration = {
  version: 7,
  name: 'sound_font_scale',
  statements: [
    `ALTER TABLE user_settings ADD COLUMN sound_volume INTEGER NOT NULL DEFAULT 80`,
    `ALTER TABLE user_settings ADD COLUMN font_scale TEXT NOT NULL DEFAULT ''`,
  ],
};
