import { MathError } from '../errors';

/**
 * Exact rational arithmetic. The whole math engine uses fractions instead of
 * floats wherever an exact answer matters (spec §61.13), so `1/3 + 1/6` is
 * exactly `1/2` and never `0.49999999999999994`.
 */
export interface Fraction {
  readonly n: number;
  readonly d: number;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)) * b);
}

export function frac(n: number, d = 1): Fraction {
  if (d === 0) throw new MathError('Division by zero in fraction');
  if (!Number.isFinite(n) || !Number.isFinite(d)) {
    throw new MathError('Fraction requires finite integers');
  }
  if (!Number.isInteger(n) || !Number.isInteger(d)) {
    return fromDecimal(n / d);
  }
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return { n: (sign * n) / g, d: (sign * d) / g };
}

/** Converts a finite decimal into an exact fraction (up to 9 decimal places). */
export function fromDecimal(value: number, maxDenominator = 1_000_000_000): Fraction {
  if (!Number.isFinite(value)) throw new MathError('Cannot convert non-finite value');
  if (Number.isInteger(value)) return { n: value, d: 1 };
  // Stern-Brocot / continued fraction expansion keeps the denominator small.
  let lowerN = 0;
  let lowerD = 1;
  let upperN = 1;
  let upperD = 0;
  const negative = value < 0;
  const target = Math.abs(value);
  for (let i = 0; i < 64; i++) {
    const midN = lowerN + upperN;
    const midD = lowerD + upperD;
    if (midD > maxDenominator) break;
    const mid = midN / midD;
    if (Math.abs(mid - target) < 1e-12) {
      return frac(negative ? -midN : midN, midD);
    }
    if (mid < target) {
      lowerN = midN;
      lowerD = midD;
    } else {
      upperN = midN;
      upperD = midD;
    }
  }
  const d = Math.min(maxDenominator, 1_000_000);
  return frac(Math.round(value * d), d);
}

export function add(a: Fraction, b: Fraction): Fraction {
  return frac(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function sub(a: Fraction, b: Fraction): Fraction {
  return frac(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function mul(a: Fraction, b: Fraction): Fraction {
  return frac(a.n * b.n, a.d * b.d);
}

export function div(a: Fraction, b: Fraction): Fraction {
  if (b.n === 0) throw new MathError('Division by zero');
  return frac(a.n * b.d, a.d * b.n);
}

export function neg(a: Fraction): Fraction {
  return { n: -a.n, d: a.d };
}

export function abs(a: Fraction): Fraction {
  return { n: Math.abs(a.n), d: a.d };
}

export function pow(a: Fraction, exponent: number): Fraction {
  if (!Number.isInteger(exponent)) {
    return fromDecimal(Math.pow(toNumber(a), exponent));
  }
  if (exponent === 0) return { n: 1, d: 1 };
  if (exponent < 0) return div(frac(1), pow(a, -exponent));
  return frac(Math.pow(a.n, exponent), Math.pow(a.d, exponent));
}

export function toNumber(a: Fraction): number {
  return a.n / a.d;
}

export function compare(a: Fraction, b: Fraction): number {
  const left = a.n * b.d;
  const right = b.n * a.d;
  return left === right ? 0 : left < right ? -1 : 1;
}

export function equals(a: Fraction, b: Fraction): boolean {
  return compare(a, b) === 0;
}

export function isInteger(a: Fraction): boolean {
  return a.d === 1;
}

/** `3/4`, `5`, or `-2/7`. */
export function toString(a: Fraction): string {
  return a.d === 1 ? String(a.n) : a.n + '/' + a.d;
}

/** `1 3/4` style mixed number, used in primary-level content. */
export function toMixedString(a: Fraction): string {
  if (a.d === 1) return String(a.n);
  const whole = Math.trunc(a.n / a.d);
  const rem = Math.abs(a.n % a.d);
  if (whole === 0) return toString(a);
  return whole + ' ' + rem + '/' + a.d;
}

/**
 * Parses `3/4`, `-3 / 4`, `1 3/4`, `0.75`, `75%` and plain integers.
 * Returns null for anything unrecognised so callers can report a clean error.
 */
export function parseFraction(input: string): Fraction | null {
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) return null;

  const percent = /^(-?\d+(?:\.\d+)?)\s*%$/.exec(text);
  if (percent) return div(fromDecimal(Number(percent[1])), frac(100));

  const mixed = /^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(text);
  if (mixed) {
    const whole = Number(mixed[1]);
    const part = frac(Number(mixed[2]), Number(mixed[3]));
    const magnitude = add(frac(Math.abs(whole)), part);
    return whole < 0 ? neg(magnitude) : magnitude;
  }

  const simple = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(text);
  if (simple) {
    if (Number(simple[2]) === 0) return null;
    return frac(Number(simple[1]), Number(simple[2]));
  }

  const decimal = /^-?\d+(?:\.\d+)?$/.exec(text);
  if (decimal) return fromDecimal(Number(text));

  return null;
}

export function simplifySteps(n: number, d: number): { steps: string[]; result: Fraction } {
  const steps: string[] = [];
  const g = gcd(n, d);
  steps.push('GCD(' + Math.abs(n) + ', ' + Math.abs(d) + ') = ' + g);
  if (g > 1) {
    steps.push(n + '/' + d + ' = (' + n + ' ÷ ' + g + ')/(' + d + ' ÷ ' + g + ')');
  } else {
    steps.push('Already in lowest terms.');
  }
  const result = frac(n, d);
  steps.push('Answer: ' + toString(result));
  return { steps, result };
}

export const ZERO: Fraction = { n: 0, d: 1 };
export const ONE: Fraction = { n: 1, d: 1 };
