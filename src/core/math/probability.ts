import { MathError } from '../errors';
import { formatNumber } from '../utils/format';
import type { Rng } from '../utils/random';
import { combinations, factorial, permutations } from './numberTheory';
import { frac, toString as fracToString } from './fraction';

export interface ProbabilityResult {
  probability: number;
  exact: string;
  steps: string[];
}

function requireProbability(p: number, name = 'probability'): void {
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new MathError(name + ' must be between 0 and 1');
  }
}

export function simpleProbability(favourable: number, total: number): ProbabilityResult {
  if (total <= 0) throw new MathError('Total outcomes must be positive');
  if (favourable < 0 || favourable > total) {
    throw new MathError('Favourable outcomes must be between 0 and the total');
  }
  const p = favourable / total;
  return {
    probability: p,
    exact: fracToString(frac(favourable, total)),
    steps: [
      'P(E) = favourable / total',
      'P(E) = ' + favourable + ' / ' + total,
      'P(E) = ' + fracToString(frac(favourable, total)) + ' = ' + formatNumber(p, 4),
    ],
  };
}

export function complement(p: number): ProbabilityResult {
  requireProbability(p);
  return {
    probability: 1 - p,
    exact: fracToString(frac(Math.round((1 - p) * 10000), 10000)),
    steps: ["P(not E) = 1 - P(E)", 'P(not E) = 1 - ' + formatNumber(p, 4) + ' = ' + formatNumber(1 - p, 4)],
  };
}

export function unionProbability(pA: number, pB: number, pBoth = 0): ProbabilityResult {
  requireProbability(pA, 'P(A)');
  requireProbability(pB, 'P(B)');
  requireProbability(pBoth, 'P(A and B)');
  const p = pA + pB - pBoth;
  requireProbability(p, 'P(A or B)');
  return {
    probability: p,
    exact: formatNumber(p, 4),
    steps: [
      'P(A ∪ B) = P(A) + P(B) - P(A ∩ B)',
      'P(A ∪ B) = ' + formatNumber(pA, 4) + ' + ' + formatNumber(pB, 4) + ' - ' + formatNumber(pBoth, 4),
      'P(A ∪ B) = ' + formatNumber(p, 4),
    ],
  };
}

export function conditionalProbability(pBoth: number, pGiven: number): ProbabilityResult {
  requireProbability(pBoth, 'P(A ∩ B)');
  requireProbability(pGiven, 'P(B)');
  if (pGiven === 0) throw new MathError('P(B) cannot be zero');
  const p = pBoth / pGiven;
  return {
    probability: p,
    exact: formatNumber(p, 4),
    steps: [
      'P(A | B) = P(A ∩ B) / P(B)',
      'P(A | B) = ' + formatNumber(pBoth, 4) + ' / ' + formatNumber(pGiven, 4),
      'P(A | B) = ' + formatNumber(p, 4),
    ],
  };
}

export function binomialProbability(n: number, k: number, p: number): ProbabilityResult {
  requireProbability(p, 'success probability');
  if (!Number.isInteger(n) || n < 0) throw new MathError('n must be a non-negative integer');
  if (!Number.isInteger(k) || k < 0 || k > n) throw new MathError('k must be between 0 and n');
  const c = combinations(n, k);
  const value = c * Math.pow(p, k) * Math.pow(1 - p, n - k);
  return {
    probability: value,
    exact: formatNumber(value, 6),
    steps: [
      'P(X = k) = C(n,k) · p^k · (1-p)^(n-k)',
      'C(' + n + ',' + k + ') = ' + c,
      'P = ' +
        c +
        ' × ' +
        formatNumber(p, 4) +
        '^' +
        k +
        ' × ' +
        formatNumber(1 - p, 4) +
        '^' +
        (n - k),
      'P = ' + formatNumber(value, 6),
    ],
  };
}

export function bayes(pA: number, pBGivenA: number, pBGivenNotA: number): ProbabilityResult {
  requireProbability(pA, 'P(A)');
  requireProbability(pBGivenA, 'P(B|A)');
  requireProbability(pBGivenNotA, 'P(B|not A)');
  const pB = pA * pBGivenA + (1 - pA) * pBGivenNotA;
  if (pB === 0) throw new MathError('P(B) works out to zero');
  const value = (pA * pBGivenA) / pB;
  return {
    probability: value,
    exact: formatNumber(value, 6),
    steps: [
      'P(A|B) = P(A)·P(B|A) / P(B)',
      'P(B) = P(A)P(B|A) + P(not A)P(B|not A) = ' + formatNumber(pB, 6),
      'P(A|B) = ' + formatNumber(pA * pBGivenA, 6) + ' / ' + formatNumber(pB, 6),
      'P(A|B) = ' + formatNumber(value, 6),
    ],
  };
}

export function countingResult(kind: 'permutation' | 'combination' | 'factorial', n: number, r = 0): {
  value: number;
  steps: string[];
} {
  if (kind === 'factorial') {
    return { value: factorial(n), steps: [n + '! = ' + formatNumber(factorial(n))] };
  }
  if (kind === 'permutation') {
    return {
      value: permutations(n, r),
      steps: [
        'P(n,r) = n! / (n-r)!',
        'P(' + n + ',' + r + ') = ' + n + '! / ' + (n - r) + '!',
        '= ' + formatNumber(permutations(n, r)),
      ],
    };
  }
  return {
    value: combinations(n, r),
    steps: [
      'C(n,r) = n! / [r!(n-r)!]',
      'C(' + n + ',' + r + ') = ' + n + '! / [' + r + '!' + (n - r) + '!]',
      '= ' + formatNumber(combinations(n, r)),
    ],
  };
}

/* ---------------------------------------------------------------------------
 * Probability Lab simulations (spec §29). Deterministic given an `Rng`, so a
 * lab run can be replayed and unit-tested.
 * ------------------------------------------------------------------------- */

export interface SimulationOutcome {
  label: string;
  count: number;
  observed: number;
  expected: number;
}

export interface SimulationResult {
  trials: number;
  outcomes: SimulationOutcome[];
  /** Largest absolute gap between observed and theoretical probability. */
  maxDeviation: number;
  explanation: string;
}

export type LabExperiment = 'coin' | 'die' | 'two_dice_sum' | 'card_suit';

const EXPERIMENT_SPACE: Record<LabExperiment, { labels: string[]; expected: number[] }> = {
  coin: { labels: ['Heads', 'Tails'], expected: [0.5, 0.5] },
  die: {
    labels: ['1', '2', '3', '4', '5', '6'],
    expected: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  },
  two_dice_sum: {
    labels: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    expected: [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((c) => c / 36),
  },
  card_suit: {
    labels: ['♠ Spades', '♥ Hearts', '♦ Diamonds', '♣ Clubs'],
    expected: [0.25, 0.25, 0.25, 0.25],
  },
};

export function experimentSpace(experiment: LabExperiment): { labels: string[]; expected: number[] } {
  return EXPERIMENT_SPACE[experiment];
}

export function runSimulation(experiment: LabExperiment, trials: number, rng: Rng): SimulationResult {
  if (!Number.isInteger(trials) || trials <= 0) throw new MathError('Trials must be a positive integer');
  if (trials > 100000) throw new MathError('Keep trials at 100,000 or fewer to stay responsive');
  const space = EXPERIMENT_SPACE[experiment];
  const counts = new Array<number>(space.labels.length).fill(0);

  for (let i = 0; i < trials; i++) {
    let index: number;
    switch (experiment) {
      case 'coin':
        index = rng.int(0, 1);
        break;
      case 'die':
        index = rng.int(0, 5);
        break;
      case 'two_dice_sum':
        index = rng.int(1, 6) + rng.int(1, 6) - 2;
        break;
      case 'card_suit':
        index = rng.int(0, 3);
        break;
      default:
        index = 0;
    }
    counts[index]++;
  }

  const outcomes: SimulationOutcome[] = space.labels.map((label, i) => ({
    label,
    count: counts[i],
    observed: counts[i] / trials,
    expected: space.expected[i],
  }));
  const maxDeviation = Math.max(...outcomes.map((o) => Math.abs(o.observed - o.expected)));

  const explanation =
    trials < 100
      ? 'With few trials the results swing a lot. Run more trials and watch them settle.'
      : maxDeviation < 0.02
        ? 'The observed frequencies now sit very close to the theoretical probabilities — this is the law of large numbers.'
        : 'The observed frequencies are approaching the theoretical values; more trials will tighten the gap.';

  return { trials, outcomes, maxDeviation, explanation };
}
