/**
 * Generates every sound effect in `assets/sounds/` from scratch.
 *
 * The app ships fully offline, so the audio is synthesised here rather than
 * pulled from a sound library: short additive-synth bells, blips and sweeps,
 * written as 16-bit mono WAV. Run `npm run sounds:build` after editing a recipe.
 *
 * The house style is deliberately Duolingo-shaped — warm sine-based bells on a
 * major scale for anything positive, a soft low "bonk" for anything wrong, and
 * clicks quiet enough to sit under a hundred taps an hour without grating.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22050;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

/* ── note helpers ─────────────────────────────────────────────────────────── */

const SEMITONE = Math.pow(2, 1 / 12);
const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Scientific pitch (`A4`, `C#5`, `Eb3`) to hertz. */
function hz(name) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) throw new Error('bad note: ' + name);
  const [, letter, accidental, octave] = match;
  const semitones =
    NOTE_INDEX[letter] +
    (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) +
    (Number(octave) - 4) * 12;
  return 440 * Math.pow(SEMITONE, semitones - 9);
}

/* ── voices ───────────────────────────────────────────────────────────────── */

/**
 * Harmonic recipes. Each entry is [multiple of the fundamental, relative gain];
 * more high partials read as brighter and more percussive.
 */
const TIMBRES = {
  // Soft glass bell — the positive-feedback voice.
  bell: [[1, 1], [2, 0.3], [3, 0.12], [4.2, 0.06]],
  // Rounder and darker, for chimes that need to feel warm rather than bright.
  warm: [[1, 1], [2, 0.18], [3, 0.05]],
  // Wooden marimba knock, used for taps.
  wood: [[1, 1], [2.7, 0.22], [5.1, 0.08]],
  // Hollow and low: the "wrong answer" bonk.
  bonk: [[1, 1], [1.5, 0.35], [2, 0.2], [2.98, 0.1]],
  // Almost pure — clean UI blips that must not draw attention.
  pure: [[1, 1], [2, 0.06]],
};

/**
 * Renders one note into `buffer` at `at` seconds.
 *
 * The envelope is a short linear attack into an exponential decay, which is
 * what makes a synthesised tone read as a struck instrument rather than a beep.
 */
function addNote(buffer, at, { freq, dur, gain = 0.6, timbre = 'bell', attack = 0.006, bend = 0, vibrato = 0 }) {
  const partials = TIMBRES[timbre];
  const start = Math.round(at * SAMPLE_RATE);
  const length = Math.round(dur * SAMPLE_RATE);
  const attackSamples = Math.max(1, Math.round(attack * SAMPLE_RATE));
  // Normalise so a rich timbre is not louder than a plain one.
  const norm = partials.reduce((sum, [, amp]) => sum + amp, 0);

  // Phase is integrated per sample so pitch bends stay continuous.
  const phases = partials.map(() => 0);

  for (let i = 0; i < length; i += 1) {
    const index = start + i;
    if (index >= buffer.length) break;
    const progress = i / length;

    const envelope =
      (i < attackSamples ? i / attackSamples : 1) * Math.exp(-progress * 5.2) * (1 - progress * 0.15);

    // `bend` is the multiplier reached at the end of the note (1.5 = up a fifth).
    const bendFactor = bend ? Math.pow(bend, progress) : 1;
    const vibratoFactor = vibrato ? 1 + Math.sin(progress * dur * vibrato * 2 * Math.PI) * 0.012 : 1;
    const base = freq * bendFactor * vibratoFactor;

    let sample = 0;
    for (let p = 0; p < partials.length; p += 1) {
      const [multiple, amp] = partials[p];
      phases[p] += (2 * Math.PI * base * multiple) / SAMPLE_RATE;
      sample += Math.sin(phases[p]) * amp;
    }
    buffer[index] += (sample / norm) * envelope * gain;
  }
}

/** Filtered-noise sweep — the airy "whoosh" under starts and transitions. */
function addSweep(buffer, at, { dur, from, to, gain = 0.25 }) {
  const start = Math.round(at * SAMPLE_RATE);
  const length = Math.round(dur * SAMPLE_RATE);
  let phase = 0;
  let smoothed = 0;
  let seed = 20260910;

  for (let i = 0; i < length; i += 1) {
    const index = start + i;
    if (index >= buffer.length) break;
    const progress = i / length;

    // A tiny deterministic PRNG keeps regenerated assets byte-identical.
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = (seed / 0xffffffff) * 2 - 1;
    // One-pole lowpass turns white noise into wind rather than static.
    smoothed += (noise - smoothed) * 0.28;

    const freq = from * Math.pow(to / from, progress);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const envelope = Math.sin(Math.PI * progress) * gain;
    buffer[index] += (Math.sin(phase) * 0.55 + smoothed * 0.45) * envelope;
  }
}

/* ── file writing ─────────────────────────────────────────────────────────── */

function writeWav(name, buffer, level) {
  // Trailing fade so a truncated decay never clicks on the last sample.
  const fade = Math.min(buffer.length, Math.round(0.012 * SAMPLE_RATE));
  for (let i = 0; i < fade; i += 1) {
    buffer[buffer.length - 1 - i] *= i / fade;
  }

  // Normalise to full scale, then drop to the recipe's own loudness. Mixing
  // relative gains alone would not survive the normalisation, and a tap that
  // arrives as loud as the level-up fanfare is what makes an app exhausting.
  let peak = 0;
  for (const value of buffer) peak = Math.max(peak, Math.abs(value));
  const scale = peak > 0 ? (0.95 * level) / peak : 1;

  const pcm = Buffer.alloc(buffer.length * 2);
  for (let i = 0; i < buffer.length; i += 1) {
    const value = Math.tanh(buffer[i] * scale);
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value * 32767))), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // format: PCM
  header.writeUInt16LE(1, 22); // channels: mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  const file = join(OUT_DIR, name + '.wav');
  writeFileSync(file, Buffer.concat([header, pcm]));
  return { name, bytes: header.length + pcm.length };
}

/**
 * `level` is the finished loudness of this effect relative to the loudest one
 * in the app (1.0). It is the single knob for how much a sound intrudes.
 */
function render(name, seconds, level, build) {
  const buffer = new Float64Array(Math.round(seconds * SAMPLE_RATE));
  build(buffer);
  return writeWav(name, buffer, level);
}

/* ── the catalogue ────────────────────────────────────────────────────────── */

const RECIPES = {
  /** Every ordinary button. Quiet and wooden so it disappears into the tap. */
  tap: () =>
    render('tap', 0.09, 0.3, (b) => {
      addNote(b, 0, { freq: hz('A5'), dur: 0.085, gain: 0.34, timbre: 'wood', attack: 0.001 });
    }),

  /** Choosing an option — a touch brighter than a plain tap. */
  select: () =>
    render('select', 0.12, 0.34, (b) => {
      addNote(b, 0, { freq: hz('E5'), dur: 0.11, gain: 0.38, timbre: 'pure', attack: 0.002 });
    }),

  /** Flipping a switch. Two blips, up for on; the app plays it either way. */
  toggle: () =>
    render('toggle', 0.16, 0.34, (b) => {
      addNote(b, 0, { freq: hz('C5'), dur: 0.07, gain: 0.34, timbre: 'pure', attack: 0.002 });
      addNote(b, 0.06, { freq: hz('G5'), dur: 0.09, gain: 0.32, timbre: 'pure', attack: 0.002 });
    }),

  /** Correct answer: the rising major third everyone recognises as "yes". */
  correct: () =>
    render('correct', 0.6, 0.8, (b) => {
      addNote(b, 0, { freq: hz('E5'), dur: 0.22, gain: 0.55, timbre: 'bell' });
      addNote(b, 0.09, { freq: hz('A5'), dur: 0.45, gain: 0.6, timbre: 'bell' });
      addNote(b, 0.09, { freq: hz('C#6'), dur: 0.42, gain: 0.22, timbre: 'bell' });
    }),

  /** Wrong answer: low, soft and short. Discouraging, never punishing. */
  incorrect: () =>
    render('incorrect', 0.45, 0.72, (b) => {
      addNote(b, 0, { freq: hz('F3'), dur: 0.3, gain: 0.55, timbre: 'bonk', attack: 0.004 });
      addNote(b, 0.07, { freq: hz('C3'), dur: 0.34, gain: 0.45, timbre: 'bonk', attack: 0.006, bend: 0.94 });
    }),

  /** A combo climbing — pitch rises with the streak via the playback rate. */
  streak: () =>
    render('streak', 0.5, 0.7, (b) => {
      addNote(b, 0, { freq: hz('A5'), dur: 0.13, gain: 0.45, timbre: 'bell' });
      addNote(b, 0.07, { freq: hz('C#6'), dur: 0.14, gain: 0.45, timbre: 'bell' });
      addNote(b, 0.14, { freq: hz('E6'), dur: 0.3, gain: 0.5, timbre: 'bell' });
    }),

  /** Hint revealed: a small inquisitive pop. */
  hint: () =>
    render('hint', 0.22, 0.44, (b) => {
      addNote(b, 0, { freq: hz('D5'), dur: 0.2, gain: 0.4, timbre: 'warm', attack: 0.004, bend: 1.35 });
    }),

  /** The worked solution opening. Neutral, informative. */
  reveal: () =>
    render('reveal', 0.35, 0.48, (b) => {
      addNote(b, 0, { freq: hz('G4'), dur: 0.16, gain: 0.4, timbre: 'warm' });
      addNote(b, 0.08, { freq: hz('D5'), dur: 0.26, gain: 0.4, timbre: 'warm' });
    }),

  /** Starting a session or a game: a short upward whoosh with a bell on top. */
  start: () =>
    render('start', 0.45, 0.58, (b) => {
      addSweep(b, 0, { dur: 0.3, from: 320, to: 1250, gain: 0.3 });
      addNote(b, 0.22, { freq: hz('D5'), dur: 0.22, gain: 0.42, timbre: 'bell' });
      addNote(b, 0.22, { freq: hz('A5'), dur: 0.24, gain: 0.3, timbre: 'bell' });
    }),

  /** Finishing a run: a settled three-note resolve. */
  complete: () =>
    render('complete', 0.95, 0.85, (b) => {
      addNote(b, 0, { freq: hz('G4'), dur: 0.24, gain: 0.5, timbre: 'warm' });
      addNote(b, 0.11, { freq: hz('C5'), dur: 0.28, gain: 0.52, timbre: 'warm' });
      addNote(b, 0.22, { freq: hz('E5'), dur: 0.7, gain: 0.55, timbre: 'bell' });
      addNote(b, 0.22, { freq: hz('G5'), dur: 0.65, gain: 0.3, timbre: 'bell' });
    }),

  /** A flawless run — the same resolve with a sparkle run over the top. */
  perfect: () =>
    render('perfect', 1.2, 0.92, (b) => {
      const run = ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'];
      run.forEach((note, i) => {
        addNote(b, i * 0.065, { freq: hz(note), dur: 0.28, gain: 0.4, timbre: 'bell' });
      });
      addNote(b, 0.42, { freq: hz('C6'), dur: 0.72, gain: 0.5, timbre: 'bell' });
      addNote(b, 0.42, { freq: hz('G6'), dur: 0.6, gain: 0.22, timbre: 'bell' });
    }),

  /** Level up: a full major arpeggio, the loudest thing in the app. */
  levelUp: () =>
    render('levelUp', 1.25, 0.95, (b) => {
      ['C5', 'E5', 'G5', 'C6'].forEach((note, i) => {
        addNote(b, i * 0.09, { freq: hz(note), dur: 0.3, gain: 0.48, timbre: 'bell' });
      });
      addNote(b, 0.38, { freq: hz('E6'), dur: 0.8, gain: 0.5, timbre: 'bell' });
      addNote(b, 0.38, { freq: hz('G6'), dur: 0.75, gain: 0.28, timbre: 'bell' });
      addNote(b, 0.38, { freq: hz('C5'), dur: 0.85, gain: 0.3, timbre: 'warm' });
    }),

  /** Achievement unlocked: a two-bar fanfare. */
  achievement: () =>
    render('achievement', 1.4, 0.95, (b) => {
      addNote(b, 0, { freq: hz('G4'), dur: 0.16, gain: 0.45, timbre: 'bell' });
      addNote(b, 0.1, { freq: hz('C5'), dur: 0.16, gain: 0.48, timbre: 'bell' });
      addNote(b, 0.2, { freq: hz('E5'), dur: 0.18, gain: 0.5, timbre: 'bell' });
      addNote(b, 0.32, { freq: hz('G5'), dur: 0.9, gain: 0.55, timbre: 'bell' });
      addNote(b, 0.32, { freq: hz('C6'), dur: 0.85, gain: 0.35, timbre: 'bell' });
      addNote(b, 0.55, { freq: hz('E6'), dur: 0.7, gain: 0.3, timbre: 'bell' });
    }),

  /** A new high score. Brighter and cheekier than `complete`. */
  record: () =>
    render('record', 1.1, 0.9, (b) => {
      ['E5', 'G5', 'B5', 'E6'].forEach((note, i) => {
        addNote(b, i * 0.075, { freq: hz(note), dur: 0.26, gain: 0.45, timbre: 'bell' });
      });
      addNote(b, 0.34, { freq: hz('B5'), dur: 0.7, gain: 0.5, timbre: 'bell', vibrato: 5 });
    }),

  /** Countdown tick for the last few seconds. Deliberately tiny. */
  tick: () =>
    render('tick', 0.06, 0.26, (b) => {
      addNote(b, 0, { freq: hz('E6'), dur: 0.055, gain: 0.3, timbre: 'pure', attack: 0.001 });
    }),

  /** The timer running out. Three descending beeps. */
  timeUp: () =>
    render('timeUp', 0.75, 0.8, (b) => {
      addNote(b, 0, { freq: hz('A4'), dur: 0.17, gain: 0.5, timbre: 'pure', attack: 0.003 });
      addNote(b, 0.18, { freq: hz('F4'), dur: 0.17, gain: 0.5, timbre: 'pure', attack: 0.003 });
      addNote(b, 0.36, { freq: hz('D4'), dur: 0.34, gain: 0.52, timbre: 'warm', attack: 0.003 });
    }),

  /** A skill or lesson unlocking. */
  unlock: () =>
    render('unlock', 0.7, 0.64, (b) => {
      addSweep(b, 0, { dur: 0.22, from: 600, to: 1800, gain: 0.18 });
      addNote(b, 0.12, { freq: hz('D5'), dur: 0.18, gain: 0.45, timbre: 'bell' });
      addNote(b, 0.22, { freq: hz('A5'), dur: 0.45, gain: 0.5, timbre: 'bell' });
    }),

  /** XP or a coin landing. */
  reward: () =>
    render('reward', 0.5, 0.58, (b) => {
      addNote(b, 0, { freq: hz('B5'), dur: 0.12, gain: 0.4, timbre: 'bell' });
      addNote(b, 0.06, { freq: hz('E6'), dur: 0.36, gain: 0.42, timbre: 'bell' });
    }),

  /** Something is not allowed — an empty answer, a locked item. */
  blocked: () =>
    render('blocked', 0.25, 0.5, (b) => {
      addNote(b, 0, { freq: hz('D3'), dur: 0.2, gain: 0.4, timbre: 'bonk', attack: 0.004 });
    }),
};

/* ── entry point ──────────────────────────────────────────────────────────── */

mkdirSync(OUT_DIR, { recursive: true });

let total = 0;
const written = [];
for (const build of Object.values(RECIPES)) {
  const result = build();
  total += result.bytes;
  written.push(result.name + ' (' + Math.round(result.bytes / 1024) + ' KB)');
}

console.log('Wrote ' + written.length + ' sounds to assets/sounds:');
console.log('  ' + written.join(', '));
console.log('Total ' + Math.round(total / 1024) + ' KB');
