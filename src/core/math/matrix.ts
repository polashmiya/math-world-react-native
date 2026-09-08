import { MathError } from '../errors';
import { formatNumber } from '../utils/format';

export type Matrix = number[][];

export function dimensions(m: Matrix): { rows: number; cols: number } {
  if (m.length === 0) throw new MathError('Matrix cannot be empty');
  const cols = m[0].length;
  if (cols === 0) throw new MathError('Matrix rows cannot be empty');
  if (!m.every((r) => r.length === cols)) throw new MathError('All rows must have the same length');
  return { rows: m.length, cols };
}

export function matrixToString(m: Matrix): string {
  return m.map((r) => '[ ' + r.map((v) => formatNumber(v, 4)).join('  ') + ' ]').join('\n');
}

export function addMatrices(a: Matrix, b: Matrix): Matrix {
  const da = dimensions(a);
  const db = dimensions(b);
  if (da.rows !== db.rows || da.cols !== db.cols) {
    throw new MathError('Matrices must be the same size to add');
  }
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

export function subtractMatrices(a: Matrix, b: Matrix): Matrix {
  const da = dimensions(a);
  const db = dimensions(b);
  if (da.rows !== db.rows || da.cols !== db.cols) {
    throw new MathError('Matrices must be the same size to subtract');
  }
  return a.map((row, i) => row.map((v, j) => v - b[i][j]));
}

export function scaleMatrix(a: Matrix, k: number): Matrix {
  dimensions(a);
  return a.map((row) => row.map((v) => v * k));
}

export function multiplyMatrices(a: Matrix, b: Matrix): Matrix {
  const da = dimensions(a);
  const db = dimensions(b);
  if (da.cols !== db.rows) {
    throw new MathError(
      'Cannot multiply a ' + da.rows + '×' + da.cols + ' matrix by a ' + db.rows + '×' + db.cols + ' matrix',
    );
  }
  const out: Matrix = [];
  for (let i = 0; i < da.rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < db.cols; j++) {
      let total = 0;
      for (let k = 0; k < da.cols; k++) total += a[i][k] * b[k][j];
      row.push(total);
    }
    out.push(row);
  }
  return out;
}

export function transpose(a: Matrix): Matrix {
  const { rows, cols } = dimensions(a);
  const out: Matrix = [];
  for (let j = 0; j < cols; j++) {
    const row: number[] = [];
    for (let i = 0; i < rows; i++) row.push(a[i][j]);
    out.push(row);
  }
  return out;
}

export function identity(n: number): Matrix {
  const out: Matrix = [];
  for (let i = 0; i < n; i++) {
    const row = new Array<number>(n).fill(0);
    row[i] = 1;
    out.push(row);
  }
  return out;
}

function requireSquare(a: Matrix): number {
  const { rows, cols } = dimensions(a);
  if (rows !== cols) throw new MathError('This operation needs a square matrix');
  return rows;
}

export function determinant(a: Matrix): number {
  const n = requireSquare(a);
  if (n === 1) return a[0][0];
  if (n === 2) return a[0][0] * a[1][1] - a[0][1] * a[1][0];
  // LU decomposition with partial pivoting: stable and O(n³).
  const m = a.map((r) => r.slice());
  let det = 1;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return 0;
    if (pivot !== col) {
      const t = m[pivot];
      m[pivot] = m[col];
      m[col] = t;
      det = -det;
    }
    det *= m[col][col];
    for (let r = col + 1; r < n; r++) {
      const factor = m[r][col] / m[col][col];
      for (let j = col; j < n; j++) m[r][j] -= factor * m[col][j];
    }
  }
  return det;
}

export function cofactorMatrix(a: Matrix): Matrix {
  const n = requireSquare(a);
  const out: Matrix = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const minor = a
        .filter((_, ri) => ri !== i)
        .map((r) => r.filter((_, ci) => ci !== j));
      const sign = (i + j) % 2 === 0 ? 1 : -1;
      row.push(sign * (n === 1 ? 1 : determinant(minor)));
    }
    out.push(row);
  }
  return out;
}

export function adjugate(a: Matrix): Matrix {
  return transpose(cofactorMatrix(a));
}

export function inverse(a: Matrix): { matrix: Matrix; steps: string[] } {
  const n = requireSquare(a);
  const det = determinant(a);
  if (Math.abs(det) < 1e-12) throw new MathError('This matrix is singular — no inverse exists');
  const steps = ['det(A) = ' + formatNumber(det, 4)];
  if (n === 2) {
    const [[p, q], [r, s]] = a;
    const out: Matrix = [
      [s / det, -q / det],
      [-r / det, p / det],
    ];
    steps.push('A⁻¹ = (1/det) · [[d, -b], [-c, a]]');
    steps.push('A⁻¹ =\n' + matrixToString(out));
    return { matrix: out, steps };
  }
  const adj = adjugate(a);
  steps.push('adj(A) =\n' + matrixToString(adj));
  const out = scaleMatrix(adj, 1 / det);
  steps.push('A⁻¹ = adj(A) / det(A) =\n' + matrixToString(out));
  return { matrix: out, steps };
}

export function rank(a: Matrix): number {
  const { rows, cols } = dimensions(a);
  const m = a.map((r) => r.slice());
  let rankValue = 0;
  let row = 0;
  for (let col = 0; col < cols && row < rows; col++) {
    let pivot = row;
    for (let r = row + 1; r < rows; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-10) continue;
    const t = m[pivot];
    m[pivot] = m[row];
    m[row] = t;
    for (let r = 0; r < rows; r++) {
      if (r === row) continue;
      const factor = m[r][col] / m[row][col];
      for (let j = col; j < cols; j++) m[r][j] -= factor * m[row][j];
    }
    row++;
    rankValue++;
  }
  return rankValue;
}

export function trace(a: Matrix): number {
  const n = requireSquare(a);
  let out = 0;
  for (let i = 0; i < n; i++) out += a[i][i];
  return out;
}

/** Real eigenvalues of a 2×2 matrix, with the characteristic-equation steps. */
export function eigenvalues2x2(a: Matrix): { values: number[]; steps: string[] } {
  const n = requireSquare(a);
  if (n !== 2) throw new MathError('Eigenvalue helper supports 2×2 matrices');
  const tr = trace(a);
  const det = determinant(a);
  const disc = tr * tr - 4 * det;
  const steps = [
    'λ² - (trace)λ + det = 0',
    'λ² - ' + formatNumber(tr) + 'λ + ' + formatNumber(det) + ' = 0',
    'D = ' + formatNumber(disc, 4),
  ];
  if (disc < 0) {
    steps.push('D < 0 — the eigenvalues are complex.');
    return { values: [], steps };
  }
  const sq = Math.sqrt(disc);
  const values = [(tr + sq) / 2, (tr - sq) / 2];
  steps.push('λ = ' + values.map((v) => formatNumber(v, 4)).join(', '));
  return { values, steps };
}

export function parseMatrix(input: string): Matrix {
  const rows = input
    .trim()
    .split(/[\n;]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/[[\]]/g, '')
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((token) => {
          const v = Number(token);
          if (!Number.isFinite(v)) throw new MathError('"' + token + '" is not a number');
          return v;
        }),
    );
  dimensions(rows);
  return rows;
}
