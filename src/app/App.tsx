import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { AppProvider, useApp, useTheme } from './providers/AppProvider';
import { RootNavigator } from './navigation/RootNavigator';
import { Button, Column, Loading, ProgressBar, Screen, Spacer, Toast, Txt } from '../ui/components';
import { useAppStore } from '../store';

/** Splash and boot progress — the only screen shown before storage is ready. */
function BootGate(): React.JSX.Element {
  const { boot, t, retryBoot } = useApp();
  const theme = useTheme();

  if (boot.status === 'error') {
    return (
      <Screen>
        <Spacer size={10} />
        <Column gap={4} style={{ alignItems: 'center' }}>
          <Txt size="display">🛠️</Txt>
          <Txt size="title" weight="bold" align="center">
            {t('boot.failed')}
          </Txt>
          <Txt size="small" color={theme.colors.textMuted} align="center">
            {t('boot.failedBody')}
          </Txt>
          {boot.error ? (
            <Txt size="caption" color={theme.colors.textMuted} align="center" mono>
              {boot.error}
            </Txt>
          ) : null}
          <Button label={t('common.retry')} onPress={retryBoot} />
        </Column>
      </Screen>
    );
  }

  if (boot.status === 'loading') {
    const stageLabel =
      boot.stage === 'migrating'
        ? t('boot.migrating')
        : boot.stage === 'seeding'
          ? t('boot.seeding')
          : boot.stage === 'recovering'
            ? t('boot.recovering')
            : t('boot.opening');
    const ratio =
      boot.stage === 'opening' ? 0.2 : boot.stage === 'migrating' ? 0.5 : boot.stage === 'seeding' ? 0.8 : 1;

    return (
      <Screen>
        <Spacer size={12} />
        <Column gap={4} style={{ alignItems: 'center' }}>
          <Txt size="display">🧮</Txt>
          <Txt size="heading" weight="bold">
            {t('common.appName')}
          </Txt>
          <Txt size="small" color={theme.colors.textMuted} align="center">
            {t('common.tagline')}
          </Txt>
          <View style={{ width: '80%' }}>
            <ProgressBar ratio={ratio} label={stageLabel} />
          </View>
          <Loading />
          {boot.detail ? (
            <Txt size="caption" color={theme.colors.textMuted}>
              {boot.detail}
            </Txt>
          ) : null}
        </Column>
      </Screen>
    );
  }

  return <RootNavigator />;
}

/** Floating toast host, rendered above navigation. */
function ToastHost(): React.JSX.Element | null {
  const theme = useTheme();
  const toasts = useAppStore((state) => state.toasts);
  const dismiss = useAppStore((state) => state.dismissToast);
  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: theme.spacing(4),
        right: theme.spacing(4),
        bottom: theme.spacing(20),
      }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          kind={toast.kind}
          title={toast.title}
          detail={toast.detail}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </View>
  );
}

function ThemedStatusBar(): React.JSX.Element {
  const theme = useTheme();
  return <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />;
}

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Seeding the metrics avoids a blank frame on the very first render. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <AppProvider>
          <ThemedStatusBar />
          <BootGate />
          <ToastHost />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
