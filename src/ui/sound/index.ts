export { SOUND_NAMES, SOUND_SOURCES, PRELOADED_SOUNDS, type SoundName } from './catalogue';
export { SoundEngine, type PlayOptions } from './engine';
export { SoundProvider, useSound, type SoundApi } from './SoundProvider';
/**
 * Pitch for a combo of `streak` correct answers in a row — the ladder that
 * makes a run of right answers feel like it is going somewhere. Capped so it
 * never turns into a chipmunk.
 */
export function streakRate(streak: number): number {
  return Math.min(1.5, 1 + Math.max(0, streak - 1) * 0.06);
}
