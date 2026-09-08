import { MathError } from '../../core/errors';
import {
  add,
  div,
  frac,
  mul,
  parseFraction,
  simplifySteps,
  sub,
  toMixedString,
  toString as fracToString,
} from '../../core/math/fraction';
import { evaluate, normalizeExpressionInput } from '../../core/math/expression';
import { parseLinearSystem, solveEquation, solveLinearSystem, type EquationSolution } from '../../core/math/equation';
import { differentiate, integrateDefinite, limitAt } from '../../core/math/calculus';
import {
  determinant,
  inverse,
  multiplyMatrices,
  parseMatrix,
  rank,
  trace,
  transpose,
  eigenvalues2x2,
  matrixToString,
} from '../../core/math/matrix';
import { summarize, linearRegression, frequencyTable } from '../../core/math/statistics';
import {
  bayes,
  binomialProbability,
  countingResult,
  simpleProbability,
} from '../../core/math/probability';
import { combinations, factorizationString, gcd, isPrime, lcm, primeFactorize } from '../../core/math/numberTheory';
import * as Geometry from '../../core/math/geometry';
import { inverseTrig, trig, type AngleUnit } from '../../core/math/trigonometry';
import {
  applyDiscount,
  applyVat,
  compoundInterest,
  percentageOf,
  percentChange,
  profitLoss,
  simpleInterest,
  timeToWorkTogether,
  unitaryMethod,
  averageSpeed,
} from '../../core/math/arithmetic';
import { formatNumber } from '../../core/utils/format';

export type SolverModule =
  | 'calculator'
  | 'fraction'
  | 'equation'
  | 'system'
  | 'polynomial'
  | 'geometry'
  | 'trigonometry'
  | 'statistics'
  | 'probability'
  | 'matrix'
  | 'calculus'
  | 'number_theory'
  | 'financial';

export interface SolverOutput {
  module: SolverModule;
  /** Echo of what the solver understood the input to be. */
  interpretation: string;
  steps: string[];
  answer: string;
  /** Extra structured payload for richer rendering. */
  extra?: Record<string, unknown>;
}

export const SOLVER_MODULES: { id: SolverModule; en: string; bn: string; emoji: string; hint: string; hintBn: string }[] = [
  { id: 'calculator', en: 'Calculator', bn: 'ক্যালকুলেটর', emoji: '🧮', hint: '12 + 6 × 3 - 8 ÷ 4', hintBn: '১২ + ৬ × ৩ - ৮ ÷ ৪' },
  { id: 'fraction', en: 'Fractions', bn: 'ভগ্নাংশ', emoji: '🍕', hint: '2/3 + 3/4', hintBn: '২/৩ + ৩/৪' },
  { id: 'equation', en: 'Equations', bn: 'সমীকরণ', emoji: '🟰', hint: '3x + 5 = 20', hintBn: '৩x + ৫ = ২০' },
  { id: 'system', en: 'Simultaneous', bn: 'যুগপৎ সমীকরণ', emoji: '🔗', hint: '2x + 3y = 12; x - y = 1', hintBn: '২x + ৩y = ১২; x - y = ১' },
  { id: 'geometry', en: 'Geometry', bn: 'জ্যামিতি', emoji: '📐', hint: 'circle area r=7', hintBn: 'বৃত্তের ক্ষেত্রফল r=৭' },
  { id: 'trigonometry', en: 'Trigonometry', bn: 'ত্রিকোণমিতি', emoji: '📡', hint: 'sin 30', hintBn: 'sin ৩০' },
  { id: 'statistics', en: 'Statistics', bn: 'পরিসংখ্যান', emoji: '📊', hint: '2, 4, 4, 4, 5, 5, 7, 9', hintBn: '২, ৪, ৪, ৪, ৫, ৫, ৭, ৯' },
  { id: 'probability', en: 'Probability', bn: 'সম্ভাব্যতা', emoji: '🎲', hint: '3 of 6', hintBn: '৬ এর মধ্যে ৩' },
  { id: 'matrix', en: 'Matrix', bn: 'ম্যাট্রিক্স', emoji: '🔲', hint: '1 2; 3 4', hintBn: '১ ২; ৩ ৪' },
  { id: 'calculus', en: 'Calculus', bn: 'ক্যালকুলাস', emoji: '∫', hint: 'd/dx x^3 + 2x', hintBn: 'd/dx x³ + ২x' },
  { id: 'number_theory', en: 'Number theory', bn: 'সংখ্যাতত্ত্ব', emoji: '🔍', hint: '360', hintBn: '৩৬০' },
  { id: 'financial', en: 'Money', bn: 'টাকা', emoji: '💰', hint: '15% of 2400', hintBn: '২৪০০ এর ১৫%' },
];

/**
 * The offline Math Solver (spec §26). Every answer comes from the Math Engine:
 * the solver only parses input, dispatches and formats. Nothing here guesses.
 */
export class SolverService {
  solve(module: SolverModule, input: string, options: { angleUnit?: AngleUnit } = {}): SolverOutput {
    const text = input.trim();
    if (!text) throw new MathError('Enter something to solve');

    switch (module) {
      case 'calculator':
        return this.calculator(text);
      case 'fraction':
        return this.fractions(text);
      case 'equation':
        return this.equation(text);
      case 'system':
        return this.system(text);
      case 'polynomial':
        return this.equation(text);
      case 'geometry':
        return this.geometry(text);
      case 'trigonometry':
        return this.trigonometry(text, options.angleUnit ?? 'deg');
      case 'statistics':
        return this.statistics(text);
      case 'probability':
        return this.probability(text);
      case 'matrix':
        return this.matrix(text);
      case 'calculus':
        return this.calculus(text);
      case 'number_theory':
        return this.numberTheory(text);
      case 'financial':
        return this.financial(text);
      default:
        throw new MathError('Unknown solver module');
    }
  }

  private calculator(text: string): SolverOutput {
    const normalized = normalizeExpressionInput(text);
    const value = evaluate(normalized);
    return {
      module: 'calculator',
      interpretation: normalized,
      steps: ['Apply BODMAS to ' + normalized, '= ' + formatNumber(value, 8)],
      answer: formatNumber(value, 8),
    };
  }

  private fractions(text: string): SolverOutput {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    // An operator surrounded by spaces is unambiguous, so try that first: it
    // keeps the "/" inside "2/3" from being mistaken for the operator.
    const match =
      /^(.+?) ([+\-×x*÷/]) (.+)$/.exec(cleaned) ??
      // Without spaces, only +, - and × or ÷ can be the operator.
      /^([^+\-×÷]+)\s*([+\-×÷])\s*([^+\-×÷]+)$/.exec(cleaned);
    if (match) {
      const left = parseFraction(match[1]);
      const right = parseFraction(match[3]);
      if (left && right) {
        const op = match[2];
        const result =
          op === '+'
            ? add(left, right)
            : op === '-'
              ? sub(left, right)
              : op === '×' || op === 'x' || op === '*'
                ? mul(left, right)
                : div(left, right);
        return {
          module: 'fraction',
          interpretation: fracToString(left) + ' ' + op + ' ' + fracToString(right),
          steps: [
            'Left = ' + fracToString(left) + ', right = ' + fracToString(right),
            op === '+' || op === '-'
              ? 'Common denominator = ' + lcm(left.d, right.d)
              : op === '÷' || op === '/'
                ? 'Multiply by the reciprocal ' + right.d + '/' + right.n
                : 'Multiply numerators and denominators',
            'Answer = ' + fracToString(result) + ' = ' + formatNumber(result.n / result.d, 6),
          ],
          answer: fracToString(result),
          extra: { mixed: toMixedString(result), decimal: result.n / result.d },
        };
      }
    }

    // A single fraction is simplified instead.
    const single = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(text);
    if (single) {
      const { steps, result } = simplifySteps(Number(single[1]), Number(single[2]));
      return {
        module: 'fraction',
        interpretation: text,
        steps,
        answer: fracToString(result),
        extra: { mixed: toMixedString(result), decimal: result.n / result.d },
      };
    }

    const parsed = parseFraction(text);
    if (!parsed) throw new MathError('Try something like 2/3 + 3/4');
    return {
      module: 'fraction',
      interpretation: text,
      steps: ['Simplified form of ' + text],
      answer: fracToString(parsed),
      extra: { mixed: toMixedString(parsed), decimal: parsed.n / parsed.d },
    };
  }

  private equation(text: string): SolverOutput {
    const solution: EquationSolution = solveEquation(text);
    return {
      module: 'equation',
      interpretation: solution.normalized,
      steps: solution.steps.map((s) => s.label + ': ' + s.detail),
      answer: solution.answers.join(',  '),
      extra: {
        degree: solution.degree,
        realRoots: solution.realRoots,
        complexRoots: solution.complexRoots,
        identity: solution.identity,
        contradiction: solution.contradiction,
      },
    };
  }

  private system(text: string): SolverOutput {
    const lines = text
      .split(/[;\n]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) throw new MathError('Enter at least two equations separated by ";"');
    const parsed = parseLinearSystem(lines);
    const solved = solveLinearSystem(parsed.rows, parsed.variables);
    return {
      module: 'system',
      interpretation: lines.join('; '),
      steps: solved.steps.map((s) => s.label + ': ' + s.detail),
      answer:
        solved.status === 'unique'
          ? parsed.variables.map((v, i) => v + ' = ' + formatNumber(solved.values![i], 6)).join(', ')
          : solved.status === 'none'
            ? 'No solution'
            : 'Infinitely many solutions',
      extra: { status: solved.status, variables: parsed.variables, values: solved.values },
    };
  }

  private geometry(text: string): SolverOutput {
    const numbers = extractNumbers(text);
    const lower = text.toLowerCase();
    const need = (count: number): number[] => {
      if (numbers.length < count) throw new MathError('This calculation needs ' + count + ' number(s)');
      return numbers;
    };

    let result: Geometry.GeometryResult;
    if (lower.includes('circle') && lower.includes('circum')) result = Geometry.circleCircumference(need(1)[0]);
    else if (lower.includes('circle')) result = Geometry.circleArea(need(1)[0]);
    else if (lower.includes('sphere') && lower.includes('surface')) result = Geometry.sphereSurfaceArea(need(1)[0]);
    else if (lower.includes('sphere')) result = Geometry.sphereVolume(need(1)[0]);
    else if (lower.includes('cylinder')) result = Geometry.cylinderVolume(need(2)[0], numbers[1]);
    else if (lower.includes('cone')) result = Geometry.coneVolume(need(2)[0], numbers[1]);
    else if (lower.includes('cuboid') || lower.includes('box')) result = Geometry.cuboidVolume(need(3)[0], numbers[1], numbers[2]);
    else if (lower.includes('trapez')) result = Geometry.trapeziumArea(need(3)[0], numbers[1], numbers[2]);
    else if (lower.includes('hypot') || lower.includes('pythag')) result = Geometry.pythagorasHypotenuse(need(2)[0], numbers[1]);
    else if (lower.includes('heron') || numbers.length === 3) result = Geometry.triangleAreaHeron(need(3)[0], numbers[1], numbers[2]);
    else if (lower.includes('triangle')) result = Geometry.triangleArea(need(2)[0], numbers[1]);
    else if (lower.includes('perimeter')) result = Geometry.rectanglePerimeter(need(2)[0], numbers[1]);
    else result = Geometry.rectangleArea(need(2)[0], numbers[1]);

    return {
      module: 'geometry',
      interpretation: result.label + ' from ' + numbers.join(', '),
      steps: result.steps,
      answer: formatNumber(result.value, 4) + ' ' + result.unit,
      extra: { value: result.value, unit: result.unit },
    };
  }

  private trigonometry(text: string, unit: AngleUnit): SolverOutput {
    const inverseMatch = /^(asin|acos|atan|arcsin|arccos|arctan)\s*\(?\s*(-?\d+(?:\.\d+)?)/i.exec(text);
    if (inverseMatch) {
      const name = inverseMatch[1].toLowerCase().replace('arc', 'a') as 'asin' | 'acos' | 'atan';
      const result = inverseTrig(name, Number(inverseMatch[2]), unit);
      return {
        module: 'trigonometry',
        interpretation: result.label,
        steps: result.steps,
        answer: formatNumber(result.value, 4) + (unit === 'deg' ? '°' : ' rad'),
      };
    }

    const match = /^(sin|cos|tan)\s*\(?\s*(-?\d+(?:\.\d+)?)/i.exec(text);
    if (!match) throw new MathError('Try something like sin 30 or asin 0.5');
    const fn = match[1].toLowerCase() as 'sin' | 'cos' | 'tan';
    const result = trig(fn, Number(match[2]), unit);
    return {
      module: 'trigonometry',
      interpretation: result.label,
      steps: result.steps,
      answer: result.exact ? result.exact + ' ≈ ' + formatNumber(result.value, 6) : formatNumber(result.value, 6),
      extra: { exact: result.exact },
    };
  }

  private statistics(text: string): SolverOutput {
    const pairs = text.split('|');
    if (pairs.length === 2) {
      const xs = extractNumbers(pairs[0]);
      const ys = extractNumbers(pairs[1]);
      const regression = linearRegression(xs, ys);
      return {
        module: 'statistics',
        interpretation: 'Regression of ' + ys.length + ' points',
        steps: regression.steps,
        answer: 'y = ' + formatNumber(regression.intercept, 4) + ' + ' + formatNumber(regression.slope, 4) + 'x',
        extra: { slope: regression.slope, intercept: regression.intercept, r: regression.r },
      };
    }

    const values = extractNumbers(text);
    const summary = summarize(values);
    return {
      module: 'statistics',
      interpretation: values.length + ' values',
      steps: summary.steps,
      answer:
        'mean ' + formatNumber(summary.mean, 4) +
        ', median ' + formatNumber(summary.median, 4) +
        ', σ ' + formatNumber(summary.stdDevPopulation, 4),
      extra: { summary, bins: frequencyTable(values, Math.min(5, values.length)) },
    };
  }

  private probability(text: string): SolverOutput {
    const lower = text.toLowerCase();
    const numbers = extractNumbers(text);

    if (lower.includes('binomial') && numbers.length >= 3) {
      const result = binomialProbability(numbers[0], numbers[1], numbers[2]);
      return {
        module: 'probability',
        interpretation: 'Binomial: n=' + numbers[0] + ', k=' + numbers[1] + ', p=' + numbers[2],
        steps: result.steps,
        answer: formatNumber(result.probability, 6),
      };
    }
    if (lower.includes('bayes') && numbers.length >= 3) {
      const result = bayes(numbers[0], numbers[1], numbers[2]);
      return {
        module: 'probability',
        interpretation: 'Bayes with P(A)=' + numbers[0],
        steps: result.steps,
        answer: formatNumber(result.probability, 6),
      };
    }
    if ((lower.includes('c(') || lower.includes('combination')) && numbers.length >= 2) {
      const result = countingResult('combination', numbers[0], numbers[1]);
      return {
        module: 'probability',
        interpretation: 'C(' + numbers[0] + ', ' + numbers[1] + ')',
        steps: result.steps,
        answer: String(result.value),
      };
    }
    if ((lower.includes('p(') || lower.includes('permutation')) && numbers.length >= 2) {
      const result = countingResult('permutation', numbers[0], numbers[1]);
      return {
        module: 'probability',
        interpretation: 'P(' + numbers[0] + ', ' + numbers[1] + ')',
        steps: result.steps,
        answer: String(result.value),
      };
    }
    if (numbers.length >= 2) {
      const result = simpleProbability(numbers[0], numbers[1]);
      return {
        module: 'probability',
        interpretation: numbers[0] + ' favourable of ' + numbers[1],
        steps: result.steps,
        answer: result.exact + ' ≈ ' + formatNumber(result.probability, 6),
        extra: { combinations: combinations(numbers[1], numbers[0]) },
      };
    }
    throw new MathError('Try "3 of 6", "binomial 5 2 0.5" or "C(8,3)"');
  }

  private matrix(text: string): SolverOutput {
    const parts = text.split('|').map((p) => p.trim()).filter(Boolean);
    const first = parseMatrix(parts[0]);
    const lower = text.toLowerCase();

    if (parts.length >= 2 && !lower.includes('inverse')) {
      const second = parseMatrix(parts[1]);
      const product = multiplyMatrices(first, second);
      return {
        module: 'matrix',
        interpretation: 'A × B',
        steps: ['A =\n' + matrixToString(first), 'B =\n' + matrixToString(second), 'AB =\n' + matrixToString(product)],
        answer: matrixToString(product),
        extra: { matrix: product },
      };
    }

    if (lower.includes('inverse')) {
      const result = inverse(first);
      return {
        module: 'matrix',
        interpretation: 'A⁻¹',
        steps: result.steps,
        answer: matrixToString(result.matrix),
        extra: { matrix: result.matrix },
      };
    }
    if (lower.includes('transpose')) {
      const result = transpose(first);
      return {
        module: 'matrix',
        interpretation: 'Aᵀ',
        steps: ['A =\n' + matrixToString(first), 'Aᵀ =\n' + matrixToString(result)],
        answer: matrixToString(result),
        extra: { matrix: result },
      };
    }
    if (lower.includes('eigen')) {
      const result = eigenvalues2x2(first);
      return {
        module: 'matrix',
        interpretation: 'Eigenvalues of A',
        steps: result.steps,
        answer: result.values.length ? result.values.map((v) => formatNumber(v, 4)).join(', ') : 'complex',
        extra: { values: result.values },
      };
    }

    const det = determinant(first);
    return {
      module: 'matrix',
      interpretation: 'det(A), rank and trace',
      steps: [
        'A =\n' + matrixToString(first),
        'det(A) = ' + formatNumber(det, 6),
        'rank(A) = ' + rank(first),
        first.length === first[0].length ? 'trace(A) = ' + formatNumber(trace(first), 6) : 'trace needs a square matrix',
      ],
      answer: 'det = ' + formatNumber(det, 6),
      extra: { determinant: det, rank: rank(first) },
    };
  }

  private calculus(text: string): SolverOutput {
    const lower = text.toLowerCase();

    const integralMatch = /^(?:integrate|∫)\s*(.+?)\s+from\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)$/i.exec(text);
    if (integralMatch) {
      const result = integrateDefinite(integralMatch[1], Number(integralMatch[2]), Number(integralMatch[3]));
      return {
        module: 'calculus',
        interpretation: '∫ ' + integralMatch[1] + ' dx from ' + integralMatch[2] + ' to ' + integralMatch[3],
        steps: result.steps,
        answer: formatNumber(result.value, 6),
        extra: { method: result.method },
      };
    }

    const limitMatch = /^lim(?:it)?\s*(?:x\s*(?:->|→)\s*)?(-?\d+(?:\.\d+)?)\s+(.+)$/i.exec(text);
    if (limitMatch) {
      const result = limitAt(limitMatch[2], Number(limitMatch[1]));
      return {
        module: 'calculus',
        interpretation: 'lim x→' + limitMatch[1] + ' of ' + limitMatch[2],
        steps: result.steps,
        answer: result.value === null ? 'does not exist' : formatNumber(result.value, 6),
      };
    }

    const expression = lower.startsWith('d/dx') ? text.slice(4).trim() : text;
    const result = differentiate(expression);
    return {
      module: 'calculus',
      interpretation: 'd/dx ' + expression,
      steps: result.steps,
      answer: result.derivative,
    };
  }

  private numberTheory(text: string): SolverOutput {
    const numbers = extractNumbers(text);
    if (numbers.length === 0) throw new MathError('Enter one or two integers');

    if (numbers.length >= 2) {
      const [a, b] = numbers;
      return {
        module: 'number_theory',
        interpretation: 'HCF and LCM of ' + a + ' and ' + b,
        steps: [
          a + ' = ' + factorizationString(a),
          b + ' = ' + factorizationString(b),
          'HCF = ' + gcd(a, b),
          'LCM = ' + lcm(a, b),
          'Check: HCF × LCM = ' + gcd(a, b) * lcm(a, b) + ' = ' + a * b,
        ],
        answer: 'HCF ' + gcd(a, b) + ', LCM ' + lcm(a, b),
        extra: { hcf: gcd(a, b), lcm: lcm(a, b) },
      };
    }

    const n = Math.trunc(numbers[0]);
    return {
      module: 'number_theory',
      interpretation: 'Factorisation of ' + n,
      steps: [
        n + (isPrime(n) ? ' is prime.' : ' is composite.'),
        n + ' = ' + factorizationString(n),
        'Number of divisors = ' + primeFactorize(n).reduce((acc, f) => acc * (f.exponent + 1), 1),
      ],
      answer: factorizationString(n),
      extra: { isPrime: isPrime(n), factors: primeFactorize(n) },
    };
  }

  private financial(text: string): SolverOutput {
    const numbers = extractNumbers(text);
    const lower = text.toLowerCase();
    const need = (count: number): number[] => {
      if (numbers.length < count) throw new MathError('This calculation needs ' + count + ' number(s)');
      return numbers;
    };

    if (lower.includes('compound')) {
      const [p, r, t] = need(3);
      const result = compoundInterest(p, r, t);
      return wrapArithmetic('financial', result.label, result.steps, result.value);
    }
    if (lower.includes('interest')) {
      const [p, r, t] = need(3);
      const result = simpleInterest(p, r, t);
      return wrapArithmetic('financial', result.label, result.steps, result.value);
    }
    if (lower.includes('discount')) {
      const [price, pct] = need(2);
      const result = applyDiscount(price, pct);
      return wrapArithmetic('financial', result.label, result.steps, result.value);
    }
    if (lower.includes('vat')) {
      const [bill, pct] = need(2);
      const result = applyVat(bill, pct);
      return wrapArithmetic('financial', result.label, result.steps, result.value);
    }
    if (lower.includes('profit') || lower.includes('loss')) {
      const [cost, selling] = need(2);
      const result = profitLoss(cost, selling);
      return wrapArithmetic('financial', result.label, result.steps, result.value);
    }
    if (lower.includes('work') || lower.includes('together')) {
      const [a, b] = need(2);
      const result = timeToWorkTogether(a, b);
      return wrapArithmetic('financial', result.label, result.steps, result.value);
    }
    if (lower.includes('speed')) {
      const [distance, time] = need(2);
      const result = averageSpeed(distance, time);
      return wrapArithmetic('financial', result.label, result.steps, result.value);
    }
    if (lower.includes('change')) {
      const [from, to] = need(2);
      const result = percentChange(from, to);
      return wrapArithmetic('financial', result.label, result.steps, result.value);
    }
    if (lower.includes('cost') && numbers.length >= 3) {
      const [qa, ca, qb] = numbers;
      const result = unitaryMethod(qa, ca, qb);
      return wrapArithmetic('financial', result.label, result.steps, result.value);
    }

    const [percent, amount] = need(2);
    const result = percentageOf(percent, amount);
    return wrapArithmetic('financial', result.label, result.steps, result.value);
  }
}

function wrapArithmetic(
  module: SolverModule,
  label: string,
  steps: string[],
  value: number,
): SolverOutput {
  return { module, interpretation: label, steps, answer: formatNumber(value, 4), extra: { value } };
}

/** Pulls every number out of free text, accepting Bangla digits. */
export function extractNumbers(text: string): number[] {
  const ascii = text.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
  const matches = ascii.match(/-?\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches.map(Number).filter((n) => Number.isFinite(n));
}

/** Convenience: the fraction helper used by the fraction keypad. */
export function fractionFromParts(numerator: number, denominator: number): string {
  return fracToString(frac(numerator, denominator));
}
