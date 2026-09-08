import { MathError } from '../errors';
import { formatNumber } from '../utils/format';
import { collectVariables, evaluateNode, type Node, parseExpression } from './expression';
import { frac, toString as fracToString } from './fraction';
import {
  deflate,
  integerRoots,
  nodeToPolynomial,
  polyDegree,
  polyRoots,
  polySub,
  polyToString,
  type Polynomial,
} from './polynomial';

export interface SolveStep {
  label: string;
  detail: string;
}

export interface EquationSolution {
  input: string;
  variable: string;
  /** Normalised `f(x) = 0` form. */
  normalized: string;
  degree: number;
  realRoots: number[];
  complexRoots: { re: number; im: number }[];
  /** Human-readable answers, exact where possible (`3/2` not `1.5`). */
  answers: string[];
  steps: SolveStep[];
  identity: boolean;
  contradiction: boolean;
}

function splitEquation(input: string): { left: string; right: string } {
  const parts = input.split('=');
  if (parts.length === 1) return { left: parts[0], right: '0' };
  if (parts.length !== 2) throw new MathError('An equation needs exactly one "=" sign');
  return { left: parts[0], right: parts[1] };
}

function detectVariable(left: string, right: string, preferred?: string): string {
  if (preferred) return preferred;
  const vars = new Set<string>();
  for (const side of [left, right]) {
    try {
      for (const v of collectVariables(parseExpression(side))) vars.add(v);
    } catch {
      // Ignore: the caller reports the parse error.
    }
  }
  if (vars.size === 0) return 'x';
  if (vars.has('x')) return 'x';
  return Array.from(vars).sort()[0];
}

/** Prints a root exactly when it is a simple rational, else as a decimal. */
export function formatRoot(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const f = frac(Math.round(value * 10000), 10000);
  if (f.d <= 100 && Math.abs(f.n / f.d - value) < 1e-9) return fracToString(f);
  return formatNumber(value, 6);
}

/**
 * Solves linear, quadratic and higher-degree polynomial equations in one
 * variable and returns the working out, never just the answer (spec §26).
 */
export function solveEquation(input: string, preferredVariable?: string): EquationSolution {
  const { left, right } = splitEquation(input);
  const variable = detectVariable(left, right, preferredVariable);
  const leftNode = parseExpression(left);
  const rightNode = parseExpression(right);
  const leftPoly = nodeToPolynomial(leftNode, variable);
  const rightPoly = nodeToPolynomial(rightNode, variable);

  if (!leftPoly || !rightPoly) {
    throw new MathError(
      'This solver handles polynomial equations in one variable. Try the calculator for other expressions.',
    );
  }

  const poly = polySub(leftPoly, rightPoly);
  const degree = polyDegree(poly);
  const normalized = polyToString(poly, variable) + ' = 0';

  const steps: SolveStep[] = [
    { label: 'Given', detail: left.trim() + ' = ' + right.trim() },
    { label: 'Move every term to one side', detail: normalized },
  ];

  const isZeroPolynomial = poly.every((c) => Math.abs(c) < 1e-12);
  if (isZeroPolynomial) {
    steps.push({ label: 'Result', detail: 'Both sides are identical — every value works.' });
    return {
      input,
      variable,
      normalized,
      degree: 0,
      realRoots: [],
      complexRoots: [],
      answers: ['All real numbers'],
      steps,
      identity: true,
      contradiction: false,
    };
  }

  if (degree === 0) {
    steps.push({
      label: 'Result',
      detail: 'The variable cancelled out and ' + formatNumber(poly[0]) + ' ≠ 0, so there is no solution.',
    });
    return {
      input,
      variable,
      normalized,
      degree: 0,
      realRoots: [],
      complexRoots: [],
      answers: ['No solution'],
      steps,
      identity: false,
      contradiction: true,
    };
  }

  if (degree === 1) return solveLinearFrom(poly, variable, input, normalized, steps);
  if (degree === 2) return solveQuadraticFrom(poly, variable, input, normalized, steps);
  return solveHigherFrom(poly, variable, input, normalized, steps);
}

function solveLinearFrom(
  poly: Polynomial,
  variable: string,
  input: string,
  normalized: string,
  steps: SolveStep[],
): EquationSolution {
  const b = poly[0];
  const a = poly[1];
  steps.push({
    label: 'Isolate ' + variable,
    detail: formatNumber(a) + variable + ' = ' + formatNumber(-b),
  });
  const root = -b / a;
  steps.push({
    label: 'Divide by ' + formatNumber(a),
    detail: variable + ' = ' + formatNumber(-b) + ' ÷ ' + formatNumber(a) + ' = ' + formatRoot(root),
  });
  return {
    input,
    variable,
    normalized,
    degree: 1,
    realRoots: [root],
    complexRoots: [],
    answers: [variable + ' = ' + formatRoot(root)],
    steps,
    identity: false,
    contradiction: false,
  };
}

function solveQuadraticFrom(
  poly: Polynomial,
  variable: string,
  input: string,
  normalized: string,
  steps: SolveStep[],
): EquationSolution {
  const c = poly[0];
  const b = poly[1];
  const a = poly[2];
  const disc = b * b - 4 * a * c;
  steps.push({
    label: 'Identify coefficients',
    detail: 'a = ' + formatNumber(a) + ', b = ' + formatNumber(b) + ', c = ' + formatNumber(c),
  });
  steps.push({
    label: 'Discriminant',
    detail:
      'D = b² - 4ac = (' +
      formatNumber(b) +
      ')² - 4(' +
      formatNumber(a) +
      ')(' +
      formatNumber(c) +
      ') = ' +
      formatNumber(disc),
  });

  const roots = polyRoots(poly);
  if (disc > 0) {
    steps.push({
      label: 'Two real roots',
      detail: variable + ' = (-b ± √D) / 2a = ' + roots.real.map(formatRoot).join('  and  '),
    });
  } else if (Math.abs(disc) < 1e-12) {
    steps.push({
      label: 'One repeated root',
      detail: variable + ' = -b / 2a = ' + formatRoot(-b / (2 * a)),
    });
  } else {
    steps.push({
      label: 'No real roots',
      detail:
        'D < 0, so the roots are complex: ' +
        roots.complex
          .map((r) => formatNumber(r.re, 4) + (r.im >= 0 ? ' + ' : ' - ') + formatNumber(Math.abs(r.im), 4) + 'i')
          .join('  and  '),
    });
  }

  const factorization = tryFactorQuadratic(a, b, c, variable);
  if (factorization) steps.push({ label: 'Factorised form', detail: factorization });

  const answers =
    roots.real.length > 0
      ? roots.real.map((r) => variable + ' = ' + formatRoot(r))
      : roots.complex.map(
          (r) =>
            variable +
            ' = ' +
            formatNumber(r.re, 4) +
            (r.im >= 0 ? ' + ' : ' - ') +
            formatNumber(Math.abs(r.im), 4) +
            'i',
        );

  return {
    input,
    variable,
    normalized,
    degree: 2,
    realRoots: roots.real,
    complexRoots: roots.complex,
    answers,
    steps,
    identity: false,
    contradiction: false,
  };
}

function solveHigherFrom(
  poly: Polynomial,
  variable: string,
  input: string,
  normalized: string,
  steps: SolveStep[],
): EquationSolution {
  const found = integerRoots(poly);
  let remaining = poly;
  const factors: string[] = [];
  for (const r of found) {
    while (polyDegree(remaining) > 0 && Math.abs(evaluateAt(remaining, r)) < 1e-9) {
      remaining = deflate(remaining, r);
      factors.push('(' + variable + (r >= 0 ? ' - ' + formatNumber(r) : ' + ' + formatNumber(-r)) + ')');
    }
  }
  if (factors.length > 0) {
    steps.push({
      label: 'Rational roots found',
      detail: factors.join('') + (polyDegree(remaining) > 0 ? '(' + polyToString(remaining, variable) + ')' : '') + ' = 0',
    });
  }

  const roots = polyRoots(poly);
  steps.push({
    label: 'Real roots',
    detail: roots.real.length > 0 ? roots.real.map(formatRoot).join(', ') : 'none',
  });
  if (roots.complex.length > 0) {
    steps.push({
      label: 'Complex roots',
      detail: roots.complex
        .map((r) => formatNumber(r.re, 4) + (r.im >= 0 ? ' + ' : ' - ') + formatNumber(Math.abs(r.im), 4) + 'i')
        .join(', '),
    });
  }

  return {
    input,
    variable,
    normalized,
    degree: polyDegree(poly),
    realRoots: roots.real,
    complexRoots: roots.complex,
    answers: roots.real.map((r) => variable + ' = ' + formatRoot(r)),
    steps,
    identity: false,
    contradiction: false,
  };
}

function evaluateAt(p: Polynomial, x: number): number {
  let out = 0;
  for (let i = p.length - 1; i >= 0; i--) out = out * x + p[i];
  return out;
}

/** Returns `a(x - r₁)(x - r₂)` when both roots are nice rationals. */
export function tryFactorQuadratic(a: number, b: number, c: number, variable = 'x'): string | null {
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  if (Math.abs(sq - Math.round(sq)) > 1e-9) return null;
  const r1 = (-b + sq) / (2 * a);
  const r2 = (-b - sq) / (2 * a);
  const part = (r: number): string =>
    '(' + variable + (r >= 0 ? ' - ' + formatRoot(r) : ' + ' + formatRoot(-r)) + ')';
  const lead = Math.abs(a - 1) < 1e-12 ? '' : formatNumber(a);
  return lead + part(r1) + part(r2) + ' = 0';
}

export interface LinearSystemSolution {
  variables: string[];
  values: number[] | null;
  steps: SolveStep[];
  status: 'unique' | 'none' | 'infinite';
}

/**
 * Solves a small linear system with Gauss-Jordan elimination and partial
 * pivoting. `rows` holds the augmented matrix.
 */
export function solveLinearSystem(rows: number[][], variables: string[]): LinearSystemSolution {
  const n = variables.length;
  const m = rows.map((r) => r.slice());
  const steps: SolveStep[] = [];
  if (m.length < n) {
    return { variables, values: null, steps, status: 'infinite' };
  }

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < m.length; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) continue;
    if (pivot !== col) {
      const t = m[pivot];
      m[pivot] = m[col];
      m[col] = t;
      steps.push({ label: 'Swap rows', detail: 'R' + (col + 1) + ' ↔ R' + (pivot + 1) });
    }
    const pivotValue = m[col][col];
    for (let j = 0; j <= n; j++) m[col][j] /= pivotValue;
    steps.push({
      label: 'Normalise R' + (col + 1),
      detail: 'R' + (col + 1) + ' ÷ ' + formatNumber(pivotValue),
    });
    for (let r = 0; r < m.length; r++) {
      if (r === col) continue;
      const factor = m[r][col];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = 0; j <= n; j++) m[r][j] -= factor * m[col][j];
      steps.push({
        label: 'Eliminate',
        detail: 'R' + (r + 1) + ' - (' + formatNumber(factor) + ')·R' + (col + 1),
      });
    }
  }

  for (const row of m) {
    const allZero = row.slice(0, n).every((v) => Math.abs(v) < 1e-10);
    if (allZero && Math.abs(row[n]) > 1e-10) {
      steps.push({ label: 'Result', detail: 'Inconsistent system — no solution.' });
      return { variables, values: null, steps, status: 'none' };
    }
  }

  const values: number[] = [];
  for (let i = 0; i < n; i++) {
    if (Math.abs(m[i]?.[i] ?? 0) < 1e-10) {
      steps.push({ label: 'Result', detail: 'Infinitely many solutions.' });
      return { variables, values: null, steps, status: 'infinite' };
    }
    values.push(m[i][n]);
  }
  steps.push({
    label: 'Solution',
    detail: variables.map((v, i) => v + ' = ' + formatRoot(values[i])).join(', '),
  });
  return { variables, values, steps, status: 'unique' };
}

/** Parses `2x + 3y = 12` style lines into an augmented matrix. */
export function parseLinearSystem(lines: string[]): { rows: number[][]; variables: string[] } {
  const parsed = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const { left, right } = splitEquation(line);
      return { left: parseExpression(left), right: parseExpression(right) };
    });

  const variables = new Set<string>();
  for (const p of parsed) {
    for (const v of collectVariables(p.left)) variables.add(v);
    for (const v of collectVariables(p.right)) variables.add(v);
  }
  const varList = Array.from(variables).sort();
  const rows: number[][] = [];

  for (const p of parsed) {
    const row: number[] = [];
    // Coefficient of each variable = value with that variable at 1, others 0,
    // minus the constant term (all variables 0).
    const scopeZero: Record<string, number> = {};
    for (const v of varList) scopeZero[v] = 0;
    const constantLeft = evaluateNodeSafe(p.left, scopeZero);
    const constantRight = evaluateNodeSafe(p.right, scopeZero);
    for (const v of varList) {
      const scope = { ...scopeZero, [v]: 1 };
      const l = evaluateNodeSafe(p.left, scope) - constantLeft;
      const r = evaluateNodeSafe(p.right, scope) - constantRight;
      row.push(l - r);
    }
    row.push(constantRight - constantLeft);
    rows.push(row);
  }
  return { rows, variables: varList };
}

function evaluateNodeSafe(node: Node, scope: Record<string, number>): number {
  const value = evaluateNode(node, scope);
  if (!Number.isFinite(value)) throw new MathError('Equation is not linear');
  return value;
}
