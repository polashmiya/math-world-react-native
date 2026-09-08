import type { TopicColorKey } from '../../domain/models';

/**
 * Theme tokens. Light and dark are both first-class, and a high-contrast
 * variant exists for accessibility (spec §46).
 */
export interface ThemePalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primarySoft: string;
  primaryText: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  accent: string;
  accentSoft: string;
  overlay: string;
  /** Per-topic accents for the skill tree and cards. */
  topic: Record<TopicColorKey, string>;
  topicSoft: Record<TopicColorKey, string>;
}

export interface Theme {
  mode: 'light' | 'dark';
  highContrast: boolean;
  colors: ThemePalette;
  spacing: (steps: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  font: {
    size: (token: FontSizeToken) => number;
    weight: { regular: '400'; medium: '500'; semibold: '600'; bold: '700' };
    /** Monospace family for mathematical expressions (spec §46). */
    mono: string;
  };
  /** Set when the user asked for reduced animation. */
  reduceAnimations: boolean;
}

export type FontSizeToken =
  | 'caption'
  | 'small'
  | 'body'
  | 'bodyLarge'
  | 'title'
  | 'heading'
  | 'display'
  | 'math';

const BASE_FONT_SIZES: Record<FontSizeToken, number> = {
  caption: 11,
  small: 13,
  body: 15,
  bodyLarge: 17,
  title: 20,
  heading: 25,
  display: 32,
  math: 19,
};

const TOPIC_LIGHT: Record<TopicColorKey, string> = {
  blue: '#2563eb',
  violet: '#7c3aed',
  green: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
  teal: '#0d9488',
  indigo: '#4f46e5',
  orange: '#ea580c',
};

const TOPIC_LIGHT_SOFT: Record<TopicColorKey, string> = {
  blue: '#dbeafe',
  violet: '#ede9fe',
  green: '#d1fae5',
  amber: '#fef3c7',
  rose: '#ffe4e6',
  teal: '#ccfbf1',
  indigo: '#e0e7ff',
  orange: '#ffedd5',
};

const TOPIC_DARK: Record<TopicColorKey, string> = {
  blue: '#60a5fa',
  violet: '#a78bfa',
  green: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185',
  teal: '#2dd4bf',
  indigo: '#818cf8',
  orange: '#fb923c',
};

const TOPIC_DARK_SOFT: Record<TopicColorKey, string> = {
  blue: '#1e3a8a',
  violet: '#4c1d95',
  green: '#064e3b',
  amber: '#78350f',
  rose: '#881337',
  teal: '#134e4a',
  indigo: '#312e81',
  orange: '#7c2d12',
};

const LIGHT: ThemePalette = {
  background: '#f6f7fb',
  surface: '#ffffff',
  surfaceAlt: '#f1f3f9',
  surfaceSunken: '#e8ebf3',
  border: '#e2e6ef',
  borderStrong: '#c9d0de',
  text: '#111827',
  textMuted: '#5b6472',
  textInverse: '#ffffff',
  primary: '#4338ca',
  primarySoft: '#e0e7ff',
  primaryText: '#ffffff',
  success: '#047857',
  successSoft: '#d1fae5',
  danger: '#b91c1c',
  dangerSoft: '#fee2e2',
  warning: '#b45309',
  warningSoft: '#fef3c7',
  info: '#0369a1',
  infoSoft: '#e0f2fe',
  accent: '#c2410c',
  accentSoft: '#ffedd5',
  overlay: 'rgba(17, 24, 39, 0.45)',
  topic: TOPIC_LIGHT,
  topicSoft: TOPIC_LIGHT_SOFT,
};

const DARK: ThemePalette = {
  background: '#0b1020',
  surface: '#151b2e',
  surfaceAlt: '#1c2338',
  surfaceSunken: '#101627',
  border: '#28304a',
  borderStrong: '#3a4363',
  text: '#f3f5fb',
  textMuted: '#a2acc4',
  textInverse: '#0b1020',
  primary: '#8b8ffa',
  primarySoft: '#252a4d',
  primaryText: '#0b1020',
  success: '#34d399',
  successSoft: '#0d3b31',
  danger: '#f87171',
  dangerSoft: '#42171b',
  warning: '#fbbf24',
  warningSoft: '#3f2d09',
  info: '#38bdf8',
  infoSoft: '#0b3348',
  accent: '#fb923c',
  accentSoft: '#40230f',
  overlay: 'rgba(0, 0, 0, 0.6)',
  topic: TOPIC_DARK,
  topicSoft: TOPIC_DARK_SOFT,
};

const HIGH_CONTRAST_LIGHT: Partial<ThemePalette> = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f2f2f2',
  border: '#000000',
  borderStrong: '#000000',
  text: '#000000',
  textMuted: '#1f1f1f',
  primary: '#00308f',
  success: '#065f46',
  danger: '#8b0000',
};

const HIGH_CONTRAST_DARK: Partial<ThemePalette> = {
  background: '#000000',
  surface: '#0a0a0a',
  surfaceAlt: '#141414',
  border: '#ffffff',
  borderStrong: '#ffffff',
  text: '#ffffff',
  textMuted: '#e6e6e6',
  primary: '#9ecbff',
  success: '#7ee2b8',
  danger: '#ff9d9d',
};

export interface ThemeOptions {
  mode: 'light' | 'dark';
  largeText?: boolean;
  highContrast?: boolean;
  reduceAnimations?: boolean;
}

const SPACING_UNIT = 4;

export function createTheme(options: ThemeOptions): Theme {
  const base = options.mode === 'dark' ? DARK : LIGHT;
  const contrastOverlay = options.highContrast
    ? options.mode === 'dark'
      ? HIGH_CONTRAST_DARK
      : HIGH_CONTRAST_LIGHT
    : {};
  const colors: ThemePalette = { ...base, ...contrastOverlay };
  // Large text scales every size by a fifth rather than only the body copy.
  const scale = options.largeText ? 1.2 : 1;

  return {
    mode: options.mode,
    highContrast: !!options.highContrast,
    reduceAnimations: !!options.reduceAnimations,
    colors,
    spacing: (steps: number) => Math.round(steps * SPACING_UNIT),
    radius: { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 },
    font: {
      size: (token) => Math.round(BASE_FONT_SIZES[token] * scale),
      weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
      mono: 'monospace',
    },
  };
}

export const DEFAULT_THEME = createTheme({ mode: 'light' });

/** Colour for a mastery ratio, used by rings and bars. */
export function masteryColor(theme: Theme, mastery: number): string {
  if (mastery >= 0.8) return theme.colors.success;
  if (mastery >= 0.6) return theme.colors.topic.teal;
  if (mastery >= 0.3) return theme.colors.warning;
  if (mastery > 0) return theme.colors.accent;
  return theme.colors.borderStrong;
}

/** Colour for a difficulty band, 1..9. */
export function difficultyColor(theme: Theme, difficulty: number): string {
  if (difficulty <= 2) return theme.colors.topic.green;
  if (difficulty <= 4) return theme.colors.topic.teal;
  if (difficulty <= 6) return theme.colors.topic.amber;
  if (difficulty <= 8) return theme.colors.topic.orange;
  return theme.colors.topic.rose;
}
