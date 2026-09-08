import { MathError } from '../errors';
import { formatNumber } from '../utils/format';

export interface GeometryResult {
  label: string;
  value: number;
  unit: string;
  steps: string[];
}

const step = (text: string): string => text;

export function triangleArea(base: number, height: number): GeometryResult {
  requirePositive({ base, height });
  const value = 0.5 * base * height;
  return {
    label: 'Area of triangle',
    value,
    unit: 'sq units',
    steps: [
      step('A = ½ × base × height'),
      step('A = ½ × ' + formatNumber(base) + ' × ' + formatNumber(height)),
      step('A = ' + formatNumber(value)),
    ],
  };
}

export function triangleAreaHeron(a: number, b: number, c: number): GeometryResult {
  requirePositive({ a, b, c });
  if (a + b <= c || a + c <= b || b + c <= a) {
    throw new MathError('These three sides cannot form a triangle');
  }
  const s = (a + b + c) / 2;
  const value = Math.sqrt(s * (s - a) * (s - b) * (s - c));
  return {
    label: 'Area of triangle (Heron)',
    value,
    unit: 'sq units',
    steps: [
      step('s = (a + b + c) / 2 = ' + formatNumber(s)),
      step('A = √[s(s-a)(s-b)(s-c)]'),
      step(
        'A = √[' +
          formatNumber(s) +
          ' × ' +
          formatNumber(s - a) +
          ' × ' +
          formatNumber(s - b) +
          ' × ' +
          formatNumber(s - c) +
          ']',
      ),
      step('A = ' + formatNumber(value)),
    ],
  };
}

export function rectangleArea(length: number, width: number): GeometryResult {
  requirePositive({ length, width });
  const value = length * width;
  return {
    label: 'Area of rectangle',
    value,
    unit: 'sq units',
    steps: ['A = l × w', 'A = ' + formatNumber(length) + ' × ' + formatNumber(width), 'A = ' + formatNumber(value)],
  };
}

export function rectanglePerimeter(length: number, width: number): GeometryResult {
  requirePositive({ length, width });
  const value = 2 * (length + width);
  return {
    label: 'Perimeter of rectangle',
    value,
    unit: 'units',
    steps: ['P = 2(l + w)', 'P = 2(' + formatNumber(length) + ' + ' + formatNumber(width) + ')', 'P = ' + formatNumber(value)],
  };
}

export function circleArea(radius: number): GeometryResult {
  requirePositive({ radius });
  const value = Math.PI * radius * radius;
  return {
    label: 'Area of circle',
    value,
    unit: 'sq units',
    steps: ['A = πr²', 'A = π × ' + formatNumber(radius) + '²', 'A = ' + formatNumber(value, 4)],
  };
}

export function circleCircumference(radius: number): GeometryResult {
  requirePositive({ radius });
  const value = 2 * Math.PI * radius;
  return {
    label: 'Circumference',
    value,
    unit: 'units',
    steps: ['C = 2πr', 'C = 2π × ' + formatNumber(radius), 'C = ' + formatNumber(value, 4)],
  };
}

export function trapeziumArea(a: number, b: number, height: number): GeometryResult {
  requirePositive({ a, b, height });
  const value = 0.5 * (a + b) * height;
  return {
    label: 'Area of trapezium',
    value,
    unit: 'sq units',
    steps: [
      'A = ½(a + b)h',
      'A = ½(' + formatNumber(a) + ' + ' + formatNumber(b) + ') × ' + formatNumber(height),
      'A = ' + formatNumber(value),
    ],
  };
}

export function sphereVolume(radius: number): GeometryResult {
  requirePositive({ radius });
  const value = (4 / 3) * Math.PI * Math.pow(radius, 3);
  return {
    label: 'Volume of sphere',
    value,
    unit: 'cubic units',
    steps: ['V = 4/3 πr³', 'V = 4/3 × π × ' + formatNumber(radius) + '³', 'V = ' + formatNumber(value, 4)],
  };
}

export function sphereSurfaceArea(radius: number): GeometryResult {
  requirePositive({ radius });
  const value = 4 * Math.PI * radius * radius;
  return {
    label: 'Surface area of sphere',
    value,
    unit: 'sq units',
    steps: ['S = 4πr²', 'S = 4π × ' + formatNumber(radius) + '²', 'S = ' + formatNumber(value, 4)],
  };
}

export function cylinderVolume(radius: number, height: number): GeometryResult {
  requirePositive({ radius, height });
  const value = Math.PI * radius * radius * height;
  return {
    label: 'Volume of cylinder',
    value,
    unit: 'cubic units',
    steps: [
      'V = πr²h',
      'V = π × ' + formatNumber(radius) + '² × ' + formatNumber(height),
      'V = ' + formatNumber(value, 4),
    ],
  };
}

export function coneVolume(radius: number, height: number): GeometryResult {
  requirePositive({ radius, height });
  const value = (1 / 3) * Math.PI * radius * radius * height;
  return {
    label: 'Volume of cone',
    value,
    unit: 'cubic units',
    steps: [
      'V = ⅓πr²h',
      'V = ⅓ × π × ' + formatNumber(radius) + '² × ' + formatNumber(height),
      'V = ' + formatNumber(value, 4),
    ],
  };
}

export function cuboidVolume(length: number, width: number, height: number): GeometryResult {
  requirePositive({ length, width, height });
  const value = length * width * height;
  return {
    label: 'Volume of cuboid',
    value,
    unit: 'cubic units',
    steps: [
      'V = l × w × h',
      'V = ' + formatNumber(length) + ' × ' + formatNumber(width) + ' × ' + formatNumber(height),
      'V = ' + formatNumber(value),
    ],
  };
}

export function pythagorasHypotenuse(a: number, b: number): GeometryResult {
  requirePositive({ a, b });
  const value = Math.hypot(a, b);
  return {
    label: 'Hypotenuse',
    value,
    unit: 'units',
    steps: [
      'c² = a² + b²',
      'c² = ' + formatNumber(a * a) + ' + ' + formatNumber(b * b) + ' = ' + formatNumber(a * a + b * b),
      'c = ' + formatNumber(value, 4),
    ],
  };
}

export function pythagorasLeg(hypotenuse: number, leg: number): GeometryResult {
  requirePositive({ hypotenuse, leg });
  if (leg >= hypotenuse) throw new MathError('The leg must be shorter than the hypotenuse');
  const value = Math.sqrt(hypotenuse * hypotenuse - leg * leg);
  return {
    label: 'Other leg',
    value,
    unit: 'units',
    steps: [
      'b² = c² - a²',
      'b² = ' + formatNumber(hypotenuse * hypotenuse) + ' - ' + formatNumber(leg * leg),
      'b = ' + formatNumber(value, 4),
    ],
  };
}

export interface Point {
  x: number;
  y: number;
}

export function distance(p: Point, q: Point): GeometryResult {
  const value = Math.hypot(q.x - p.x, q.y - p.y);
  return {
    label: 'Distance',
    value,
    unit: 'units',
    steps: [
      'd = √[(x₂-x₁)² + (y₂-y₁)²]',
      'd = √[(' + formatNumber(q.x - p.x) + ')² + (' + formatNumber(q.y - p.y) + ')²]',
      'd = ' + formatNumber(value, 4),
    ],
  };
}

export function midpoint(p: Point, q: Point): Point {
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
}

export function slope(p: Point, q: Point): number {
  if (q.x === p.x) throw new MathError('Slope is undefined for a vertical line');
  return (q.y - p.y) / (q.x - p.x);
}

/** Shoelace formula — works for any simple polygon. */
export function polygonArea(points: readonly Point[]): number {
  if (points.length < 3) throw new MathError('A polygon needs at least 3 points');
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    total += a.x * b.y - b.x * a.y;
  }
  return Math.abs(total) / 2;
}

export function interiorAngleSum(sides: number): number {
  if (sides < 3) throw new MathError('A polygon needs at least 3 sides');
  return (sides - 2) * 180;
}

export function regularPolygonInteriorAngle(sides: number): number {
  return interiorAngleSum(sides) / sides;
}

function requirePositive(values: Record<string, number>): void {
  for (const [key, value] of Object.entries(values)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new MathError(key + ' must be a positive number');
    }
  }
}
