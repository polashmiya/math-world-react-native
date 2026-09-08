import { expressionsEquivalent } from '../math/expression';
import { parseFraction, toNumber, equals as fracEquals } from '../math/fraction';
import { isChoiceQuestion, type Question } from '../../domain/models';

export interface ValidationResult {
  isCorrect: boolean;
  /** Normalised form of what the user typed, for storage and review. */
  normalizedAnswer: string;
  /** Canonical correct answer as the user would write it. */
  expectedAnswer: string;
  /** Set when the answer is numerically close but not accepted. */
  nearMiss: boolean;
  reason?: string;
}

const BN_TO_ASCII: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

/** Accepts Bangla digits, stray currency symbols, commas and spaces. */
export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .replace(/[০-৯]/g, (d) => BN_TO_ASCII[d] ?? d)
    .replace(/[৳$,]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[−–—]/g, '-')
    .trim()
    .toLowerCase();
}

function parseNumeric(text: string): number | null {
  const cleaned = normalizeAnswer(text).replace(/%$/, '');
  const fraction = parseFraction(cleaned);
  if (fraction) return toNumber(fraction);
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * `absolute` is a hard margin in answer units; `relative` is a fraction of the
 * expected magnitude and is only used where an approximation is the point.
 */
function toleranceFor(question: Question): { absolute?: number; relative?: number } {
  if (question.tolerance !== undefined) return { absolute: question.tolerance };
  if (question.questionType === 'estimation') return { relative: 0.05 };
  return { absolute: 1e-6 };
}

function allowedDelta(question: Question, expectedValue: number): number {
  const { absolute, relative } = toleranceFor(question);
  if (absolute !== undefined) return absolute + 1e-9;
  return (relative ?? 0) * Math.max(1, Math.abs(expectedValue)) + 1e-9;
}

/**
 * The single place an answer is judged (spec §12). It is intentionally
 * generous about formatting and strict about mathematics.
 */
export function validateAnswer(question: Question, given: string): ValidationResult {
  const expected = question.correctAnswer;
  const normalized = normalizeAnswer(given);

  if (normalized.length === 0) {
    return {
      isCorrect: false,
      normalizedAnswer: '',
      expectedAnswer: expectedDisplay(question),
      nearMiss: false,
      reason: 'empty',
    };
  }

  // Choice questions compare option ids, but also accept the option text and
  // the A/B/C/D label so a keyboard answer still works.
  if (isChoiceQuestion(question) || question.questionType === 'true_false') {
    const options = question.options ?? [];
    const matchedOption =
      options.find((o) => o.id.toLowerCase() === normalized) ??
      options.find((o) => normalizeAnswer(o.text) === normalized) ??
      options.find((o) => o.textBn && normalizeAnswer(o.textBn) === normalized) ??
      options.find((_, i) => String.fromCharCode(97 + i) === normalized);
    const answerId = matchedOption?.id ?? normalized;
    const accepted =
      answerId === expected ||
      (question.acceptedAnswers ?? []).some((a) => normalizeAnswer(a) === normalized);
    return {
      isCorrect: accepted,
      normalizedAnswer: answerId,
      expectedAnswer: expectedDisplay(question),
      nearMiss: false,
    };
  }

  if (question.questionType === 'expression' || question.questionType === 'equation') {
    const equivalent = expressionsEquivalent(normalized, normalizeAnswer(expected));
    return {
      isCorrect: equivalent,
      normalizedAnswer: normalized,
      expectedAnswer: expected,
      nearMiss: false,
    };
  }

  // Accepted spellings win outright (e.g. "5/2" vs "2 1/2").
  if ((question.acceptedAnswers ?? []).some((a) => normalizeAnswer(a) === normalized)) {
    return { isCorrect: true, normalizedAnswer: normalized, expectedAnswer: expected, nearMiss: false };
  }

  const expectedFraction = parseFraction(normalizeAnswer(expected));
  const givenFraction = parseFraction(normalized);
  if (expectedFraction && givenFraction && fracEquals(expectedFraction, givenFraction)) {
    return { isCorrect: true, normalizedAnswer: normalized, expectedAnswer: expected, nearMiss: false };
  }

  const expectedValue = parseNumeric(expected);
  const givenValue = parseNumeric(normalized);
  if (expectedValue !== null && givenValue !== null) {
    const scale = Math.max(1, Math.abs(expectedValue));
    const delta = Math.abs(expectedValue - givenValue);
    const isCorrect = delta <= allowedDelta(question, expectedValue);
    return {
      isCorrect,
      normalizedAnswer: normalized,
      expectedAnswer: expected,
      // Within 10% counts as "so close" for coaching messages.
      nearMiss: !isCorrect && delta <= 0.1 * scale,
    };
  }

  // Final fallback: case-insensitive text comparison.
  const textMatch = normalized === normalizeAnswer(expected);
  return {
    isCorrect: textMatch,
    normalizedAnswer: normalized,
    expectedAnswer: expected,
    nearMiss: false,
  };
}

/** How the correct answer should be shown to the user. */
export function expectedDisplay(question: Question): string {
  if (question.options?.length) {
    const option = question.options.find((o) => o.id === question.correctAnswer);
    if (option) return option.text;
  }
  return question.correctAnswer;
}

/** Scores a Think First estimate on a 0..1 scale (spec §21). */
export function scoreEstimate(question: Question, estimate: number): number {
  const expected = parseNumeric(question.correctAnswer);
  if (expected === null || !Number.isFinite(estimate)) return 0;
  if (expected === 0) return estimate === 0 ? 1 : 0;
  const relativeError = Math.abs(estimate - expected) / Math.abs(expected);
  if (relativeError <= 0.05) return 1;
  if (relativeError >= 1) return 0;
  return Number((1 - relativeError).toFixed(4));
}
