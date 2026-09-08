import { useEffect, useRef } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';
import type { Translator } from '../../i18n';

export interface ExitConfirmationOptions {
  /** True while the navigator still has somewhere to go back to. */
  canGoBack: () => boolean;
  t: Translator;
  /** Injected in tests; defaults to closing the app. */
  onExit?: () => void;
}

/**
 * Asks for confirmation before the hardware back button closes the app.
 *
 * The listener only intervenes when the navigator has nothing left to pop —
 * anywhere else, it returns `false` so React Navigation handles back exactly as
 * before. Tab `backBehavior` means back from a secondary tab returns to Home
 * first, so the prompt appears only on the true root.
 */
export function useExitConfirmation({ canGoBack, t, onExit }: ExitConfirmationOptions): void {
  // Keeping these in refs means the listener is registered once, rather than
  // being torn down and re-added on every language or navigation change.
  const canGoBackRef = useRef(canGoBack);
  const translateRef = useRef(t);
  const exitRef = useRef(onExit);
  const promptOpen = useRef(false);

  canGoBackRef.current = canGoBack;
  translateRef.current = t;
  exitRef.current = onExit;

  useEffect(() => {
    // iOS has no hardware back button, so there is nothing to intercept.
    if (Platform.OS === 'ios') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current()) return false;

      // Guard against a double tap stacking two dialogs.
      if (promptOpen.current) return true;
      promptOpen.current = true;

      const translate = translateRef.current;
      const close = (): void => {
        promptOpen.current = false;
      };

      Alert.alert(
        translate('common.exitTitle'),
        translate('common.exitBody'),
        [
          { text: translate('common.exitCancel'), style: 'cancel', onPress: close },
          {
            text: translate('common.exitConfirm'),
            style: 'destructive',
            onPress: () => {
              close();
              if (exitRef.current) exitRef.current();
              else BackHandler.exitApp();
            },
          },
        ],
        { cancelable: true, onDismiss: close },
      );

      // Returning true tells Android we consumed the press, so the app stays open.
      return true;
    });

    return () => subscription.remove();
  }, []);
}
