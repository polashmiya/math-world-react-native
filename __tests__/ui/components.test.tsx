import { render, userEvent } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppContext, type AppContextValue } from '../../src/app/providers/AppProvider';
import { FONT_SCALES } from '../../src/core/constants/accessibility';
import { createTranslator } from '../../src/i18n';
import { createTheme } from '../../src/ui/theme';
import {
  Badge,
  Button,
  Card,
  DifficultyPill,
  MasteryRing,
  MathText,
  OptionButton,
  ProgressBar,
  SolutionSteps,
  Toggle,
  Txt,
} from '../../src/ui/components';

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

/** Renders a component with a stubbed app context — no database boot needed. */
async function renderWithApp(ui: React.ReactElement, overrides: Partial<AppContextValue> = {}) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <AppContext.Provider value={makeContext(overrides)}>{ui}</AppContext.Provider>
    </SafeAreaProvider>,
  );
}

describe('design system', () => {
  it('renders text and a monospace maths expression', async () => {
    const { getByText } = await renderWithApp(
      <>
        <Txt>Hello</Txt>
        <MathText>{'a² + b² = c²'}</MathText>
      </>,
    );
    expect(getByText('Hello')).toBeTruthy();
    expect(getByText('a² + b² = c²')).toBeTruthy();
  });

  it('calls a button handler', async () => {
    const onPress = jest.fn();
    const { getByText } = await renderWithApp(<Button label="Check" onPress={onPress} />);
    await userEvent.press(getByText('Check'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call a disabled button handler', async () => {
    const onPress = jest.fn();
    const { getByText } = await renderWithApp(<Button label="Nope" onPress={onPress} disabled />);
    await userEvent.press(getByText('Nope'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('makes a card pressable when it has a handler', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await renderWithApp(
      <Card onPress={onPress} accessibilityLabel="card">
        <Txt>Tap me</Txt>
      </Card>,
    );
    await userEvent.press(getByLabelText('card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes progress to accessibility services', async () => {
    const { getByRole, getByText } = await renderWithApp(<ProgressBar ratio={0.42} label="Today" />);
    expect(getByRole('progressbar').props.accessibilityValue).toEqual({ now: 42, min: 0, max: 100 });
    expect(getByText('Today')).toBeTruthy();
  });

  it('clamps an out-of-range progress ratio', async () => {
    const { getByRole } = await renderWithApp(<ProgressBar ratio={5} />);
    expect(getByRole('progressbar').props.accessibilityValue.now).toBe(100);
    const { getByRole: getNegative } = await renderWithApp(<ProgressBar ratio={-3} />);
    expect(getNegative('progressbar').props.accessibilityValue.now).toBe(0);
  });

  it('shows mastery as a rounded percentage', async () => {
    const { getByText } = await renderWithApp(<MasteryRing ratio={0.815} />);
    expect(getByText('82%')).toBeTruthy();
  });

  it('labels difficulty for screen readers', async () => {
    const { getByLabelText } = await renderWithApp(<DifficultyPill difficulty={6} />);
    expect(getByLabelText('Difficulty 6 of 9')).toBeTruthy();
  });

  it('renders a badge', async () => {
    const { getByText } = await renderWithApp(<Badge label="BCS" />);
    expect(getByText('BCS')).toBeTruthy();
  });

  it('toggles a switch and reports its state', async () => {
    const onChange = jest.fn();
    const { getByRole } = await renderWithApp(<Toggle label="Large text" value={false} onChange={onChange} />);
    const toggle = getByRole('switch');
    expect(toggle.props.accessibilityState.checked).toBe(false);
    await userEvent.press(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('question components', () => {
  it('renders an option with its letter and text', async () => {
    const onPress = jest.fn();
    const { getByText, getByLabelText } = await renderWithApp(
      <OptionButton label="B" text="195" onPress={onPress} />,
    );
    expect(getByText('B')).toBeTruthy();
    expect(getByText('195')).toBeTruthy();
    await userEvent.press(getByLabelText('B. 195'));
    expect(onPress).toHaveBeenCalled();
  });

  it('marks the correct and wrong options after feedback', async () => {
    const { getByText, getByLabelText } = await renderWithApp(
      <>
        <OptionButton label="A" text="360" onPress={() => undefined} state="correct" disabled />
        <OptionButton label="B" text="180" onPress={() => undefined} state="wrong" disabled />
      </>,
    );
    expect(getByText('✓')).toBeTruthy();
    expect(getByText('✕')).toBeTruthy();
    expect(getByLabelText('A. 360').props.accessibilityState.disabled).toBe(true);
  });

  it('renders numbered solution steps with the answer', async () => {
    const { getByText } = await renderWithApp(
      <SolutionSteps
        steps={[
          { order: 1, detail: '40% of x = 120, so x = 300', title: 'Find the whole' },
          { order: 2, detail: '65% of 300 = 195', expression: '0.65 × 300 = 195' },
        ]}
        explanation="Find the whole first."
        answerLabel="Answer"
        answer="195"
      />,
    );
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('Find the whole')).toBeTruthy();
    expect(getByText('40% of x = 120, so x = 300')).toBeTruthy();
    expect(getByText('0.65 × 300 = 195')).toBeTruthy();
    expect(getByText('Answer')).toBeTruthy();
    expect(getByText('195')).toBeTruthy();
    expect(getByText('Find the whole first.')).toBeTruthy();
  });
});

describe('theme and accessibility', () => {
  it('scales every font size with the chosen text size', () => {
    const sizes = FONT_SCALES.map((scale) => createTheme({ mode: 'light', fontScale: scale }));
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i].font.size('body')).toBeGreaterThan(sizes[i - 1].font.size('body'));
      expect(sizes[i].font.size('math')).toBeGreaterThan(sizes[i - 1].font.size('math'));
      expect(sizes[i].font.size('caption')).toBeGreaterThanOrEqual(sizes[i - 1].font.size('caption'));
    }
    expect(createTheme({ mode: 'light' }).fontScale).toBe('medium');
  });

  it('has a distinct dark palette', () => {
    const light = createTheme({ mode: 'light' });
    const dark = createTheme({ mode: 'dark' });
    expect(dark.colors.background).not.toBe(light.colors.background);
    expect(dark.colors.text).not.toBe(light.colors.text);
  });

  it('applies a high-contrast override', () => {
    const normal = createTheme({ mode: 'light' });
    const contrast = createTheme({ mode: 'light', highContrast: true });
    expect(contrast.colors.text).toBe('#000000');
    expect(contrast.colors.border).not.toBe(normal.colors.border);
  });

  it('renders larger text in the large-text theme', async () => {
    const large = createTheme({ mode: 'light', fontScale: 'xLarge' });
    const { getByText } = await renderWithApp(<Txt>Scaled</Txt>, { theme: large });
    const style = getByText('Scaled').props.style;
    const flattened = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    expect(flattened.fontSize).toBe(large.font.size('body'));
  });

  it('renders the same component in Bangla', async () => {
    const { getByText } = await renderWithApp(<Txt>{createTranslator('bn')('practice.title')}</Txt>);
    expect(getByText('অভ্যাস')).toBeTruthy();
  });

  it('renders Bangla numerals when the language is Bangla', async () => {
    const t = createTranslator('bn');
    const { getByText } = await renderWithApp(<Txt>{t('home.streakDays', { count: 17 })}</Txt>);
    expect(getByText('১৭ দিনের ধারা')).toBeTruthy();
  });

  it('keeps ASCII digits in English', async () => {
    const t = createTranslator('en');
    const { getByText } = await renderWithApp(<Txt>{t('home.streakDays', { count: 17 })}</Txt>);
    expect(getByText('17 day streak')).toBeTruthy();
  });
});
