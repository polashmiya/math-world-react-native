import { MathError } from '../errors';

/**
 * A small, dependency-free expression parser and evaluator.
 * It powers the Math Solver and the expression/equation answer validators, so
 * it must be exact and deterministic: no LLM ever computes a value (spec §26).
 */
export type Node =
  | { kind: 'number'; value: number }
  | { kind: 'variable'; name: string }
  | { kind: 'unary'; op: '-' | '+'; operand: Node }
  | { kind: 'binary'; op: BinaryOp; left: Node; right: Node }
  | { kind: 'call'; name: string; args: Node[] };

export type BinaryOp = '+' | '-' | '*' | '/' | '^' | '%';

interface Token {
  type: 'number' | 'name' | 'op' | 'lparen' | 'rparen' | 'comma';
  value: string;
  position: number;
}

const OPERATORS = new Set(['+', '-', '*', '/', '^', '%']);

const PRECEDENCE: Record<BinaryOp, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 2,
  '^': 3,
};

export const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  PI: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

type Fn1 = (x: number) => number;

const FUNCTIONS_1: Record<string, Fn1> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  ln: Math.log,
  log: (x) => Math.log10(x),
  log2: Math.log2,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  /** Degree-based trig, common in school content. */
  sind: (x) => Math.sin((x * Math.PI) / 180),
  cosd: (x) => Math.cos((x * Math.PI) / 180),
  tand: (x) => Math.tan((x * Math.PI) / 180),
};

const FUNCTIONS_N: Record<string, (args: number[]) => number> = {
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  pow: (a) => Math.pow(a[0], a[1]),
  atan2: (a) => Math.atan2(a[0], a[1]),
  hypot: (a) => Math.hypot(...a),
  nthroot: (a) => {
    const [value, n] = a;
    if (value < 0 && n % 2 === 1) return -Math.pow(-value, 1 / n);
    return Math.pow(value, 1 / n);
  },
};

export function isKnownFunction(name: string): boolean {
  return name in FUNCTIONS_1 || name in FUNCTIONS_N;
}

/** Normalises the notation students actually type. */
export function normalizeExpressionInput(input: string): string {
  return input
    .replace(/[×✕✖]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/ /g, ' ')
    .replace(/√/g, 'sqrt ')
    .replace(/π/g, 'pi')
    .replace(/\*\*/g, '^')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .trim();
}

export function tokenize(source: string): Token[] {
  const src = normalizeExpressionInput(source);
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i++;
      continue;
    }
    if (ch >= '0' && ch <= '9') {
      let j = i;
      while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) j++;
      tokens.push({ type: 'number', value: src.slice(i, j), position: i });
      i = j;
      continue;
    }
    if (ch === '.') {
      let j = i + 1;
      while (j < src.length && src[j] >= '0' && src[j] <= '9') j++;
      if (j === i + 1) throw new MathError('Unexpected "." at position ' + i);
      tokens.push({ type: 'number', value: src.slice(i, j), position: i });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ type: 'name', value: src.slice(i, j), position: i });
      i = j;
      continue;
    }
    if (OPERATORS.has(ch)) {
      tokens.push({ type: 'op', value: ch, position: i });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch, position: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch, position: i });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ch, position: i });
      i++;
      continue;
    }
    throw new MathError('Unexpected character "' + ch + '" at position ' + i);
  }
  return tokens;
}

/**
 * Precedence-climbing parser with implicit multiplication support:
 * `2x`, `3(x+1)`, `(x+1)(x-1)` and `2 sin(x)` all parse.
 */
export function parseExpression(source: string): Node {
  const tokens = tokenize(source);
  let pos = 0;

  const peek = (): Token | undefined => tokens[pos];

  const expect = (type: Token['type'], value?: string): Token => {
    const t = tokens[pos];
    if (!t || t.type !== type || (value !== undefined && t.value !== value)) {
      throw new MathError('Expected ' + (value ?? type) + ' at position ' + (t?.position ?? source.length));
    }
    pos++;
    return t;
  };

  const parsePrimary = (): Node => {
    const t = peek();
    if (!t) throw new MathError('Unexpected end of expression');

    if (t.type === 'number') {
      pos++;
      const value = Number(t.value);
      if (!Number.isFinite(value)) throw new MathError('Invalid number: ' + t.value);
      return { kind: 'number', value };
    }

    if (t.type === 'name') {
      pos++;
      const next = peek();
      if (next && next.type === 'lparen' && isKnownFunction(t.value)) {
        pos++;
        const args: Node[] = [];
        if (peek()?.type !== 'rparen') {
          args.push(parseBinary(0));
          while (peek()?.type === 'comma') {
            pos++;
            args.push(parseBinary(0));
          }
        }
        expect('rparen');
        return { kind: 'call', name: t.value, args };
      }
      if (t.value in CONSTANTS) return { kind: 'number', value: CONSTANTS[t.value] };
      // Parenthesis-free application, so `√81` (normalised to `sqrt 81`) and
      // `sin 30` both work the way they are written on paper.
      if (isKnownFunction(t.value) && startsFactor()) {
        return { kind: 'call', name: t.value, args: [parseFactor()] };
      }
      return { kind: 'variable', name: t.value };
    }

    if (t.type === 'lparen') {
      pos++;
      const inner = parseBinary(0);
      expect('rparen');
      return inner;
    }

    throw new MathError('Unexpected token "' + t.value + '" at position ' + t.position);
  };

  /** True when the next token may start a new factor (implicit multiply). */
  const startsFactor = (): boolean => {
    const t = peek();
    if (!t) return false;
    return t.type === 'number' || t.type === 'name' || t.type === 'lparen';
  };

  /**
   * A factor is an optionally signed primary with an optional `^` exponent.
   * Handling `^` here (right-associatively) keeps `2x^2` = `2*(x^2)` rather
   * than `(2x)^2`, and `-x^2` = `-(x^2)`.
   */
  const parseFactor = (): Node => {
    const t = peek();
    if (t && t.type === 'op' && (t.value === '-' || t.value === '+')) {
      pos++;
      return { kind: 'unary', op: t.value as '-' | '+', operand: parseFactor() };
    }
    let base = parsePrimary();
    const next = peek();
    if (next && next.type === 'op' && next.value === '^') {
      pos++;
      base = { kind: 'binary', op: '^', left: base, right: parseFactor() };
    }
    return base;
  };

  /** Implicit multiplication: `2x`, `3(x+1)`, `(x+1)(x-1)`, `2sin(x)`. */
  const parseTermChain = (): Node => {
    let node = parseFactor();
    while (startsFactor()) {
      node = { kind: 'binary', op: '*', left: node, right: parseFactor() };
    }
    return node;
  };

  function parseBinary(minPrecedence: number): Node {
    let left = parseTermChain();
    for (;;) {
      const t = peek();
      if (!t || t.type !== 'op' || t.value === '^') break;
      const op = t.value as BinaryOp;
      const precedence = PRECEDENCE[op];
      if (precedence === undefined || precedence < minPrecedence) break;
      pos++;
      const right = parseBinary(precedence + 1);
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  const result = parseBinary(0);
  if (pos !== tokens.length) {
    throw new MathError('Unexpected trailing input at position ' + tokens[pos].position);
  }
  return result;
}

export type Scope = Record<string, number>;

export function evaluateNode(node: Node, scope: Scope = {}): number {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'variable': {
      if (node.name in scope) return scope[node.name];
      if (node.name in CONSTANTS) return CONSTANTS[node.name];
      throw new MathError('Unknown variable: ' + node.name);
    }
    case 'unary': {
      const v = evaluateNode(node.operand, scope);
      return node.op === '-' ? -v : v;
    }
    case 'binary': {
      const a = evaluateNode(node.left, scope);
      const b = evaluateNode(node.right, scope);
      switch (node.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          if (b === 0) throw new MathError('Division by zero');
          return a / b;
        case '%':
          if (b === 0) throw new MathError('Modulo by zero');
          return a % b;
        case '^':
          return Math.pow(a, b);
        default:
          throw new MathError('Unknown operator');
      }
    }
    case 'call': {
      const args = node.args.map((a) => evaluateNode(a, scope));
      const fn1 = FUNCTIONS_1[node.name];
      if (fn1) {
        if (args.length !== 1) throw new MathError(node.name + ' expects 1 argument');
        return fn1(args[0]);
      }
      const fnN = FUNCTIONS_N[node.name];
      if (fnN) return fnN(args);
      throw new MathError('Unknown function: ' + node.name);
    }
    default:
      throw new MathError('Unsupported node');
  }
}

export function evaluate(source: string, scope: Scope = {}): number {
  return evaluateNode(parseExpression(source), scope);
}

export function collectVariables(node: Node, out = new Set<string>()): Set<string> {
  switch (node.kind) {
    case 'variable':
      if (!(node.name in CONSTANTS)) out.add(node.name);
      break;
    case 'unary':
      collectVariables(node.operand, out);
      break;
    case 'binary':
      collectVariables(node.left, out);
      collectVariables(node.right, out);
      break;
    case 'call':
      for (const a of node.args) collectVariables(a, out);
      break;
    default:
      break;
  }
  return out;
}

export function nodeToString(node: Node): string {
  switch (node.kind) {
    case 'number':
      return String(node.value);
    case 'variable':
      return node.name;
    case 'unary':
      return node.op + wrap(node.operand, 4);
    case 'binary':
      return (
        wrap(node.left, PRECEDENCE[node.op]) +
        ' ' +
        node.op +
        ' ' +
        wrap(node.right, PRECEDENCE[node.op] + 1)
      );
    case 'call':
      return node.name + '(' + node.args.map(nodeToString).join(', ') + ')';
    default:
      return '?';
  }
}

function wrap(node: Node, minPrecedence: number): string {
  if (node.kind === 'binary' && PRECEDENCE[node.op] < minPrecedence) {
    return '(' + nodeToString(node) + ')';
  }
  return nodeToString(node);
}

/**
 * Structural-free equivalence check: samples both expressions at several points.
 * Used by the expression answer validator so `2(x+1)` matches `2x+2`.
 */
export function expressionsEquivalent(a: string, b: string, tolerance = 1e-6): boolean {
  let nodeA: Node;
  let nodeB: Node;
  try {
    nodeA = parseExpression(a);
    nodeB = parseExpression(b);
  } catch {
    return false;
  }
  const vars = Array.from(
    new Set([...collectVariables(nodeA), ...collectVariables(nodeB)]),
  ).sort();
  if (vars.length === 0) {
    try {
      return Math.abs(evaluateNode(nodeA) - evaluateNode(nodeB)) <= tolerance;
    } catch {
      return false;
    }
  }
  if (vars.length > 3) return false;

  const samples = [0.37, 1.13, 2.71, -1.59, 4.21, -3.07, 7.53];
  let comparisons = 0;
  for (let s = 0; s < samples.length; s++) {
    const scope: Scope = {};
    vars.forEach((v, idx) => {
      scope[v] = samples[(s + idx * 3) % samples.length];
    });
    let va: number;
    let vb: number;
    try {
      va = evaluateNode(nodeA, scope);
      vb = evaluateNode(nodeB, scope);
    } catch {
      continue;
    }
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
    const scale = Math.max(1, Math.abs(va), Math.abs(vb));
    if (Math.abs(va - vb) > tolerance * scale) return false;
    comparisons++;
  }
  return comparisons >= 3;
}
