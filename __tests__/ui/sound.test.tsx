/**
 * The sound engine and the controls that drive it.
 *
 * `expo-audio` never loads under jest, so the engine is exercised against a
 * stub player. That is the point of these tests: the rules about when a sound
 * is allowed to play live in the engine, not in the native module.
 */
import { render, userEvent } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppContext, type AppContextValue } from '../../src/app/providers/AppProvider';
import { FONT_SCALES } from '../../src/core/constants/accessibility';
import { createTranslator } from '../../src/i18n';
import { createTheme } from '../../src/ui/theme';
import { Button, FontScalePicker, Toggle, VolumeControl } from '../../src/ui/components';
import { SoundEngine, streakRate, useSound } from '../../src/ui/sound';
import { SOUND_NAMES, SOUND_SOURCES } from '../../src/ui/sound/catalogue';

/* ── a stand-in for expo-audio's AudioPlayer ─────────────────────────────── */

interface StubVoice {
  plays: number;
  volume: number;
  rate: number;
  shouldCorrectPitch: boolean;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => Promise<void>;
  setPlaybackRate: (rate: number) => void;
  remove: () => void;
}

/**
 * Every player the engine builds during this file's run. The `mock` prefix is
 * what lets the hoisted factory below reach it.
 */
const mockVoices: StubVoice[] = [];
/** Flipped by the one test that needs the native module to look unavailable. */
const mockAudio = { available: true };

jest.mock('expo-audio', () => ({
  setAudioModeAsync: async () => undefined,
  get createAudioPlayer() {
    if (!mockAudio.available) return undefined;
    return () => {
      const voice: StubVoice = {
        plays: 0,
        volume: 1,
        rate: 1,
        shouldCorrectPitch: true,
        play: () => {
          voice.plays += 1;
        },
        pause: () => undefined,
        seekTo: async () => undefined,
        setPlaybackRate: (rate: number) => {
          voice.rate = rate;
        },
        remove: () => undefined,
      };
      mockVoices.push(voice);
      return voice;
    };
  },
}));

/** Waits for the microtask the engine uses to rewind before playing. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const totalPlays = (): number => mockVoices.reduce((total, voice) => total + voice.plays, 0);

async function startedEngine(): Promise<SoundEngine> {
  const engine = new SoundEngine();
  await engine.start();
  return engine;
}

describe('sound catalogue', () => {
  it('has a bundled asset for every name', () => {
    expect(SOUND_NAMES.length).toBeGreaterThan(0);
    for (const name of SOUND_NAMES) {
      expect(SOUND_SOURCES[name]).toBeDefined();
    }
  });

  it('raises the pitch as a streak grows, then stops', () => {
    expect(streakRate(1)).toBe(1);
    expect(streakRate(5)).toBeGreaterThan(streakRate(2));
    expect(streakRate(500)).toBeLessThanOrEqual(1.5);
  });
});

describe('sound engine', () => {
  beforeEach(() => {
    mockVoices.length = 0;
    mockAudio.available = true;
  });

  it('stays silent — and never throws — when the native module is missing', async () => {
    mockAudio.available = false;
    const engine = await startedEngine();
    expect(engine.isAvailable).toBe(false);
    expect(() => engine.play('correct')).not.toThrow();
    await flush();
    expect(totalPlays()).toBe(0);
  });

  it('plays an effect once the engine has started', async () => {
    const engine = await startedEngine();
    engine.play('correct');
    await flush();
    expect(totalPlays()).toBe(1);
  });

  it('plays nothing while sound is switched off, or at zero volume', async () => {
    const engine = await startedEngine();

    engine.setEnabled(false);
    engine.play('correct');
    await flush();
    expect(totalPlays()).toBe(0);

    // …unless the settings screen asks for a preview of what it is enabling.
    engine.play('correct', { ignoreMute: true });
    await flush();
    expect(totalPlays()).toBe(1);

    engine.setEnabled(true);
    engine.setVolume(0);
    engine.play('incorrect');
    await flush();
    expect(totalPlays()).toBe(1);
  });

  it('applies the master volume, and lets one call override it', async () => {
    const engine = await startedEngine();
    engine.setVolume(0.5);

    // A pool builds all of its voices at once, so read the ones that sounded
    // rather than the last one created.
    engine.play('correct');
    await flush();
    expect(mockVoices.filter((voice) => voice.plays > 0).map((voice) => voice.volume)).toEqual([0.5]);

    engine.play('incorrect', { volume: 0.2 });
    await flush();
    expect(mockVoices.filter((voice) => voice.plays > 0).map((voice) => voice.volume)).toEqual([
      0.5, 0.2,
    ]);
  });

  it('resets the playback rate so a raised streak does not linger', async () => {
    const engine = await startedEngine();

    engine.play('streak', { rate: 1.4 });
    await flush();
    const raised = mockVoices[mockVoices.length - 1];
    expect(raised.rate).toBeCloseTo(1.4);
    expect(raised.shouldCorrectPitch).toBe(false);

    // `streak` has a single voice, so the next play reuses this same player.
    await new Promise((resolve) => setTimeout(resolve, 60));
    engine.play('streak');
    await flush();
    expect(raised.rate).toBe(1);
  });

  it('collapses a repeat fired in the same frame', async () => {
    const engine = await startedEngine();
    engine.play('correct');
    engine.play('correct');
    await flush();
    expect(totalPlays()).toBe(1);
  });

  it('spreads rapid taps across a pool so they can overlap', async () => {
    const engine = await startedEngine();
    // `tap` declares three voices; the guard is on time, so wait it out.
    for (let i = 0; i < 3; i += 1) {
      engine.play('tap');
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    await flush();
    expect(mockVoices.filter((voice) => voice.plays > 0)).toHaveLength(3);
  });
});

/* ── the controls ────────────────────────────────────────────────────────── */

function makeContext(overrides: Partial<AppContextValue> = {}): AppContextValue {
  return {
    boot: { status: 'ready', stage: 'ready' },
    services: null,
    profile: null,
    settings: null,
    theme: createTheme({ mode: 'light' }),
    t: createTranslator('en'),
    refreshUser: async () => undefined,
    retryBoot: () => undefined,
    ...overrides,
  };
}

async function renderWithApp(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <AppContext.Provider value={makeContext()}>{ui}</AppContext.Provider>
    </SafeAreaProvider>,
  );
}

describe('sound in the component tree', () => {
  it('is a no-op without a provider, so a bare component still renders', async () => {
    function Probe(): React.JSX.Element {
      const { play, enabled } = useSound();
      return (
        <Button label={'sound:' + String(enabled)} onPress={() => play('correct')} />
      );
    }
    const { getByText } = await renderWithApp(<Probe />);
    await userEvent.press(getByText('sound:false'));
  });

  it('presses a button without a sound provider mounted', async () => {
    const onPress = jest.fn();
    const { getByText } = await renderWithApp(<Button label="Check" onPress={onPress} />);
    await userEvent.press(getByText('Check'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('still flips a toggle whose sound is suppressed', async () => {
    const onChange = jest.fn();
    const { getByText } = await renderWithApp(
      <Toggle label="Sound effects" value={false} sound={null} onChange={onChange} />,
    );
    await userEvent.press(getByText('Sound effects'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('text size picker', () => {
  it('offers every size and reports the one chosen', async () => {
    const onChange = jest.fn();
    const { getAllByText, getByText } = await renderWithApp(
      <FontScalePicker value="medium" onChange={onChange} labelFor={(scale) => scale} />,
    );
    expect(getAllByText('A')).toHaveLength(FONT_SCALES.length);

    await userEvent.press(getByText('xLarge'));
    expect(onChange).toHaveBeenCalledWith('xLarge');
  });

  it('draws each sample at the size it selects', async () => {
    const { getAllByText } = await renderWithApp(
      <FontScalePicker value="medium" onChange={() => undefined} labelFor={(scale) => scale} />,
    );
    const sizes = getAllByText('A').map((node) => {
      const style = node.props.style;
      const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
      return flat.fontSize as number;
    });
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
    }
  });
});

describe('volume control', () => {
  it('steps up and down, and stops at the ends', async () => {
    const onChange = jest.fn();
    const { getByText } = await renderWithApp(
      <VolumeControl label="Volume" offLabel="Silent" value={100} onChange={onChange} />,
    );
    // Already at the top: the louder button is disabled and changes nothing.
    await userEvent.press(getByText('🔊'));
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.press(getByText('🔉'));
    expect(onChange).toHaveBeenCalledWith(90);
  });

  it('names zero rather than showing 0%', async () => {
    const { getByText } = await renderWithApp(
      <VolumeControl label="Volume" offLabel="Silent" value={0} onChange={() => undefined} />,
    );
    expect(getByText('Silent')).toBeTruthy();
  });
});
