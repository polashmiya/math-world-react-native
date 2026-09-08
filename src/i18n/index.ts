import { DEFAULT_LANGUAGE, type Language } from '../core/constants/levels';
import { toBanglaDigits } from '../core/utils/format';
import { bn } from './bn';
import { en, type TranslationTree } from './en';

export type { Language };
export { DEFAULT_LANGUAGE };

const DICTIONARIES: Record<Language, TranslationTree> = { en, bn };

/** Dot-separated key paths into the translation tree, e.g. `home.dailyMath`. */
type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = Leaves<TranslationTree>;

export type TranslationValues = Record<string, string | number>;

function lookup(tree: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let node: unknown = tree;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/**
 * Translates a key. Missing keys fall back to English and then to the key
 * itself, so a gap in a dictionary can never blank out the UI (spec §45).
 */
export function translate(
  language: Language,
  key: TranslationKey,
  values?: TranslationValues,
  options: { banglaDigits?: boolean } = {},
): string {
  const primary = lookup(DICTIONARIES[language], key);
  const template = primary ?? lookup(en, key) ?? key;
  const text = interpolate(template, values);
  // Bangla UI usually reads better with Bangla numerals.
  return language === 'bn' && options.banglaDigits !== false ? toBanglaDigits(text) : text;
}

export type Translator = (key: TranslationKey, values?: TranslationValues) => string;

export function createTranslator(
  language: Language,
  options: { banglaDigits?: boolean } = {},
): Translator {
  return (key, values) => translate(language, key, values, options);
}

/** Picks the right side of a bilingual content field. */
export function pickLocalized(language: Language, english: string, bangla?: string | null): string {
  if (language === 'bn') return bangla && bangla.length > 0 ? bangla : english;
  return english;
}

/** Formats a number for display, honouring the Bangla-digits preference. */
export function localizeDigits(
  value: string | number,
  language: Language,
  banglaDigits = true,
): string {
  return language === 'bn' && banglaDigits ? toBanglaDigits(value) : String(value);
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  bn: 'বাংলা',
  en: 'English',
};

export { en, bn };
export type { TranslationTree };
