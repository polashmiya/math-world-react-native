import { render } from '@testing-library/react-native';
import React from 'react';
import { Alert, BackHandler, Text } from 'react-native';
import { useExitConfirmation } from '../../src/app/navigation/useExitConfirmation';
import { createTranslator } from '../../src/i18n';

type BackHandlerCallback = () => boolean;

/**
 * Captures the `hardwareBackPress` listener the hook registers, so the test can
 * fire it the way Android would.
 */
function captureBackHandler(): { press: () => boolean; removed: () => boolean } {
  let callback: BackHandlerCallback | null = null;
  let wasRemoved = false;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((
    _event: string,
    handler: BackHandlerCallback,
  ) => {
    callback = handler;
    return {
      remove: () => {
        wasRemoved = true;
      },
    };
  }) as typeof BackHandler.addEventListener);

  return {
    press: () => {
      if (!callback) throw new Error('no hardwareBackPress listener was registered');
      return callback();
    },
    removed: () => wasRemoved,
  };
}

function Harness({ canGoBack, onExit }: { canGoBack: boolean; onExit?: () => void }) {
  useExitConfirmation({ canGoBack: () => canGoBack, t: createTranslator('en'), onExit });
  return <Text>ready</Text>;
}

describe('back-to-exit confirmation', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stays out of the way while there is somewhere to go back to', async () => {
    const back = captureBackHandler();
    await render(<Harness canGoBack />);

    // Returning false hands the press to React Navigation, as before.
    expect(back.press()).toBe(false);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('asks for confirmation instead of closing on the root screen', async () => {
    const back = captureBackHandler();
    await render(<Harness canGoBack={false} />);

    // Returning true means Android does not close the app.
    expect(back.press()).toBe(true);
    expect(alertSpy).toHaveBeenCalledTimes(1);

    const [title, body, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Close Math World?');
    expect(body).toBe('Your progress is already saved on this device.');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].text).toBe('Stay');
    expect(buttons[0].style).toBe('cancel');
    expect(buttons[1].text).toBe('Close');
  });

  it('closes the app only when the user confirms', async () => {
    const onExit = jest.fn();
    const back = captureBackHandler();
    await render(<Harness canGoBack={false} onExit={onExit} />);

    back.press();
    const buttons = alertSpy.mock.calls[0][2];

    // Choosing "Stay" leaves the app running.
    buttons[0].onPress?.();
    expect(onExit).not.toHaveBeenCalled();

    // Choosing "Close" exits.
    back.press();
    alertSpy.mock.calls[1][2][1].onPress?.();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('does not stack a second dialog on a double tap', async () => {
    const back = captureBackHandler();
    await render(<Harness canGoBack={false} />);

    expect(back.press()).toBe(true);
    expect(back.press()).toBe(true);
    expect(alertSpy).toHaveBeenCalledTimes(1);

    // Dismissing lets the prompt open again next time.
    const options = alertSpy.mock.calls[0][3];
    options.onDismiss?.();
    back.press();
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });

  it('prompts in Bangla when that is the language', async () => {
    let callback: BackHandlerCallback | null = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((
      _event: string,
      handler: BackHandlerCallback,
    ) => {
      callback = handler;
      return { remove: () => undefined };
    }) as typeof BackHandler.addEventListener);

    function BanglaHarness() {
      useExitConfirmation({ canGoBack: () => false, t: createTranslator('bn') });
      return <Text>ready</Text>;
    }
    await render(<BanglaHarness />);
    callback!();

    expect(alertSpy.mock.calls[0][0]).toBe('ম্যাথ ওয়ার্ল্ড বন্ধ করবেন?');
    expect(alertSpy.mock.calls[0][2][1].text).toBe('বন্ধ করুন');
  });

  it('removes its listener on unmount', async () => {
    const back = captureBackHandler();
    const view = await render(<Harness canGoBack={false} />);
    await view.unmount();
    expect(back.removed()).toBe(true);
  });
});
