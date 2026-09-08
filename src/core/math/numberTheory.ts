import { MathError } from '../errors';
import { gcd, lcm } from './fraction';

export { gcd, lcm };

export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  if (n % 3 === 0) return n === 3;
  const limit = Math.floor(Math.sqrt(n));
  for (let i = 5; i <= limit; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

export function primesUpTo(limit: number): number[] {
  if (limit < 2) return [];
  const sieve = new Uint8Array(limit + 1);
  const out: number[] = [];
  for (let i = 2; i <= limit; i++) {
    if (sieve[i]) continue;
    out.push(i);
    for (let j = i * i; j <= limit; j += i) sieve[j] = 1;
  }
  return out;
}

export interface PrimeFactor {
  prime: number;
  exponent: number;
}

export function primeFactorize(n: number): PrimeFactor[] {
  if (!Number.isInteger(n) || n < 2) {
    if (n === 1 || n === 0 || n === -1) return [];
    throw new MathError('Prime factorisation needs an integer >= 2');
  }
  let value = Math.abs(n);
  const out: PrimeFactor[] = [];
  for (let p = 2; p * p <= value; p += p === 2 ? 1 : 2) {
    if (value % p !== 0) continue;
    let exponent = 0;
    while (value % p === 0) {
      value /= p;
      exponent++;
    }
    out.push({ prime: p, exponent });
  }
  if (value > 1) out.push({ prime: value, exponent: 1 });
  return out;
}

export function factorizationString(n: number): string {
  const factors = primeFactorize(n);
  if (factors.length === 0) return String(n);
  return factors
    .map((f) => (f.exponent === 1 ? String(f.prime) : f.prime + '^' + f.exponent))
    .join(' × ');
}

export function divisors(n: number): number[] {
  const value = Math.abs(Math.trunc(n));
  if (value === 0) return [];
  const small: number[] = [];
  const large: number[] = [];
  for (let i = 1; i * i <= value; i++) {
    if (value % i !== 0) continue;
    small.push(i);
    if (i !== value / i) large.push(value / i);
  }
  return small.concat(large.reverse());
}

export function divisorCount(n: number): number {
  return primeFactorize(n).reduce((acc, f) => acc * (f.exponent + 1), 1);
}

export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new MathError('Factorial needs n >= 0');
  if (n > 170) return Infinity;
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}

export function permutations(n: number, r: number): number {
  if (r > n || r < 0) return 0;
  let out = 1;
  for (let i = 0; i < r; i++) out *= n - i;
  return out;
}

export function combinations(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  const k = Math.min(r, n - r);
  let out = 1;
  for (let i = 1; i <= k; i++) {
    out = (out * (n - k + i)) / i;
  }
  return Math.round(out);
}

export function fibonacci(n: number): number {
  if (n < 0) throw new MathError('Fibonacci index must be >= 0');
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) {
    const t = a + b;
    a = b;
    b = t;
  }
  return a;
}

export function isPerfectSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

/** Modular exponentiation, safe for the ranges used by content generators. */
export function modPow(base: number, exponent: number, modulus: number): number {
  if (modulus === 0) throw new MathError('Modulus must be non-zero');
  let result = 1;
  let b = ((base % modulus) + modulus) % modulus;
  let e = exponent;
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % modulus;
    b = (b * b) % modulus;
    e = Math.floor(e / 2);
  }
  return result;
}

export function digitSum(n: number): number {
  let value = Math.abs(Math.trunc(n));
  let out = 0;
  while (value > 0) {
    out += value % 10;
    value = Math.floor(value / 10);
  }
  return out;
}

export function reverseDigits(n: number): number {
  const sign = n < 0 ? -1 : 1;
  let value = Math.abs(Math.trunc(n));
  let out = 0;
  while (value > 0) {
    out = out * 10 + (value % 10);
    value = Math.floor(value / 10);
  }
  return sign * out;
}

export function isPalindromeNumber(n: number): boolean {
  return Math.abs(n) === reverseDigits(Math.abs(n));
}

/** Extended Euclid: returns g, x, y with ax + by = g. */
export function extendedGcd(a: number, b: number): { g: number; x: number; y: number } {
  if (b === 0) return { g: Math.abs(a), x: a < 0 ? -1 : 1, y: 0 };
  const inner = extendedGcd(b, a % b);
  return { g: inner.g, x: inner.y, y: inner.x - Math.floor(a / b) * inner.y };
}
