import { formatNumber, toBanglaDigits } from '../../utils/format';
import type { Rng } from '../../utils/random';

/** Bangla-relevant names and places used in word problems (spec §22). */
export const PEOPLE = [
  { en: 'Rahim', bn: 'রহিম' },
  { en: 'Karim', bn: 'করিম' },
  { en: 'Sadia', bn: 'সাদিয়া' },
  { en: 'Nusrat', bn: 'নুসরাত' },
  { en: 'Tanvir', bn: 'তানভীর' },
  { en: 'Mitu', bn: 'মিতু' },
  { en: 'Arif', bn: 'আরিফ' },
  { en: 'Farhana', bn: 'ফারহানা' },
  { en: 'Jony', bn: 'জনি' },
  { en: 'Shila', bn: 'শিলা' },
];

export const PLACES = [
  { en: 'Dhaka', bn: 'ঢাকা' },
  { en: 'Chattogram', bn: 'চট্টগ্রাম' },
  { en: 'Sylhet', bn: 'সিলেট' },
  { en: 'Rajshahi', bn: 'রাজশাহী' },
  { en: 'Khulna', bn: 'খুলনা' },
  { en: 'Rangpur', bn: 'রংপুর' },
];

export const SHOP_ITEMS = [
  { en: 'rice', bn: 'চাল', unit: 'kg', unitBn: 'কেজি' },
  { en: 'lentils', bn: 'ডাল', unit: 'kg', unitBn: 'কেজি' },
  { en: 'oil', bn: 'তেল', unit: 'litre', unitBn: 'লিটার' },
  { en: 'sugar', bn: 'চিনি', unit: 'kg', unitBn: 'কেজি' },
  { en: 'notebooks', bn: 'খাতা', unit: 'piece', unitBn: 'টি' },
  { en: 'pens', bn: 'কলম', unit: 'piece', unitBn: 'টি' },
  { en: 'eggs', bn: 'ডিম', unit: 'piece', unitBn: 'টি' },
  { en: 'bananas', bn: 'কলা', unit: 'piece', unitBn: 'টি' },
];

export function person(rng: Rng): { en: string; bn: string } {
  return rng.pick(PEOPLE);
}

export function twoPeople(rng: Rng): [{ en: string; bn: string }, { en: string; bn: string }] {
  const picked = rng.pickMany(PEOPLE, 2);
  return [picked[0], picked[1]];
}

export function place(rng: Rng): { en: string; bn: string } {
  return rng.pick(PLACES);
}

export function shopItem(rng: Rng): (typeof SHOP_ITEMS)[number] {
  return rng.pick(SHOP_ITEMS);
}

export function bdt(amount: number): string {
  return '৳' + formatNumber(amount, 2);
}

export function bdtBn(amount: number): string {
  return toBanglaDigits(formatNumber(amount, 2)) + ' টাকা';
}

export function bn(value: number | string): string {
  return toBanglaDigits(typeof value === 'number' ? formatNumber(value) : value);
}

/**
 * Builds plausible wrong numeric answers: common slips (off-by-one, sign flip,
 * doubling, halving) plus small perturbations, all distinct from the answer.
 */
export function numericDistractors(
  correct: number,
  rng: Rng,
  count = 3,
  options: { integer?: boolean; decimals?: number; min?: number } = {},
): string[] {
  const { integer = Number.isInteger(correct), decimals = 2, min } = options;
  const candidates: number[] = [];
  const push = (value: number): void => {
    if (!Number.isFinite(value)) return;
    if (min !== undefined && value < min) return;
    const rounded = integer ? Math.round(value) : Number(value.toFixed(decimals));
    if (Math.abs(rounded - correct) < (integer ? 0.5 : Math.pow(10, -decimals) / 2)) return;
    if (!candidates.some((c) => Math.abs(c - rounded) < (integer ? 0.5 : Math.pow(10, -decimals) / 2))) {
      candidates.push(rounded);
    }
  };

  const magnitude = Math.max(1, Math.abs(correct));
  push(correct + (integer ? 1 : magnitude * 0.1));
  push(correct - (integer ? 1 : magnitude * 0.1));
  push(correct * 2);
  push(correct / 2);
  push(correct + Math.max(1, Math.round(magnitude * 0.25)));
  push(correct - Math.max(1, Math.round(magnitude * 0.25)));
  push(correct + Math.max(2, Math.round(magnitude * 0.5)));
  if (correct !== 0) push(-correct);

  let guard = 0;
  while (candidates.length < count && guard++ < 40) {
    const delta = rng.int(2, Math.max(4, Math.round(magnitude * 0.6)));
    push(correct + (rng.bool() ? delta : -delta));
  }

  return rng.shuffle(candidates).slice(0, count).map((v) => formatNumber(v, decimals));
}

/** Distractors for answers that are already formatted strings. */
export function stringDistractors(correct: string, pool: string[], rng: Rng, count = 3): string[] {
  const filtered = pool.filter((p) => p !== correct);
  return rng.shuffle(filtered).slice(0, count);
}

/** Scales a range with difficulty so one generator covers many levels. */
export function scaleRange(difficulty: number, base: number, growth: number): { min: number; max: number } {
  const factor = Math.pow(growth, difficulty - 1);
  return { min: Math.max(1, Math.round(base * factor * 0.4)), max: Math.max(2, Math.round(base * factor)) };
}

export function pickDifficultyTier(difficulty: number): 'easy' | 'medium' | 'hard' | 'extreme' {
  if (difficulty <= 2) return 'easy';
  if (difficulty <= 4) return 'medium';
  if (difficulty <= 6) return 'hard';
  return 'extreme';
}

export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return n + 'th';
  switch (n % 10) {
    case 1:
      return n + 'st';
    case 2:
      return n + 'nd';
    case 3:
      return n + 'rd';
    default:
      return n + 'th';
  }
}
