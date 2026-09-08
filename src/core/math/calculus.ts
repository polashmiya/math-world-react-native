import { MathError } from '../errors';
import { formatNumber } from '../utils/format';
import { evaluateNode, type Node, nodeToString, parseExpression } from './expression';

/**
 * Symbolic differentiation over the expression AST, plus numeric integration.
 * Symbolic results are simplified enough to be readable in a solution step.
 */
export function differentiateNode(node: Node, variable: string): Node {
  switch (node.kind) {
    case 'number':
      return num(0);
    case 'variable':
      return num(node.name === variable ? 1 : 0);
    case 'unary':
      return node.op === '-'
        ? simplify({ kind: 'unary', op: '-', operand: differentiateNode(node.operand, variable) })
        : differentiateNode(node.operand, variable);
    case 'binary': {
      const { left, right, op } = node;
      const dl = differentiateNode(left, variable);
      const dr = differentiateNode(right, variable);
      switch (op) {
        case '+':
          return simplify({ kind: 'binary', op: '+', left: dl, right: dr });
        case '-':
          return simplify({ kind: 'binary', op: '-', left: dl, right: dr });
        case '*':
          // Product rule
          return simplify({
            kind: 'binary',
            op: '+',
            left: { kind: 'binary', op: '*', left: dl, right },
            right: { kind: 'binary', op: '*', left, right: dr },
          });
        case '/':
          // Quotient rule
          return simplify({
            kind: 'binary',
            op: '/',
            left: {
              kind: 'binary',
              op: '-',
              left: { kind: 'binary', op: '*', left: dl, right },
              right: { kind: 'binary', op: '*', left, right: dr },
            },
            right: { kind: 'binary', op: '^', left: right, right: num(2) },
          });
        case '^': {
          if (right.kind === 'number') {
            const n = right.value;
            // Power rule with chain rule: d/dx f^n = n·f^(n-1)·f'
            return simplify({
              kind: 'binary',
              op: '*',
              left: {
                kind: 'binary',
                op: '*',
                left: num(n),
                right: { kind: 'binary', op: '^', left, right: num(n - 1) },
              },
              right: dl,
            });
          }
          throw new MathError('This differentiator supports constant exponents only');
        }
        default:
          throw new MathError('Cannot differentiate operator ' + op);
      }
    }
    case 'call': {
      const arg = node.args[0];
      if (!arg || node.args.length !== 1) {
        throw new MathError('Cannot differentiate ' + node.name + ' with these arguments');
      }
      const inner = differentiateNode(arg, variable);
      const chain = (outer: Node): Node => simplify({ kind: 'binary', op: '*', left: outer, right: inner });
      switch (node.name) {
        case 'sin':
          return chain(call('cos', arg));
        case 'cos':
          return chain({ kind: 'unary', op: '-', operand: call('sin', arg) });
        case 'tan':
          return chain({
            kind: 'binary',
            op: '/',
            left: num(1),
            right: { kind: 'binary', op: '^', left: call('cos', arg), right: num(2) },
          });
        case 'exp':
          return chain(call('exp', arg));
        case 'ln':
          return simplify({ kind: 'binary', op: '/', left: inner, right: arg });
        case 'sqrt':
          return simplify({
            kind: 'binary',
            op: '/',
            left: inner,
            right: { kind: 'binary', op: '*', left: num(2), right: call('sqrt', arg) },
          });
        default:
          throw new MathError('Cannot differentiate ' + node.name);
      }
    }
    default:
      throw new MathError('Unsupported expression');
  }
}

function num(value: number): Node {
  return { kind: 'number', value };
}

function call(name: string, arg: Node): Node {
  return { kind: 'call', name, args: [arg] };
}

/** Constant folding plus the obvious 0/1 identities, applied bottom-up. */
export function simplify(node: Node): Node {
  switch (node.kind) {
    case 'number':
    case 'variable':
      return node;
    case 'unary': {
      const operand = simplify(node.operand);
      if (operand.kind === 'number') return num(node.op === '-' ? -operand.value : operand.value);
      return node.op === '+' ? operand : { kind: 'unary', op: '-', operand };
    }
    case 'call': {
      const args = node.args.map(simplify);
      if (args.every((a) => a.kind === 'number')) {
        try {
          return num(evaluateNode({ kind: 'call', name: node.name, args }));
        } catch {
          return { kind: 'call', name: node.name, args };
        }
      }
      return { kind: 'call', name: node.name, args };
    }
    case 'binary': {
      const left = simplify(node.left);
      const right = simplify(node.right);
      const op = node.op;
      if (left.kind === 'number' && right.kind === 'number') {
        try {
          return num(evaluateNode({ kind: 'binary', op, left, right }));
        } catch {
          return { kind: 'binary', op, left, right };
        }
      }
      const isZero = (n: Node): boolean => n.kind === 'number' && n.value === 0;
      const isOne = (n: Node): boolean => n.kind === 'number' && n.value === 1;
      switch (op) {
        case '+':
          if (isZero(left)) return right;
          if (isZero(right)) return left;
          break;
        case '-':
          if (isZero(right)) return left;
          if (isZero(left)) return simplify({ kind: 'unary', op: '-', operand: right });
          break;
        case '*': {
          if (isZero(left) || isZero(right)) return num(0);
          if (isOne(left)) return right;
          if (isOne(right)) return left;
          // Keep the numeric coefficient on the left so it can be collected.
          if (right.kind === 'number' && left.kind !== 'number') {
            return simplify({ kind: 'binary', op: '*', left: right, right: left });
          }
          // Collect nested coefficients: 3·(2·x) becomes 6·x.
          if (left.kind === 'number' && right.kind === 'binary' && right.op === '*' && right.left.kind === 'number') {
            return simplify({
              kind: 'binary',
              op: '*',
              left: num(left.value * right.left.value),
              right: right.right,
            });
          }
          break;
        }
        case '/':
          if (isZero(left)) return num(0);
          if (isOne(right)) return left;
          break;
        case '^':
          if (isZero(right)) return num(1);
          if (isOne(right)) return left;
          if (isOne(left)) return num(1);
          break;
        default:
          break;
      }
      return { kind: 'binary', op, left, right };
    }
    default:
      return node;
  }
}

export interface DerivativeResult {
  input: string;
  variable: string;
  derivative: string;
  steps: string[];
}

export function differentiate(source: string, variable = 'x'): DerivativeResult {
  const node = parseExpression(source);
  const d = simplify(differentiateNode(node, variable));
  return {
    input: source,
    variable,
    derivative: nodeToString(d),
    steps: [
      'f(' + variable + ') = ' + nodeToString(simplify(node)),
      "Apply the differentiation rules term by term.",
      "f'(" + variable + ') = ' + nodeToString(d),
    ],
  };
}

export interface IntegralResult {
  input: string;
  variable: string;
  lower: number;
  upper: number;
  value: number;
  method: string;
  steps: string[];
}

/**
 * Definite integral by adaptive Simpson's rule. Numeric on purpose: an exact
 * antiderivative is not always available, and a wrong symbolic answer is worse
 * than an accurate numeric one with the method stated.
 */
export function integrateDefinite(
  source: string,
  lower: number,
  upper: number,
  variable = 'x',
  intervals = 1000,
): IntegralResult {
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    throw new MathError('Integration limits must be finite numbers');
  }
  const node = parseExpression(source);
  const n = intervals % 2 === 0 ? intervals : intervals + 1;
  const h = (upper - lower) / n;
  const f = (x: number): number => {
    const v = evaluateNode(node, { [variable]: x });
    if (!Number.isFinite(v)) throw new MathError('The function is undefined inside this interval');
    return v;
  };

  let total = f(lower) + f(upper);
  for (let i = 1; i < n; i++) {
    total += f(lower + i * h) * (i % 2 === 0 ? 2 : 4);
  }
  const value = (h / 3) * total;

  return {
    input: source,
    variable,
    lower,
    upper,
    value,
    method: "Simpson's rule with " + n + ' intervals',
    steps: [
      '∫ from ' + formatNumber(lower) + ' to ' + formatNumber(upper) + ' of ' + source + ' d' + variable,
      "Simpson's rule: (h/3)[f(x₀) + 4f(x₁) + 2f(x₂) + … + f(xₙ)]",
      'h = (b - a)/n = ' + formatNumber(h, 6),
      'Result ≈ ' + formatNumber(value, 6),
    ],
  };
}

export interface LimitResult {
  input: string;
  variable: string;
  approaching: number;
  value: number | null;
  steps: string[];
}

/** Numeric two-sided limit; reports null when the sides disagree. */
export function limitAt(source: string, approaching: number, variable = 'x'): LimitResult {
  const node = parseExpression(source);
  const evalAt = (x: number): number | null => {
    try {
      const v = evaluateNode(node, { [variable]: x });
      return Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  };
  const deltas = [1e-2, 1e-3, 1e-4, 1e-5, 1e-6];
  const leftValues = deltas.map((d) => evalAt(approaching - d)).filter((v): v is number => v !== null);
  const rightValues = deltas.map((d) => evalAt(approaching + d)).filter((v): v is number => v !== null);
  const steps: string[] = ['Evaluate close to ' + variable + ' = ' + formatNumber(approaching)];

  if (leftValues.length === 0 || rightValues.length === 0) {
    steps.push('The function is undefined on at least one side.');
    return { input: source, variable, approaching, value: null, steps };
  }
  const left = leftValues[leftValues.length - 1];
  const right = rightValues[rightValues.length - 1];
  steps.push('from the left: ' + formatNumber(left, 6));
  steps.push('from the right: ' + formatNumber(right, 6));

  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  if (Math.abs(left - right) > 1e-3 * scale) {
    steps.push('The one-sided limits differ, so the limit does not exist.');
    return { input: source, variable, approaching, value: null, steps };
  }
  const value = (left + right) / 2;
  const rounded = Math.abs(value - Math.round(value)) < 1e-6 ? Math.round(value) : value;
  steps.push('limit = ' + formatNumber(rounded, 6));
  return { input: source, variable, approaching, value: rounded, steps };
}

/** Newton-Raphson root finding, used by the function lab. */
export function findRootNewton(
  source: string,
  guess: number,
  variable = 'x',
  iterations = 60,
): number | null {
  const node = parseExpression(source);
  const dNode = simplify(differentiateNode(node, variable));
  let x = guess;
  for (let i = 0; i < iterations; i++) {
    let fx: number;
    let dfx: number;
    try {
      fx = evaluateNode(node, { [variable]: x });
      dfx = evaluateNode(dNode, { [variable]: x });
    } catch {
      return null;
    }
    if (!Number.isFinite(fx) || !Number.isFinite(dfx) || Math.abs(dfx) < 1e-14) return null;
    const next = x - fx / dfx;
    if (Math.abs(next - x) < 1e-12) return next;
    x = next;
  }
  return Math.abs(evaluateNode(node, { [variable]: x })) < 1e-6 ? x : null;
}

/** Samples a function for plotting; null entries mark discontinuities. */
export function samplePoints(
  source: string,
  from: number,
  to: number,
  steps = 120,
  variable = 'x',
): { x: number; y: number | null }[] {
  const node = parseExpression(source);
  const out: { x: number; y: number | null }[] = [];
  const width = (to - from) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = from + i * width;
    try {
      const y = evaluateNode(node, { [variable]: x });
      out.push({ x, y: Number.isFinite(y) ? y : null });
    } catch {
      out.push({ x, y: null });
    }
  }
  return out;
}
