import { MathError } from '../errors';
import { formatNumber } from '../utils/format';
import { frac, toString as fracToString, type Fraction } from './fraction';

/**
 * Business/real-life arithmetic used by generators, the solver and Real Life
 * Mathematics (spec §22). Every function returns its working out.
 */
export interface ArithmeticResult {
  label: string;
  value: number;
  steps: string[];
}

export function percentageOf(percent: number, amount: number): ArithmeticResult {
  const value = (percent / 100) * amount;
  return {
    label: percent + '% of ' + formatNumber(amount),
    value,
    steps: [
      formatNumber(percent) + '% of ' + formatNumber(amount),
      '= (' + formatNumber(percent) + ' / 100) × ' + formatNumber(amount),
      '= ' + formatNumber(value, 4),
    ],
  };
}

/**
 * Rounds `value` to `places` decimal digits (negative `places` rounds to
 * tens/hundreds/etc — e.g. -1 rounds to the nearest ten).
 */
export function roundToPlace(value: number, places: number): ArithmeticResult {
  const factor = Math.pow(10, places);
  const rounded = Math.round(value * factor) / factor;
  const placeLabel =
    places > 0
      ? places + ' decimal place' + (places === 1 ? '' : 's')
      : places === 0
        ? 'the nearest whole number'
        : 'the nearest ' + Math.pow(10, -places);
  return {
    label: 'Round ' + formatNumber(value) + ' to ' + placeLabel,
    value: rounded,
    steps: [
      'Look at the digit right after the place you are rounding to.',
      '4 or below rounds down, 5 or above rounds up.',
      formatNumber(value) + ' rounds to ' + formatNumber(rounded, Math.max(places, 0)),
    ],
  };
}

export function whatPercent(part: number, whole: number): ArithmeticResult {
  if (whole === 0) throw new MathError('The whole cannot be zero');
  const value = (part / whole) * 100;
  return {
    label: formatNumber(part) + ' is what percent of ' + formatNumber(whole),
    value,
    steps: [
      '(part / whole) × 100',
      '= (' + formatNumber(part) + ' / ' + formatNumber(whole) + ') × 100',
      '= ' + formatNumber(value, 4) + '%',
    ],
  };
}

export function percentChange(from: number, to: number): ArithmeticResult {
  if (from === 0) throw new MathError('The original value cannot be zero');
  const value = ((to - from) / Math.abs(from)) * 100;
  return {
    label: 'Percentage change',
    value,
    steps: [
      '((new - old) / old) × 100',
      '= ((' + formatNumber(to) + ' - ' + formatNumber(from) + ') / ' + formatNumber(from) + ') × 100',
      '= ' + formatNumber(value, 4) + '% ' + (value >= 0 ? 'increase' : 'decrease'),
    ],
  };
}

export function applyDiscount(price: number, discountPercent: number): ArithmeticResult {
  const discount = (discountPercent / 100) * price;
  const value = price - discount;
  return {
    label: 'Price after discount',
    value,
    steps: [
      'discount = ' + formatNumber(discountPercent) + '% × ' + formatNumber(price) + ' = ' + formatNumber(discount, 2),
      'final price = ' + formatNumber(price) + ' - ' + formatNumber(discount, 2) + ' = ' + formatNumber(value, 2),
    ],
  };
}

export function applyVat(price: number, vatPercent: number): ArithmeticResult {
  const vat = (vatPercent / 100) * price;
  const value = price + vat;
  return {
    label: 'Price including VAT',
    value,
    steps: [
      'VAT = ' + formatNumber(vatPercent) + '% × ' + formatNumber(price) + ' = ' + formatNumber(vat, 2),
      'total = ' + formatNumber(price) + ' + ' + formatNumber(vat, 2) + ' = ' + formatNumber(value, 2),
    ],
  };
}

export function profitLoss(costPrice: number, sellingPrice: number): ArithmeticResult {
  if (costPrice <= 0) throw new MathError('Cost price must be positive');
  const profit = sellingPrice - costPrice;
  const value = (profit / costPrice) * 100;
  return {
    label: profit >= 0 ? 'Profit percent' : 'Loss percent',
    value,
    steps: [
      (profit >= 0 ? 'profit' : 'loss') +
        ' = |' +
        formatNumber(sellingPrice) +
        ' - ' +
        formatNumber(costPrice) +
        '| = ' +
        formatNumber(Math.abs(profit), 2),
      (profit >= 0 ? 'profit%' : 'loss%') +
        ' = (' +
        formatNumber(Math.abs(profit), 2) +
        ' / ' +
        formatNumber(costPrice) +
        ') × 100 = ' +
        formatNumber(Math.abs(value), 2) +
        '%',
    ],
  };
}

export function simpleInterest(principal: number, ratePercent: number, years: number): ArithmeticResult {
  const value = (principal * ratePercent * years) / 100;
  return {
    label: 'Simple interest',
    value,
    steps: [
      'I = P × r × t / 100',
      'I = ' + formatNumber(principal) + ' × ' + formatNumber(ratePercent) + ' × ' + formatNumber(years) + ' / 100',
      'I = ' + formatNumber(value, 2),
      'Total amount = ' + formatNumber(principal + value, 2),
    ],
  };
}

export function compoundInterest(
  principal: number,
  ratePercent: number,
  years: number,
  timesPerYear = 1,
): ArithmeticResult {
  if (timesPerYear <= 0) throw new MathError('Compounding frequency must be positive');
  const amount = principal * Math.pow(1 + ratePercent / 100 / timesPerYear, timesPerYear * years);
  const value = amount - principal;
  return {
    label: 'Compound interest',
    value,
    steps: [
      'A = P(1 + r/n)^(nt)',
      'A = ' +
        formatNumber(principal) +
        '(1 + ' +
        formatNumber(ratePercent) +
        '/100/' +
        timesPerYear +
        ')^(' +
        timesPerYear +
        '×' +
        formatNumber(years) +
        ')',
      'A = ' + formatNumber(amount, 2),
      'Interest = A - P = ' + formatNumber(value, 2),
    ],
  };
}

export function averageSpeed(distance: number, timeHours: number): ArithmeticResult {
  if (timeHours <= 0) throw new MathError('Time must be positive');
  const value = distance / timeHours;
  return {
    label: 'Average speed',
    value,
    steps: [
      'speed = distance / time',
      'speed = ' + formatNumber(distance) + ' / ' + formatNumber(timeHours),
      'speed = ' + formatNumber(value, 4),
    ],
  };
}

export function timeToWorkTogether(hoursA: number, hoursB: number): ArithmeticResult {
  if (hoursA <= 0 || hoursB <= 0) throw new MathError('Both times must be positive');
  const value = 1 / (1 / hoursA + 1 / hoursB);
  return {
    label: 'Time working together',
    value,
    steps: [
      'rate A = 1/' + formatNumber(hoursA) + ', rate B = 1/' + formatNumber(hoursB),
      'combined rate = 1/' + formatNumber(hoursA) + ' + 1/' + formatNumber(hoursB) + ' = ' + formatNumber(1 / hoursA + 1 / hoursB, 6),
      'time = 1 / combined rate = ' + formatNumber(value, 4),
    ],
  };
}

export function ratioShare(total: number, parts: readonly number[]): { values: number[]; steps: string[] } {
  if (parts.length < 2) throw new MathError('A ratio needs at least two parts');
  if (parts.some((p) => p <= 0)) throw new MathError('Ratio parts must be positive');
  const totalParts = parts.reduce((a, b) => a + b, 0);
  const values = parts.map((p) => (total * p) / totalParts);
  return {
    values,
    steps: [
      'total parts = ' + parts.join(' + ') + ' = ' + totalParts,
      'one part = ' + formatNumber(total) + ' / ' + totalParts + ' = ' + formatNumber(total / totalParts, 4),
      'shares = ' + values.map((v) => formatNumber(v, 2)).join(', '),
    ],
  };
}

export function simplifyRatio(a: number, b: number): { ratio: string; steps: string[]; fraction: Fraction } {
  const f = frac(a, b);
  return {
    ratio: f.n + ' : ' + f.d,
    fraction: f,
    steps: [
      a + ' : ' + b,
      'divide both sides by their GCD',
      '= ' + f.n + ' : ' + f.d + '  (as a fraction ' + fracToString(f) + ')',
    ],
  };
}

export function unitaryMethod(
  quantityA: number,
  costA: number,
  quantityB: number,
): ArithmeticResult {
  if (quantityA === 0) throw new MathError('The known quantity cannot be zero');
  const unit = costA / quantityA;
  const value = unit * quantityB;
  return {
    label: 'Cost of ' + formatNumber(quantityB),
    value,
    steps: [
      formatNumber(quantityA) + ' costs ' + formatNumber(costA),
      '1 costs ' + formatNumber(costA) + ' / ' + formatNumber(quantityA) + ' = ' + formatNumber(unit, 4),
      formatNumber(quantityB) + ' costs ' + formatNumber(unit, 4) + ' × ' + formatNumber(quantityB) + ' = ' + formatNumber(value, 2),
    ],
  };
}

export function mixtureAlligation(
  cheaperRate: number,
  dearerRate: number,
  meanRate: number,
): { ratio: string; steps: string[] } {
  if (meanRate <= Math.min(cheaperRate, dearerRate) || meanRate >= Math.max(cheaperRate, dearerRate)) {
    throw new MathError('The mean rate must lie between the two rates');
  }
  const cheaperPart = dearerRate - meanRate;
  const dearerPart = meanRate - cheaperRate;
  const f = frac(cheaperPart, dearerPart);
  return {
    ratio: f.n + ' : ' + f.d,
    steps: [
      'cheaper : dearer = (dearer - mean) : (mean - cheaper)',
      '= (' + formatNumber(dearerRate) + ' - ' + formatNumber(meanRate) + ') : (' + formatNumber(meanRate) + ' - ' + formatNumber(cheaperRate) + ')',
      '= ' + formatNumber(cheaperPart) + ' : ' + formatNumber(dearerPart) + ' = ' + f.n + ' : ' + f.d,
    ],
  };
}

/** Long-division style remainder work used by primary content. */
export function divisionWithRemainder(dividend: number, divisor: number): {
  quotient: number;
  remainder: number;
  steps: string[];
} {
  if (divisor === 0) throw new MathError('Cannot divide by zero');
  const quotient = Math.trunc(dividend / divisor);
  const remainder = dividend - quotient * divisor;
  return {
    quotient,
    remainder,
    steps: [
      dividend + ' ÷ ' + divisor,
      'quotient = ' + quotient,
      'remainder = ' + dividend + ' - (' + quotient + ' × ' + divisor + ') = ' + remainder,
    ],
  };
}

export function convertUnit(value: number, factor: number, fromUnit: string, toUnit: string): ArithmeticResult {
  const out = value * factor;
  return {
    label: fromUnit + ' → ' + toUnit,
    value: out,
    steps: [
      '1 ' + fromUnit + ' = ' + formatNumber(factor) + ' ' + toUnit,
      formatNumber(value) + ' ' + fromUnit + ' = ' + formatNumber(value) + ' × ' + formatNumber(factor),
      '= ' + formatNumber(out, 4) + ' ' + toUnit,
    ],
  };
}
