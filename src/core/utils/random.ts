import { hashString } from './id';

/**
 * Deterministic PRNG (mulberry32). The math and question engines must be
 * reproducible (spec §61.13), so every random draw goes through this.
 */
export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  pickMany<T>(items: readonly T[], count: number): T[];
  shuffle<T>(items: readonly T[]): T[];
  bool(probability?: number): boolean;
  /** Non-zero integer in [min,max]; useful for denominators and coefficients. */
  nonZeroInt(min: number, max: number): number;
}

export function createRng(seed: number | string = Date.now()): Rng {
  let state = (typeof seed === 'string' ? hashString(seed) : seed >>> 0) || 0x9e3779b9;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    let lo = min;
    let hi = max;
    if (hi < lo) {
      lo = max;
      hi = min;
    }
    return lo + Math.floor(next() * (hi - lo + 1));
  };

  function shuffle<T>(items: readonly T[]): T[] {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function pick<T>(items: readonly T[]): T {
    return items[int(0, items.length - 1)];
  }

  function pickMany<T>(items: readonly T[], count: number): T[] {
    return shuffle(items).slice(0, count);
  }

  function nonZeroInt(min: number, max: number): number {
    for (let i = 0; i < 16; i++) {
      const v = int(min, max);
      if (v !== 0) return v;
    }
    return min <= 0 && max >= 1 ? 1 : min || 1;
  }

  return {
    next,
    int,
    shuffle,
    pick,
    pickMany,
    nonZeroInt,
    bool: (probability = 0.5) => next() < probability,
  };
}
