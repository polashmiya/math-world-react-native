/**
 * Wires the sound engine to the user's settings and exposes `useSound()`.
 *
 * `useSound()` works with or without the provider above it — a component test
 * that renders a single button should not have to mount an audio stack — so
 * the fallback is a no-op player rather than a thrown error.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useApp } from '../../app/providers/AppProvider';
import { PRELOADED_SOUNDS, type SoundName } from './catalogue';
import { SoundEngine, type PlayOptions } from './engine';

export interface SoundApi {
  /** Fires an effect. Never throws, never awaits, silent when turned off. */
  play: (name: SoundName, options?: PlayOptions) => void;
  /** Reflects the user's setting, for UI that wants to show the state. */
  enabled: boolean;
  /** 0..1. */
  volume: number;
}

const SILENT: SoundApi = { play: () => undefined, enabled: false, volume: 0 };

const SoundContext = createContext<SoundApi>(SILENT);

export function SoundProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { settings } = useApp();
  const engine = useRef<SoundEngine | null>(null);
  if (engine.current === null) engine.current = new SoundEngine();

  const enabled = settings?.soundEnabled ?? true;
  const volume = (settings?.soundVolume ?? 80) / 100;

  useEffect(() => {
    const instance = engine.current;
    if (!instance) return;
    void instance.start(PRELOADED_SOUNDS);
    return () => instance.release();
  }, []);

  useEffect(() => {
    engine.current?.setEnabled(enabled);
    engine.current?.setVolume(volume);
  }, [enabled, volume]);

  useEffect(() => {
    // A chime that arrives after the user has switched apps is just noise, and
    // a queued effect can otherwise fire on the way back to the foreground.
    const subscription = AppState.addEventListener('change', (state) => {
      engine.current?.setEnabled(enabled && state === 'active');
    });
    return () => subscription.remove();
  }, [enabled]);

  const value = useMemo<SoundApi>(
    () => ({
      play: (name, options) => engine.current?.play(name, options),
      enabled,
      volume,
    }),
    [enabled, volume],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  return useContext(SoundContext);
}
