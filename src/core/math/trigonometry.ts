import { MathError } from '../errors';
import { formatNumber } from '../utils/format';

export type AngleUnit = 'deg' | 'rad';

export function toRadians(angle: number, unit: AngleUnit): number {
  return unit === 'deg' ? (angle * Math.PI) / 180 : angle;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export interface TrigResult {
  label: string;
  value: number;
  steps: string[];
  exact?: string;
}

/** Exact values students are expected to know, keyed by degrees. */
const EXACT_TABLE: Record<string, Record<number, string>> = {
  sin: { 0: '0', 30: '1/2', 45: '√2/2', 60: '√3/2', 90: '1', 180: '0', 270: '-1', 360: '0' },
  cos: { 0: '1', 30: '√3/2', 45: '√2/2', 60: '1/2', 90: '0', 180: '-1', 270: '0', 360: '1' },
  tan: { 0: '0', 30: '1/√3', 45: '1', 60: '√3', 180: '0', 360: '0' },
};

export function trig(fn: 'sin' | 'cos' | 'tan', angle: number, unit: AngleUnit = 'deg'): TrigResult {
  const radians = toRadians(angle, unit);
  const degrees = unit === 'deg' ? angle : toDegrees(angle);
  const normalizedDegrees = ((degrees % 360) + 360) % 360;

  if (fn === 'tan' && Math.abs(Math.cos(radians)) < 1e-12) {
    throw new MathError('tan is undefined at ' + formatNumber(degrees) + '°');
  }

  const value = fn === 'sin' ? Math.sin(radians) : fn === 'cos' ? Math.cos(radians) : Math.tan(radians);
  const exact = EXACT_TABLE[fn][normalizedDegrees];
  const steps = [
    fn + '(' + formatNumber(degrees) + '°)',
    'in radians: ' + formatNumber(radians, 6),
    '= ' + formatNumber(value, 6),
  ];
  if (exact) steps.push('exact value: ' + exact);
  return { label: fn + '(' + formatNumber(degrees) + '°)', value, steps, exact };
}

export function inverseTrig(
  fn: 'asin' | 'acos' | 'atan',
  value: number,
  unit: AngleUnit = 'deg',
): TrigResult {
  if ((fn === 'asin' || fn === 'acos') && (value < -1 || value > 1)) {
    throw new MathError(fn + ' needs a value between -1 and 1');
  }
  const radians = fn === 'asin' ? Math.asin(value) : fn === 'acos' ? Math.acos(value) : Math.atan(value);
  const out = unit === 'deg' ? toDegrees(radians) : radians;
  return {
    label: fn + '(' + formatNumber(value) + ')',
    value: out,
    steps: [
      fn + '(' + formatNumber(value) + ') = ' + formatNumber(radians, 6) + ' rad',
      '= ' + formatNumber(toDegrees(radians), 4) + '°',
    ],
  };
}

/** Law of sines: a/sin A = b/sin B. */
export function lawOfSinesSide(knownSide: number, knownAngleDeg: number, targetAngleDeg: number): TrigResult {
  const sinKnown = Math.sin(toRadians(knownAngleDeg, 'deg'));
  if (Math.abs(sinKnown) < 1e-12) throw new MathError('Known angle cannot be 0° or 180°');
  const value = (knownSide * Math.sin(toRadians(targetAngleDeg, 'deg'))) / sinKnown;
  return {
    label: 'Unknown side',
    value,
    steps: [
      'a / sin A = b / sin B',
      'b = a · sin B / sin A',
      'b = ' +
        formatNumber(knownSide) +
        ' × sin ' +
        formatNumber(targetAngleDeg) +
        '° / sin ' +
        formatNumber(knownAngleDeg) +
        '°',
      'b = ' + formatNumber(value, 4),
    ],
  };
}

/** Law of cosines: c² = a² + b² - 2ab·cos C. */
export function lawOfCosinesSide(a: number, b: number, angleCDeg: number): TrigResult {
  const value = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(toRadians(angleCDeg, 'deg')));
  return {
    label: 'Third side',
    value,
    steps: [
      'c² = a² + b² - 2ab·cos C',
      'c² = ' +
        formatNumber(a * a) +
        ' + ' +
        formatNumber(b * b) +
        ' - 2(' +
        formatNumber(a) +
        ')(' +
        formatNumber(b) +
        ')cos ' +
        formatNumber(angleCDeg) +
        '°',
      'c = ' + formatNumber(value, 4),
    ],
  };
}

export function lawOfCosinesAngle(a: number, b: number, c: number): TrigResult {
  const cosC = (a * a + b * b - c * c) / (2 * a * b);
  if (cosC < -1 || cosC > 1) throw new MathError('These sides cannot form a triangle');
  const value = toDegrees(Math.acos(cosC));
  return {
    label: 'Angle C',
    value,
    steps: [
      'cos C = (a² + b² - c²) / 2ab',
      'cos C = ' + formatNumber(cosC, 6),
      'C = ' + formatNumber(value, 4) + '°',
    ],
  };
}

/** Verifies sin²θ + cos²θ = 1 for a given angle — used by lesson content. */
export function pythagoreanIdentityCheck(angleDeg: number): { value: number; steps: string[] } {
  const r = toRadians(angleDeg, 'deg');
  const s = Math.sin(r);
  const c = Math.cos(r);
  return {
    value: s * s + c * c,
    steps: [
      'sin²θ + cos²θ',
      '= (' + formatNumber(s, 6) + ')² + (' + formatNumber(c, 6) + ')²',
      '= ' + formatNumber(s * s + c * c, 6),
    ],
  };
}
