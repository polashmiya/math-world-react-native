import { MathError } from '../errors';
import { collectVariables, evaluateNode, type Node, parseExpression } from './expression';
import { formatNumber } from '../utils/format';

/**
 * Dense polynomial in one variable stored low-order first:
 * `[c0, c1, c2]` means `c0 + c1·x + c2·x²`.
 */
export type Polynomial = number[];

const EPSILON = 1e-10;

export function polyTrim(p: Polynomial): Polynomial {
  const out = p.slice();
  while (out.length > 1 && Math.abs(out[out.length - 1]) < EPSILON) out.pop();
  return out;
}

export function polyDegree(p: Polynomial): number {
  return polyTrim(p).length - 1;
}

export function polyAdd(a: Polynomial, b: Polynomial): Polynomial {
  const out: Polynomial = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) out.push((a[i] ?? 0) + (b[i] ?? 0));
  return polyTrim(out);
}

export function polySub(a: Polynomial, b: Polynomial): Polynomial {
  const out: Polynomial = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) out.push((a[i] ?? 0) - (b[i] ?? 0));
  return polyTrim(out);
}

export function polyMul(a: Polynomial, b: Polynomial): Polynomial {
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  }
  return polyTrim(out);
}

export function polyScale(a: Polynomial, k: number): Polynomial {
  return polyTrim(a.map((c) => c * k));
}

export function polyPow(a: Polynomial, exponent: number): Polynomial {
  if (!Number.isInteger(exponent) || exponent < 0) {
    throw new MathError('Polynomial powers must be non-negative integers');
  }
  let out: Polynomial = [1];
  for (let i = 0; i < exponent; i++) out = polyMul(out, a);
  return out;
}

export function polyEval(p: Polynomial, x: number): number {
  let out = 0;
  for (let i = p.length - 1; i >= 0; i--) out = out * x + p[i];
  return out;
}

export function polyDerivative(p: Polynomial): Polynomial {
  if (p.length <= 1) return [0];
  const out: Polynomial = [];
  for (let i = 1; i < p.length; i++) out.push(p[i] * i);
  return polyTrim(out);
}

/** Indefinite integral with constant term 0. */
export function polyIntegral(p: Polynomial): Polynomial {
  const out: Polynomial = [0];
  for (let i = 0; i < p.length; i++) out.push(p[i] / (i + 1));
  return polyTrim(out);
}

export function polyToString(p: Polynomial, variable = 'x'): string {
  const trimmed = polyTrim(p);
  const parts: string[] = [];
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const c = trimmed[i];
    if (Math.abs(c) < EPSILON) continue;
    const magnitude = Math.abs(c);
    const showCoefficient = i === 0 || Math.abs(magnitude - 1) > EPSILON;
    const coefficientText = showCoefficient ? formatNumber(magnitude) : '';
    let term: string;
    if (i === 0) term = coefficientText;
    else if (i === 1) term = coefficientText + variable;
    else term = coefficientText + variable + '^' + i;
    const sign = c < 0 ? '-' : '+';
    parts.push(parts.length === 0 ? (c < 0 ? '-' + term : term) : ' ' + sign + ' ' + term);
  }
  return parts.length === 0 ? '0' : parts.join('');
}

/**
 * Expands an AST into a polynomial in `variable`, or returns null when the
 * expression is not polynomial (e.g. `sin(x)` or `1/x`).
 */
export function nodeToPolynomial(node: Node, variable: string): Polynomial | null {
  switch (node.kind) {
    case 'number':
      return [node.value];
    case 'variable':
      return node.name === variable ? [0, 1] : null;
    case 'unary': {
      const inner = nodeToPolynomial(node.operand, variable);
      if (!inner) return null;
      return node.op === '-' ? polyScale(inner, -1) : inner;
    }
    case 'binary': {
      const left = nodeToPolynomial(node.left, variable);
      const right = nodeToPolynomial(node.right, variable);
      if (!left || !right) return null;
      switch (node.op) {
        case '+':
          return polyAdd(left, right);
        case '-':
          return polySub(left, right);
        case '*':
          return polyMul(left, right);
        case '/': {
          if (polyDegree(right) !== 0) return null;
          if (Math.abs(right[0]) < EPSILON) return null;
          return polyScale(left, 1 / right[0]);
        }
        case '^': {
          if (polyDegree(right) !== 0) return null;
          const exponent = right[0];
          if (!Number.isInteger(exponent) || exponent < 0 || exponent > 12) return null;
          return polyPow(left, exponent);
        }
        default:
          return null;
      }
    }
    case 'call': {
      // A function of constants is still a constant.
      if (collectVariables(node).size === 0) {
        try {
          return [evaluateNode(node)];
        } catch {
          return null;
        }
      }
      return null;
    }
    default:
      return null;
  }
}

export function parsePolynomial(source: string, variable = 'x'): Polynomial | null {
  try {
    return nodeToPolynomial(parseExpression(source), variable);
  } catch {
    return null;
  }
}

export interface RootResult {
  real: number[];
  complex: { re: number; im: number }[];
}

/** Exact-ish roots for degree <= 2, Durand-Kerner for higher degrees. */
export function polyRoots(p: Polynomial): RootResult {
  const poly = polyTrim(p);
  const degree = poly.length - 1;
  if (degree <= 0) return { real: [], complex: [] };
  if (degree === 1) return { real: [-poly[0] / poly[1]], complex: [] };
  if (degree === 2) {
    const [c, b, a] = poly;
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const r1 = (-b + sq) / (2 * a);
      const r2 = (-b - sq) / (2 * a);
      return { real: disc === 0 ? [r1] : [r1, r2].sort((x, y) => x - y), complex: [] };
    }
    const sq = Math.sqrt(-disc);
    return {
      real: [],
      complex: [
        { re: -b / (2 * a), im: sq / (2 * a) },
        { re: -b / (2 * a), im: -sq / (2 * a) },
      ],
    };
  }
  return durandKerner(poly);
}

function durandKerner(poly: Polynomial): RootResult {
  const degree = poly.length - 1;
  const lead = poly[degree];
  const monic = poly.map((c) => c / lead);
  let re = new Array<number>(degree);
  let im = new Array<number>(degree);
  for (let i = 0; i < degree; i++) {
    // Deterministic spread of starting points on a circle.
    const angle = (2 * Math.PI * i) / degree + 0.4;
    re[i] = 0.4 + Math.cos(angle);
    im[i] = 0.9 * Math.sin(angle);
  }

  const evalComplex = (x: number, y: number): { re: number; im: number } => {
    let rr = 0;
    let ii = 0;
    for (let k = monic.length - 1; k >= 0; k--) {
      const nr = rr * x - ii * y + monic[k];
      const ni = rr * y + ii * x;
      rr = nr;
      ii = ni;
    }
    return { re: rr, im: ii };
  };

  for (let iter = 0; iter < 500; iter++) {
    let maxDelta = 0;
    for (let i = 0; i < degree; i++) {
      const value = evalComplex(re[i], im[i]);
      let dr = 1;
      let di = 0;
      for (let j = 0; j < degree; j++) {
        if (i === j) continue;
        const ar = re[i] - re[j];
        const ai = im[i] - im[j];
        const nr = dr * ar - di * ai;
        const ni = dr * ai + di * ar;
        dr = nr;
        di = ni;
      }
      const den = dr * dr + di * di;
      if (den < 1e-300) continue;
      const qr = (value.re * dr + value.im * di) / den;
      const qi = (value.im * dr - value.re * di) / den;
      re[i] -= qr;
      im[i] -= qi;
      maxDelta = Math.max(maxDelta, Math.hypot(qr, qi));
    }
    if (maxDelta < 1e-12) break;
  }

  const real: number[] = [];
  const complex: { re: number; im: number }[] = [];
  for (let i = 0; i < degree; i++) {
    if (Math.abs(im[i]) < 1e-7) {
      const rounded = Math.abs(re[i] - Math.round(re[i])) < 1e-7 ? Math.round(re[i]) : re[i];
      real.push(rounded);
    } else {
      complex.push({ re: re[i], im: im[i] });
    }
  }
  real.sort((a, b) => a - b);
  return { real, complex };
}

/** Integer roots via the rational root theorem — used to show factorisations. */
export function integerRoots(p: Polynomial): number[] {
  const poly = polyTrim(p);
  if (poly.length < 2) return [];
  if (!poly.every((c) => Math.abs(c - Math.round(c)) < EPSILON)) return [];
  const constant = Math.round(poly[0]);
  const out: number[] = [];
  if (constant === 0) out.push(0);
  const limit = Math.max(1, Math.abs(constant));
  for (let d = 1; d <= limit; d++) {
    if (constant !== 0 && constant % d !== 0) continue;
    for (const candidate of [d, -d]) {
      if (Math.abs(polyEval(poly, candidate)) < 1e-7 && !out.includes(candidate)) {
        out.push(candidate);
      }
    }
  }
  return out.sort((a, b) => a - b);
}

/** Synthetic division by (x - root). */
export function deflate(p: Polynomial, root: number): Polynomial {
  const poly = polyTrim(p);
  const n = poly.length - 1;
  const out = new Array<number>(n).fill(0);
  let carry = poly[n];
  for (let i = n - 1; i >= 0; i--) {
    out[i] = carry;
    carry = poly[i] + carry * root;
  }
  return polyTrim(out);
}
