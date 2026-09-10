/**
 * The sound catalogue.
 *
 * Every effect the app can play is named here once, so a screen asks for
 * `play('correct')` and never for a file. The assets are generated offline by
 * `scripts/generate-sounds.mjs` — see that file for how each one is built.
 */

export type SoundName =
  /* interface */
  | 'tap'
  | 'select'
  | 'toggle'
  | 'blocked'
  /* answering */
  | 'correct'
  | 'incorrect'
  | 'streak'
  | 'hint'
  | 'reveal'
  /* sessions */
  | 'start'
  | 'complete'
  | 'perfect'
  | 'tick'
  | 'timeUp'
  /* rewards */
  | 'levelUp'
  | 'achievement'
  | 'record'
  | 'unlock'
  | 'reward';

/**
 * `require` is what hands Metro the asset, so these have to be literal and
 * eager. They are module ids, not decoded audio — nothing is loaded until the
 * engine builds a player for one.
 */
export const SOUND_SOURCES: Record<SoundName, number> = {
  tap: require('../../../assets/sounds/tap.wav'),
  select: require('../../../assets/sounds/select.wav'),
  toggle: require('../../../assets/sounds/toggle.wav'),
  blocked: require('../../../assets/sounds/blocked.wav'),
  correct: require('../../../assets/sounds/correct.wav'),
  incorrect: require('../../../assets/sounds/incorrect.wav'),
  streak: require('../../../assets/sounds/streak.wav'),
  hint: require('../../../assets/sounds/hint.wav'),
  reveal: require('../../../assets/sounds/reveal.wav'),
  start: require('../../../assets/sounds/start.wav'),
  complete: require('../../../assets/sounds/complete.wav'),
  perfect: require('../../../assets/sounds/perfect.wav'),
  tick: require('../../../assets/sounds/tick.wav'),
  timeUp: require('../../../assets/sounds/timeUp.wav'),
  levelUp: require('../../../assets/sounds/levelUp.wav'),
  achievement: require('../../../assets/sounds/achievement.wav'),
  record: require('../../../assets/sounds/record.wav'),
  unlock: require('../../../assets/sounds/unlock.wav'),
  reward: require('../../../assets/sounds/reward.wav'),
};

export const SOUND_NAMES = Object.keys(SOUND_SOURCES) as SoundName[];

/**
 * Loaded during boot so the first correct answer is not the one that stutters.
 * The rest are built lazily the first time they are asked for; they are all
 * celebration sounds that arrive at least a whole session in.
 */
export const PRELOADED_SOUNDS: readonly SoundName[] = [
  'tap',
  'select',
  'correct',
  'incorrect',
  'streak',
  'tick',
];

/**
 * How much of one effect is allowed to overlap itself. Taps can arrive faster
 * than they finish, so they get extra voices; a fanfare never needs a second.
 */
export const SOUND_VOICES: Partial<Record<SoundName, number>> = {
  tap: 3,
  select: 2,
  tick: 2,
  correct: 2,
  reward: 2,
};

export const DEFAULT_VOICES = 1;
