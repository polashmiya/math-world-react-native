export function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

export function uniqueBy<T, K>(items: readonly T[], key: (item: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) throw new RangeError('chunk size must be greater than 0');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function groupBy<T, K extends string | number>(
  items: readonly T[],
  key: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    const bucket = out[k] ?? [];
    bucket.push(item);
    out[k] = bucket;
  }
  return out;
}

export function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function range(startInclusive: number, endExclusive: number, step = 1): number[] {
  const out: number[] = [];
  for (let i = startInclusive; i < endExclusive; i += step) out.push(i);
  return out;
}

export function takeTop<T>(items: readonly T[], count: number, score: (item: T) => number): T[] {
  return items
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, count);
}

export function takeBottom<T>(items: readonly T[], count: number, score: (item: T) => number): T[] {
  return items
    .slice()
    .sort((a, b) => score(a) - score(b))
    .slice(0, count);
}
