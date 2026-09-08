import { MathError } from '../errors';
import { formatNumber } from '../utils/format';

export interface StatsSummary {
  count: number;
  sum: number;
  mean: number;
  median: number;
  modes: number[];
  range: number;
  min: number;
  max: number;
  variancePopulation: number;
  varianceSample: number;
  stdDevPopulation: number;
  stdDevSample: number;
  q1: number;
  q3: number;
  iqr: number;
  steps: string[];
}

export function requireData(values: readonly number[]): void {
  if (values.length === 0) throw new MathError('Provide at least one number');
  if (values.some((v) => !Number.isFinite(v))) throw new MathError('All values must be numbers');
}

export function mean(values: readonly number[]): number {
  requireData(values);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: readonly number[]): number {
  requireData(values);
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function modes(values: readonly number[]): number[] {
  requireData(values);
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = 0;
  for (const c of counts.values()) best = Math.max(best, c);
  if (best <= 1) return [];
  return Array.from(counts.entries())
    .filter(([, c]) => c === best)
    .map(([v]) => v)
    .sort((a, b) => a - b);
}

/** Linear-interpolation quantile (the method used in school textbooks). */
export function quantile(values: readonly number[], p: number): number {
  requireData(values);
  if (p < 0 || p > 1) throw new MathError('Quantile p must be between 0 and 1');
  const sorted = values.slice().sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (pos - lower) * (sorted[upper] - sorted[lower]);
}

export function variance(values: readonly number[], sample = false): number {
  requireData(values);
  if (sample && values.length < 2) throw new MathError('Sample variance needs at least 2 values');
  const m = mean(values);
  const total = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return total / (sample ? values.length - 1 : values.length);
}

export function stdDev(values: readonly number[], sample = false): number {
  return Math.sqrt(variance(values, sample));
}

export function summarize(values: readonly number[]): StatsSummary {
  requireData(values);
  const sorted = values.slice().sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const m = sum / values.length;
  const varPop = variance(values, false);
  const varSample = values.length > 1 ? variance(values, true) : 0;
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);

  const steps = [
    'n = ' + values.length,
    'Σx = ' + formatNumber(sum),
    'mean = Σx / n = ' + formatNumber(sum) + ' / ' + values.length + ' = ' + formatNumber(m, 4),
    'sorted data: ' + sorted.map((v) => formatNumber(v)).join(', '),
    'median = ' + formatNumber(median(values), 4),
    'population variance = Σ(x - x̄)² / n = ' + formatNumber(varPop, 4),
    'population σ = √variance = ' + formatNumber(Math.sqrt(varPop), 4),
  ];

  return {
    count: values.length,
    sum,
    mean: m,
    median: median(values),
    modes: modes(values),
    range: sorted[sorted.length - 1] - sorted[0],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    variancePopulation: varPop,
    varianceSample: varSample,
    stdDevPopulation: Math.sqrt(varPop),
    stdDevSample: Math.sqrt(varSample),
    q1,
    q3,
    iqr: q3 - q1,
    steps,
  };
}

export function weightedMean(values: readonly number[], weights: readonly number[]): number {
  if (values.length !== weights.length) throw new MathError('Values and weights must match in length');
  requireData(values);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) throw new MathError('Total weight cannot be zero');
  return values.reduce((acc, v, i) => acc + v * weights[i], 0) / totalWeight;
}

/** Least-squares regression line y = a + bx. */
export function linearRegression(
  xs: readonly number[],
  ys: readonly number[],
): { intercept: number; slope: number; r: number; steps: string[] } {
  if (xs.length !== ys.length) throw new MathError('x and y must have the same length');
  if (xs.length < 2) throw new MathError('Regression needs at least 2 points');
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) * (xs[i] - mx);
    syy += (ys[i] - my) * (ys[i] - my);
  }
  if (sxx === 0) throw new MathError('All x values are identical — slope is undefined');
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r = sxy / Math.sqrt(sxx * syy || 1);
  return {
    intercept,
    slope,
    r,
    steps: [
      'x̄ = ' + formatNumber(mx, 4) + ', ȳ = ' + formatNumber(my, 4),
      'b = Σ(x-x̄)(y-ȳ) / Σ(x-x̄)² = ' + formatNumber(slope, 4),
      'a = ȳ - b·x̄ = ' + formatNumber(intercept, 4),
      'y = ' + formatNumber(intercept, 4) + ' + ' + formatNumber(slope, 4) + 'x',
      'r = ' + formatNumber(r, 4),
    ],
  };
}

export interface FrequencyBin {
  label: string;
  lower: number;
  upper: number;
  count: number;
}

export function frequencyTable(values: readonly number[], binCount = 5): FrequencyBin[] {
  requireData(values);
  const sorted = values.slice().sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) {
    return [{ label: formatNumber(min), lower: min, upper: max, count: values.length }];
  }
  const width = (max - min) / binCount;
  const bins: FrequencyBin[] = [];
  for (let i = 0; i < binCount; i++) {
    const lower = min + i * width;
    const upper = i === binCount - 1 ? max : lower + width;
    bins.push({
      label: formatNumber(lower, 1) + '–' + formatNumber(upper, 1),
      lower,
      upper,
      count: 0,
    });
  }
  for (const v of values) {
    const index = Math.min(binCount - 1, Math.floor((v - min) / width));
    bins[index].count++;
  }
  return bins;
}
