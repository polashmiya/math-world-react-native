/**
 * The sound engine: a thin, forgiving wrapper around `expo-audio`.
 *
 * Two things shape the design.
 *
 * 1. **Audio is never load-bearing.** A missing native module, a device that
 *    refuses to open an audio session, a decode failure — none of them may
 *    break a lesson. Every call here is wrapped, and a failure downgrades the
 *    engine to silent for the rest of the session rather than throwing.
 * 2. **Effects overlap.** Answering fast means a tap and a chime land in the
 *    same frame, so each sound owns a small pool of players and round-robins
 *    through them instead of cutting itself off.
 */
import {
  DEFAULT_VOICES,
  SOUND_SOURCES,
  SOUND_VOICES,
  type SoundName,
} from './catalogue';

/** The slice of `expo-audio`'s `AudioPlayer` this module actually uses. */
interface Voice {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => Promise<void>;
  setPlaybackRate: (rate: number, quality?: string) => void;
  remove: () => void;
  volume: number;
  shouldCorrectPitch: boolean;
}

interface AudioModule {
  createAudioPlayer: (source: number) => Voice;
  setAudioModeAsync: (mode: Record<string, unknown>) => Promise<void>;
}

export interface PlayOptions {
  /**
   * Playback rate. Above 1 raises the pitch, which is how a rising combo is
   * built from a single sample rather than a dozen.
   */
  rate?: number;
  /** Extra attenuation for this one call, 0..1, on top of the user's volume. */
  gain?: number;
  /**
   * Absolute volume 0..1 for this call, in place of the user's master volume.
   * The settings preview needs to sound like the level being dragged to, and
   * that level has not been saved yet when the sample plays.
   */
  volume?: number;
  /**
   * Plays even while sound is switched off. Only the settings screen uses it,
   * so that switching sound back on can confirm itself out loud.
   */
  ignoreMute?: boolean;
}

/**
 * `expo-audio` is a native module, so it is absent under jest and on any
 * platform where it did not build. Resolving it lazily keeps the import graph
 * of the UI clean of hard native dependencies.
 */
function loadAudioModule(): AudioModule | null {
  try {
    // A plain `require`, not an import: an import would make the whole UI fail
    // to evaluate on a platform where the module never built.
    const module = require('expo-audio') as Partial<AudioModule>;
    if (typeof module?.createAudioPlayer !== 'function') return null;
    return module as AudioModule;
  } catch {
    return null;
  }
}

export class SoundEngine {
  private audio: AudioModule | null = null;
  private pools = new Map<SoundName, Voice[]>();
  private cursors = new Map<SoundName, number>();
  private started = false;
  /** Set once anything throws: the engine goes quiet instead of retrying. */
  private failed = false;

  private enabled = true;
  private volume = 0.8;

  /**
   * Rapid identical effects are collapsed: a screen that fires `correct` twice
   * in the same frame should sound like one answer, not a flam.
   */
  private lastPlayedAt = new Map<SoundName, number>();
  private static readonly REPEAT_GUARD_MS = 45;

  get isAvailable(): boolean {
    return this.audio !== null && !this.failed;
  }

  /**
   * Opens the audio session and builds the players that need to be ready
   * immediately. Safe to call more than once.
   */
  async start(preload: readonly SoundName[] = []): Promise<void> {
    if (this.started || this.failed) return;
    this.started = true;

    this.audio = loadAudioModule();
    if (!this.audio) return;

    try {
      // `playsInSilentMode: false` is deliberate: someone practising in a class
      // silences their phone and expects that to be the end of it, in-app
      // toggle or not. `mixWithOthers` is the mode meant for short effects —
      // it never takes audio focus, so a podcast keeps playing underneath.
      await this.audio.setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
        shouldRouteThroughEarpiece: false,
      });
    } catch {
      // A refused audio session is not fatal; playback may still work.
    }

    for (const name of preload) this.pool(name);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Master volume, 0..1. */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Plays an effect. Returns immediately — the caller is never made to wait on
   * audio, and never has to handle its failure.
   */
  play(name: SoundName, options: PlayOptions = {}): void {
    if (this.failed) return;
    if (!this.enabled && !options.ignoreMute) return;
    const master = options.volume ?? this.volume;
    if (master <= 0) return;

    const now = Date.now();
    const last = this.lastPlayedAt.get(name) ?? 0;
    if (now - last < SoundEngine.REPEAT_GUARD_MS) return;
    this.lastPlayedAt.set(name, now);

    const voices = this.pool(name);
    if (voices.length === 0) return;

    const cursor = (this.cursors.get(name) ?? 0) % voices.length;
    this.cursors.set(name, cursor + 1);
    const voice = voices[cursor];

    try {
      voice.volume = Math.max(0, Math.min(1, master * (options.gain ?? 1)));
      // Set unconditionally: a voice that played a rising combo once would
      // otherwise stay sharp for every ordinary press that reuses it. Pitch
      // correction is off because the pitch shift *is* the effect.
      voice.shouldCorrectPitch = false;
      voice.setPlaybackRate(Math.max(0.5, Math.min(2, options.rate ?? 1)));
      // Rewinding is what lets one player fire again before it has finished.
      // `seekTo` resolves a frame later, so playback is started from there
      // rather than racing the seek.
      voice.pause();
      void voice
        .seekTo(0)
        .then(() => voice.play())
        .catch(() => voice.play());
    } catch {
      this.failed = true;
    }
  }

  /** Releases every native player. Called when the app tears down. */
  release(): void {
    for (const voices of this.pools.values()) {
      for (const voice of voices) {
        try {
          voice.remove();
        } catch {
          // Already gone.
        }
      }
    }
    this.pools.clear();
    this.cursors.clear();
    this.started = false;
  }

  /** Builds (once) the pool of players backing one effect. */
  private pool(name: SoundName): Voice[] {
    const existing = this.pools.get(name);
    if (existing) return existing;
    if (!this.audio || this.failed) return [];

    const count = SOUND_VOICES[name] ?? DEFAULT_VOICES;
    const voices: Voice[] = [];
    try {
      for (let i = 0; i < count; i += 1) {
        voices.push(this.audio.createAudioPlayer(SOUND_SOURCES[name]));
      }
    } catch {
      this.failed = true;
      return [];
    }
    this.pools.set(name, voices);
    return voices;
  }
}
