import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import type { BootstrapStage } from '../../data/database/bootstrap';
import { bootstrapDatabase } from '../../data/database/bootstrap';
import { createServices, type AppServices } from '../../domain/services';
import type { UserProfile, UserSettings } from '../../domain/models';
import { createTranslator, type Translator } from '../../i18n';
import { createTheme, type Theme } from '../../ui/theme';
import { useAppStore } from '../../store';

export interface BootState {
  status: 'loading' | 'ready' | 'error';
  stage: BootstrapStage;
  detail?: string;
  error?: string;
  schemaVersion?: number;
  recovered?: boolean;
  contentSeeded?: number;
}

export interface AppContextValue {
  boot: BootState;
  services: AppServices | null;
  profile: UserProfile | null;
  settings: UserSettings | null;
  theme: Theme;
  t: Translator;
  /** Re-reads the profile and settings after a change. */
  refreshUser: () => Promise<void>;
  retryBoot: () => void;
}

/**
 * Exported so component tests can render a screen with a stubbed theme and
 * translator instead of booting the whole database.
 */
export const AppContext = createContext<AppContextValue | null>(null);

/**
 * Boots the offline database, builds the services and exposes the theme and
 * translator. Everything below this provider can assume storage is ready.
 */
export function AppProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const systemScheme = useColorScheme();
  const [attempt, setAttempt] = useState(0);
  const [boot, setBoot] = useState<BootState>({ status: 'loading', stage: 'opening' });
  const [services, setServices] = useState<AppServices | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const setStoreSettings = useAppStore((state) => state.setSettings);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      setBoot({ status: 'loading', stage: 'opening' });
      try {
        const result = await bootstrapDatabase({
          onProgress: (stage, detail) => {
            if (!cancelled) setBoot((prev) => ({ ...prev, status: 'loading', stage, detail }));
          },
        });
        if (cancelled) return;

        const built = createServices(result.repositories);
        const [loadedProfile, loadedSettings] = await Promise.all([
          built.repositories.users.getProfile(),
          built.repositories.users.getSettings(),
        ]);
        if (cancelled) return;

        setServices(built);
        setProfile(loadedProfile);
        setSettings(loadedSettings);
        setStoreSettings(loadedSettings);
        setBoot({
          status: 'ready',
          stage: 'ready',
          schemaVersion: result.schemaVersion,
          recovered: result.recovered,
          contentSeeded: result.seed.totalInserted,
        });
      } catch (error) {
        if (cancelled) return;
        setBoot({
          status: 'error',
          stage: 'opening',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [attempt, setStoreSettings]);

  const refreshUser = useCallback(async () => {
    if (!services) return;
    const [nextProfile, nextSettings] = await Promise.all([
      services.repositories.users.getProfile(),
      services.repositories.users.getSettings(),
    ]);
    setProfile(nextProfile);
    setSettings(nextSettings);
    setStoreSettings(nextSettings);
  }, [services, setStoreSettings]);

  const retryBoot = useCallback(() => setAttempt((value) => value + 1), []);

  const theme = useMemo(() => {
    const preferred = settings?.themeMode ?? 'system';
    const mode = preferred === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preferred;
    return createTheme({
      mode,
      largeText: settings?.largeText,
      highContrast: settings?.highContrast,
      reduceAnimations: settings?.reduceAnimations,
    });
  }, [settings, systemScheme]);

  const t = useMemo(
    () =>
      createTranslator(settings?.language ?? 'bn', {
        banglaDigits: settings?.showBanglaDigits ?? true,
      }),
    [settings],
  );

  const value = useMemo<AppContextValue>(
    () => ({ boot, services, profile, settings, theme, t, refreshUser, retryBoot }),
    [boot, services, profile, settings, theme, t, refreshUser, retryBoot],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}

/** Services are guaranteed once boot has succeeded. */
export function useServices(): AppServices {
  const { services } = useApp();
  if (!services) throw new Error('Services are not ready yet');
  return services;
}

export function useTheme(): Theme {
  return useApp().theme;
}

export function useT(): Translator {
  return useApp().t;
}

export function useLanguage(): 'bn' | 'en' {
  return useApp().settings?.language ?? 'bn';
}
