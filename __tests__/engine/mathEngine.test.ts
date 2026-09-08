import {
  add,
  div,
  frac,
  fromDecimal,
  gcd,
  lcm,
  mul,
  parseFraction,
  sub,
  toNumber,
  toString as fracToString,
} from '../../src/core/math/fraction';
import {
  combinations,
  divisorCount,
  factorial,
  factorizationString,
  fibonacci,
  isPrime,
  permutations,
  primeFactorize,
  primesUpTo,
} from '../../src/core/math/numberTheory';
import {
  evaluate,
  expressionsEquivalent,
  parseExpression,
  nodeToString,
} from '../../src/core/math/expression';
import {
  parsePolynomial,
  polyDegree,
  polyDerivative,
  polyEval,
  polyRoots,
  polyToString,
} from '../../src/core/math/polynomial';
import { parseLinearSystem, solveEquation, solveLinearSystem } from '../../src/core/math/equation';
import * as Geometry from '../../src/core/math/geometry';
import { lawOfCosinesAngle, trig } from '../../src/core/math/trigonometry';
import { linearRegression, summarize } from '../../src/core/math/statistics';
import { binomialProbability, runSimulation, simpleProbability } from '../../src/core/math/probability';
import {
  determinant,
  inverse,
  multiplyMatrices,
  parseMatrix,
  rank,
  transpose,
} from '../../src/core/math/matrix';
import { differentiate, integrateDefinite, limitAt, findRootNewton } from '../../src/core/math/calculus';
import {
  compoundInterest,
  percentageOf,
  profitLoss,
  simpleInterest,
  timeToWorkTogether,
} from '../../src/core/math/arithmetic';
import { createRng } from '../../src/core/utils/random';
import { MathError } from '../../src/core/errors';

describe('fractions', () => {
  it('reduces to lowest terms and normalises sign', () => {
    expect(fracToString(frac(6, 8))).toBe('3/4');
    expect(fracToString(frac(3, -6))).toBe('-1/2');
    expect(fracToString(frac(-4, -8))).toBe('1/2');
    expect(fracToString(frac(10, 5))).toBe('2');
  });

  it('adds exactly where floats fail', () => {
    const exact = add(frac(1, 3), frac(1, 6));
    expect(fracToString(exact)).toBe('1/2');
    expect(toNumber(exact)).toBeCloseTo(0.5, 12);
    expect(fracToString(add(frac(1, 10), frac(2, 10)))).toBe('3/10');
  });

  it('supports the four operations', () => {
    expect(fracToString(sub(frac(3, 4), frac(1, 4)))).toBe('1/2');
    expect(fracToString(mul(frac(2, 3), frac(3, 8)))).toBe('1/4');
    expect(fracToString(div(frac(2, 3), frac(4, 9)))).toBe('3/2');
  });

  it('rejects a zero denominator', () => {
    expect(() => frac(1, 0)).toThrow(MathError);
    expect(() => div(frac(1, 2), frac(0))).toThrow(MathError);
  });

  it('converts decimals to exact fractions', () => {
    expect(fracToString(fromDecimal(0.75))).toBe('3/4');
    expect(fracToString(fromDecimal(0.125))).toBe('1/8');
    expect(fracToString(fromDecimal(-2.5))).toBe('-5/2');
  });

  it('parses every notation students type', () => {
    expect(fracToString(parseFraction('3/4')!)).toBe('3/4');
    expect(fracToString(parseFraction('1 3/4')!)).toBe('7/4');
    expect(fracToString(parseFraction('-1 1/2')!)).toBe('-3/2');
    expect(fracToString(parseFraction('0.6')!)).toBe('3/5');
    expect(fracToString(parseFraction('25%')!)).toBe('1/4');
    expect(parseFraction('banana')).toBeNull();
    expect(parseFraction('3/0')).toBeNull();
  });

  it('computes gcd and lcm', () => {
    expect(gcd(48, 18)).toBe(6);
    expect(gcd(-48, 18)).toBe(6);
    expect(lcm(4, 6)).toBe(12);
    expect(lcm(0, 5)).toBe(0);
  });
});

describe('number theory', () => {
  it('identifies primes', () => {
    expect(isPrime(2)).toBe(true);
    expect(isPrime(97)).toBe(true);
    expect(isPrime(1)).toBe(false);
    expect(isPrime(91)).toBe(false);
    expect(primesUpTo(20)).toEqual([2, 3, 5, 7, 11, 13, 17, 19]);
  });

  it('factorises integers', () => {
    expect(primeFactorize(360)).toEqual([
      { prime: 2, exponent: 3 },
      { prime: 3, exponent: 2 },
      { prime: 5, exponent: 1 },
    ]);
    expect(factorizationString(360)).toBe('2^3 × 3^2 × 5');
    expect(divisorCount(360)).toBe(24);
  });

  it('counts arrangements', () => {
    expect(factorial(5)).toBe(120);
    expect(permutations(5, 2)).toBe(20);
    expect(combinations(5, 2)).toBe(10);
    expect(combinations(52, 5)).toBe(2598960);
    expect(fibonacci(10)).toBe(55);
  });
});

describe('expression parser', () => {
  it('respects operator precedence', () => {
    expect(evaluate('2 + 3 * 4')).toBe(14);
    expect(evaluate('(2 + 3) * 4')).toBe(20);
    expect(evaluate('2 ^ 3 ^ 2')).toBe(512);
    expect(evaluate('-3 ^ 2')).toBe(-9);
    expect(evaluate('10 - 2 - 3')).toBe(5);
    expect(evaluate('12 / 4 / 3')).toBe(1);
  });

  it('handles implicit multiplication without breaking powers', () => {
    expect(evaluate('2x', { x: 5 })).toBe(10);
    expect(evaluate('2x^2', { x: 3 })).toBe(18);
    expect(evaluate('3(x + 1)', { x: 2 })).toBe(9);
    expect(evaluate('(x + 1)(x - 1)', { x: 4 })).toBe(15);
  });

  it('evaluates functions and constants', () => {
    expect(evaluate('sqrt(16)')).toBe(4);
    expect(evaluate('sind(30)')).toBeCloseTo(0.5, 10);
    expect(evaluate('max(3, 9, 4)')).toBe(9);
    expect(evaluate('pi')).toBeCloseTo(Math.PI, 12);
    expect(evaluate('log(1000)')).toBeCloseTo(3, 10);
  });

  it('normalises unicode maths input', () => {
    expect(evaluate('6 × 7')).toBe(42);
    expect(evaluate('10 ÷ 4')).toBe(2.5);
    expect(evaluate('√81')).toBe(9);
  });

  it('reports clear errors', () => {
    expect(() => evaluate('2 +')).toThrow(MathError);
    expect(() => evaluate('2 $ 3')).toThrow(MathError);
    expect(() => evaluate('1/0')).toThrow(MathError);
    expect(() => evaluate('y + 1')).toThrow(MathError);
  });

  it('round-trips to a readable string', () => {
    expect(nodeToString(parseExpression('2*x + 3'))).toBe('2 * x + 3');
  });

  it('checks equivalence by sampling', () => {
    expect(expressionsEquivalent('2(x+1)', '2x + 2')).toBe(true);
    expect(expressionsEquivalent('(x+1)^2', 'x^2 + 2x + 1')).toBe(true);
    expect(expressionsEquivalent('x^2', 'x^3')).toBe(false);
  });
});

describe('polynomials', () => {
  it('expands expressions into coefficients', () => {
    expect(parsePolynomial('(x + 2)(x - 3)')).toEqual([-6, -1, 1]);
    expect(parsePolynomial('3x^2 - 5')).toEqual([-5, 0, 3]);
    expect(parsePolynomial('sin(x)')).toBeNull();
  });

  it('evaluates, differentiates and prints', () => {
    const p = [-6, -1, 1];
    expect(polyEval(p, 3)).toBe(0);
    expect(polyDegree(p)).toBe(2);
    expect(polyDerivative(p)).toEqual([-1, 2]);
    expect(polyToString(p)).toBe('x^2 - x - 6');
  });

  it('finds roots of higher-degree polynomials', () => {
    const roots = polyRoots(parsePolynomial('x^3 - 6x^2 + 11x - 6')!);
    expect(roots.real.map((r) => Math.round(r * 1e6) / 1e6)).toEqual([1, 2, 3]);
  });
});

describe('equation solver', () => {
  it('solves linear equations with steps', () => {
    const s = solveEquation('3x + 5 = 20');
    expect(s.realRoots[0]).toBeCloseTo(5, 12);
    expect(s.answers[0]).toBe('x = 5');
    expect(s.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps fractional answers exact-looking', () => {
    expect(solveEquation('2x + 1 = 4').answers[0]).toBe('x = 3/2');
  });

  it('solves quadratics including repeated and complex roots', () => {
    const two = solveEquation('x^2 - 5x + 6 = 0');
    expect(two.realRoots).toEqual([2, 3]);
    const one = solveEquation('x^2 - 4x + 4 = 0');
    expect(one.realRoots).toEqual([2]);
    const none = solveEquation('x^2 + 1 = 0');
    expect(none.realRoots).toEqual([]);
    expect(none.complexRoots).toHaveLength(2);
  });

  it('detects identities and contradictions', () => {
    expect(solveEquation('2(x + 1) = 2x + 2').identity).toBe(true);
    expect(solveEquation('x + 1 = x + 2').contradiction).toBe(true);
  });

  it('solves 2x2 and 3x3 linear systems', () => {
    const two = parseLinearSystem(['2x + 3y = 12', 'x - y = 1']);
    const solvedTwo = solveLinearSystem(two.rows, two.variables);
    expect(solvedTwo.status).toBe('unique');
    expect(solvedTwo.values!.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([3, 2]);

    const three = parseLinearSystem(['x + y + z = 6', '2y + 5z = -4', '2x + 5y - z = 27']);
    const solvedThree = solveLinearSystem(three.rows, three.variables);
    expect(solvedThree.values!.map((v) => Math.round(v))).toEqual([5, 3, -2]);
  });

  it('reports inconsistent systems', () => {
    const sys = parseLinearSystem(['x + y = 2', '2x + 2y = 5']);
    expect(solveLinearSystem(sys.rows, sys.variables).status).toBe('none');
  });
});

describe('geometry', () => {
  it('computes areas and volumes', () => {
    expect(Geometry.triangleArea(10, 6).value).toBe(30);
    expect(Geometry.triangleAreaHeron(3, 4, 5).value).toBeCloseTo(6, 10);
    expect(Geometry.circleArea(7).value).toBeCloseTo(153.938, 3);
    expect(Geometry.sphereVolume(3).value).toBeCloseTo(113.097, 3);
    expect(Geometry.pythagorasHypotenuse(3, 4).value).toBe(5);
    expect(Geometry.polygonArea([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
      { x: 0, y: 3 },
    ])).toBe(12);
    expect(Geometry.regularPolygonInteriorAngle(6)).toBe(120);
  });

  it('rejects impossible shapes', () => {
    expect(() => Geometry.triangleAreaHeron(1, 2, 10)).toThrow(MathError);
    expect(() => Geometry.circleArea(-1)).toThrow(MathError);
  });
});

describe('trigonometry', () => {
  it('returns exact values where they exist', () => {
    expect(trig('sin', 30).value).toBeCloseTo(0.5, 12);
    expect(trig('sin', 30).exact).toBe('1/2');
    expect(trig('cos', 60).exact).toBe('1/2');
    expect(() => trig('tan', 90)).toThrow(MathError);
  });

  it('applies the law of cosines', () => {
    expect(lawOfCosinesAngle(3, 4, 5).value).toBeCloseTo(90, 8);
  });
});

describe('statistics', () => {
  it('summarises a data set', () => {
    const s = summarize([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s.mean).toBe(5);
    expect(s.median).toBe(4.5);
    expect(s.modes).toEqual([4]);
    expect(s.stdDevPopulation).toBeCloseTo(2, 10);
    expect(s.range).toBe(7);
  });

  it('fits a regression line', () => {
    const r = linearRegression([1, 2, 3, 4], [2, 4, 6, 8]);
    expect(r.slope).toBeCloseTo(2, 10);
    expect(r.intercept).toBeCloseTo(0, 10);
    expect(r.r).toBeCloseTo(1, 10);
  });
});

describe('probability', () => {
  it('computes simple and binomial probabilities', () => {
    expect(simpleProbability(3, 6).exact).toBe('1/2');
    expect(binomialProbability(5, 2, 0.5).probability).toBeCloseTo(0.3125, 10);
  });

  it('converges to theory with more trials', () => {
    const few = runSimulation('coin', 20, createRng('seed-a'));
    const many = runSimulation('coin', 20000, createRng('seed-a'));
    expect(few.trials).toBe(20);
    expect(many.maxDeviation).toBeLessThan(0.03);
    expect(many.outcomes.reduce((a, o) => a + o.count, 0)).toBe(20000);
  });

  it('is reproducible for a given seed', () => {
    const a = runSimulation('two_dice_sum', 500, createRng(42));
    const b = runSimulation('two_dice_sum', 500, createRng(42));
    expect(a.outcomes.map((o) => o.count)).toEqual(b.outcomes.map((o) => o.count));
  });
});

describe('matrices', () => {
  it('multiplies, transposes and inverts', () => {
    const a = parseMatrix('1 2; 3 4');
    expect(determinant(a)).toBe(-2);
    expect(multiplyMatrices(a, [[1, 0], [0, 1]])).toEqual(a);
    expect(transpose(a)).toEqual([[1, 3], [2, 4]]);
    const inv = inverse(a).matrix;
    const product = multiplyMatrices(a, inv);
    expect(product[0][0]).toBeCloseTo(1, 10);
    expect(product[0][1]).toBeCloseTo(0, 10);
    expect(rank(a)).toBe(2);
  });

  it('computes 3x3 determinants and rejects singular inverses', () => {
    expect(determinant(parseMatrix('6 1 1; 4 -2 5; 2 8 7'))).toBeCloseTo(-306, 8);
    expect(() => inverse(parseMatrix('1 2; 2 4'))).toThrow(MathError);
  });
});

describe('calculus', () => {
  it('differentiates symbolically', () => {
    expect(differentiate('x^3').derivative).toBe('3 * x ^ 2');
    expect(differentiate('3x^2 + 2x + 1').derivative).toContain('6 * x');
    expect(differentiate('sin(x)').derivative).toBe('cos(x)');
  });

  it('integrates numerically', () => {
    expect(integrateDefinite('x^2', 0, 3).value).toBeCloseTo(9, 6);
    expect(integrateDefinite('sin(x)', 0, Math.PI).value).toBeCloseTo(2, 6);
  });

  it('finds limits and roots', () => {
    expect(limitAt('(x^2 - 1)/(x - 1)', 1).value).toBeCloseTo(2, 4);
    expect(limitAt('abs(x)/x', 0).value).toBeNull();
    expect(findRootNewton('x^2 - 2', 1)).toBeCloseTo(Math.SQRT2, 8);
  });
});

describe('real-life arithmetic', () => {
  it('handles percentages, interest and work', () => {
    expect(percentageOf(15, 2400).value).toBe(360);
    expect(simpleInterest(10000, 5, 2).value).toBe(1000);
    expect(compoundInterest(10000, 10, 2).value).toBeCloseTo(2100, 6);
    expect(profitLoss(500, 600).value).toBeCloseTo(20, 10);
    expect(timeToWorkTogether(6, 3).value).toBe(2);
  });
});
