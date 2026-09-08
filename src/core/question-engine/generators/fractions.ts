import {
  add,
  compare,
  div,
  frac,
  mul,
  sub,
  toNumber,
  toString as fracToString,
} from '../../math/fraction';
import { lcm } from '../../math/numberTheory';
import { formatNumber } from '../../utils/format';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors } from './helpers';

const fractionArithmetic = defineGenerator(
  {
    id: 'frac.arithmetic',
    name: 'Fraction Arithmetic',
    nameBn: 'ভগ্নাংশের প্রক্রিয়া',
    topicId: 'fractions',
    skillIds: ['skill.fraction-arithmetic'],
    questionType: 'mcq',
    tags: ['fractions'],
    examIds: ['exam.bcs-math', 'exam.ntrca-math'],
    minDifficulty: 2,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const cap = 4 + difficulty * 2;
    const a = frac(rng.int(1, cap), rng.int(2, cap));
    const b = frac(rng.int(1, cap), rng.int(2, cap));
    const ops = ['+', '-', '×', '÷'] as const;
    const op = ops[rng.int(0, difficulty <= 3 ? 1 : 3)];
    const result =
      op === '+' ? add(a, b) : op === '-' ? sub(a, b) : op === '×' ? mul(a, b) : div(a, b);
    const answer = fracToString(result);

    const wrong = new Set<string>();
    // Classic slips: adding numerators and denominators, forgetting to invert.
    wrong.add(fracToString(frac(a.n + b.n, a.d + b.d)));
    wrong.add(fracToString(mul(a, b)));
    wrong.add(fracToString(add(a, b)));
    wrong.add(fracToString(sub(a, b)));
    wrong.add(fracToString(frac(a.n * b.d, a.d * b.n)));
    wrong.delete(answer);

    const common = lcm(a.d, b.d);
    const steps =
      op === '+' || op === '-'
        ? [
            step('Common denominator = LCM(' + a.d + ', ' + b.d + ') = ' + common),
            step(
              fracToString(a) +
                ' = ' +
                (a.n * (common / a.d)) +
                '/' +
                common +
                ' and ' +
                fracToString(b) +
                ' = ' +
                (b.n * (common / b.d)) +
                '/' +
                common,
            ),
            step(
              'Now ' +
                (op === '+' ? 'add' : 'subtract') +
                ' the numerators: ' +
                (a.n * (common / a.d)) +
                ' ' +
                op +
                ' ' +
                (b.n * (common / b.d)) +
                ' = ' +
                (op === '+' ? a.n * (common / a.d) + b.n * (common / b.d) : a.n * (common / a.d) - b.n * (common / b.d)),
            ),
            step('Simplify: ' + answer),
          ]
        : op === '×'
          ? [
              step('Multiply numerators and denominators separately.'),
              step(a.n + '×' + b.n + ' / ' + a.d + '×' + b.d + ' = ' + a.n * b.n + '/' + a.d * b.d),
              step('Simplify: ' + answer),
            ]
          : [
              step('Dividing by a fraction means multiplying by its reciprocal.'),
              step(fracToString(a) + ' ÷ ' + fracToString(b) + ' = ' + fracToString(a) + ' × ' + b.d + '/' + b.n),
              step('Simplify: ' + answer),
            ];

    return {
      prompt: fracToString(a) + ' ' + op + ' ' + fracToString(b) + ' = ?',
      promptBn: bn(fracToString(a)) + ' ' + op + ' ' + bn(fracToString(b)) + ' = ?',
      correctAnswer: answer,
      choices: Array.from(wrong).slice(0, 3),
      params: { an: a.n, ad: a.d, bn: b.n, bd: b.d, op },
      solutionSteps: steps,
      explanation:
        op === '+' || op === '-'
          ? 'Fractions can only be added or subtracted once the denominators match.'
          : op === '×'
            ? 'For multiplication, multiply straight across — no common denominator needed.'
            : 'Division becomes multiplication by the reciprocal.',
      explanationBn:
        op === '+' || op === '-'
          ? 'হর সমান হলেই ভগ্নাংশ যোগ বা বিয়োগ করা যায়।'
          : op === '×'
            ? 'গুণে লব লবের সাথে, হর হরের সাথে গুণ হয়।'
            : 'ভাগ মানে বিপরীত ভগ্নাংশ দিয়ে গুণ।',
      hints: op === '÷' ? ['Flip the second fraction, then multiply.'] : ['Make the denominators equal first.'],
      hintsBn: op === '÷' ? ['দ্বিতীয় ভগ্নাংশটি উল্টে গুণ করুন।'] : ['প্রথমে হর সমান করুন।'],
    };
  },
);

const compareFractions = defineGenerator(
  {
    id: 'frac.compare',
    name: 'Comparing Fractions',
    nameBn: 'ভগ্নাংশের তুলনা',
    topicId: 'fractions',
    skillIds: ['skill.fraction-compare'],
    questionType: 'mcq',
    brainCategory: 'number_sense',
    tags: ['fractions', 'comparison'],
    minDifficulty: 2,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const cap = 5 + difficulty * 2;
    let a = frac(rng.int(1, cap), rng.int(2, cap));
    let b = frac(rng.int(1, cap), rng.int(2, cap));
    let guard = 0;
    while (compare(a, b) === 0 && guard++ < 10) {
      b = frac(rng.int(1, cap), rng.int(2, cap));
    }
    if (compare(a, b) === 0) b = add(b, frac(1, b.d + 1));
    const bigger = compare(a, b) > 0 ? a : b;
    const answer = fracToString(bigger);

    return {
      prompt: 'Which fraction is larger: ' + fracToString(a) + ' or ' + fracToString(b) + '?',
      promptBn: 'কোন ভগ্নাংশটি বড়: ' + bn(fracToString(a)) + ' নাকি ' + bn(fracToString(b)) + '?',
      correctAnswer: answer,
      options: [
        { id: 'a', text: fracToString(a) },
        { id: 'b', text: fracToString(b) },
      ],
      acceptedAnswers: [answer],
      params: { an: a.n, ad: a.d, bn2: b.n, bd: b.d },
      solutionSteps: [
        step('Cross multiply: ' + a.n + '×' + b.d + ' = ' + a.n * b.d + ' and ' + b.n + '×' + a.d + ' = ' + b.n * a.d),
        step(
          a.n * b.d > b.n * a.d
            ? fracToString(a) + ' is larger.'
            : fracToString(b) + ' is larger.',
        ),
        step('As decimals: ' + formatNumber(toNumber(a), 4) + ' vs ' + formatNumber(toNumber(b), 4)),
      ],
      explanation: 'Cross multiplication compares two fractions without finding a common denominator.',
      explanationBn: 'তির্যক গুণ করে হর সমান না করেই ভগ্নাংশ তুলনা করা যায়।',
    };
  },
);

const fractionOfQuantity = defineGenerator(
  {
    id: 'frac.of-quantity',
    name: 'Fraction of a Quantity',
    nameBn: 'রাশির ভগ্নাংশ',
    topicId: 'fractions',
    skillIds: ['skill.fraction-arithmetic'],
    questionType: 'numeric',
    brainCategory: 'money_math',
    tags: ['fractions', 'real-life'],
    minDifficulty: 2,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const denominator = rng.int(2, 3 + difficulty);
    const numerator = rng.int(1, denominator - 1);
    const multiplier = rng.int(2, 6 + difficulty * 3);
    const total = denominator * multiplier * 10;
    const answer = (total * numerator) / denominator;

    return {
      prompt: 'What is ' + numerator + '/' + denominator + ' of ' + total + '?',
      promptBn: bn(total) + ' এর ' + bn(numerator) + '/' + bn(denominator) + ' অংশ কত?',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
      params: { numerator, denominator, total },
      solutionSteps: [
        step('One part = ' + total + ' ÷ ' + denominator + ' = ' + total / denominator),
        step(numerator + ' parts = ' + total / denominator + ' × ' + numerator + ' = ' + answer),
      ],
      explanation: 'Divide by the denominator to find one part, then multiply by the numerator.',
      explanationBn: 'হর দিয়ে ভাগ করে এক অংশ বের করুন, তারপর লব দিয়ে গুণ করুন।',
    };
  },
);

const decimalConversion = defineGenerator(
  {
    id: 'frac.decimal-conversion',
    name: 'Fraction ↔ Decimal',
    nameBn: 'ভগ্নাংশ ↔ দশমিক',
    topicId: 'decimals',
    skillIds: ['skill.decimal-arithmetic'],
    questionType: 'mcq',
    tags: ['decimals', 'fractions'],
    minDifficulty: 2,
    maxDifficulty: 5,
  },
  ({ rng, difficulty }) => {
    const nice = [
      { f: frac(1, 2), d: '0.5' },
      { f: frac(1, 4), d: '0.25' },
      { f: frac(3, 4), d: '0.75' },
      { f: frac(1, 5), d: '0.2' },
      { f: frac(2, 5), d: '0.4' },
      { f: frac(3, 5), d: '0.6' },
      { f: frac(1, 8), d: '0.125' },
      { f: frac(3, 8), d: '0.375' },
      { f: frac(1, 10), d: '0.1' },
      { f: frac(7, 10), d: '0.7' },
      { f: frac(1, 20), d: '0.05' },
      { f: frac(9, 20), d: '0.45' },
    ];
    const picked = nice[rng.int(0, Math.min(nice.length - 1, 5 + difficulty))];
    const toDecimal = rng.bool();
    const others = nice.filter((n) => n.d !== picked.d);
    const distractors = rng
      .shuffle(others)
      .slice(0, 3)
      .map((o) => (toDecimal ? o.d : fracToString(o.f)));

    return {
      prompt: toDecimal
        ? 'Write ' + fracToString(picked.f) + ' as a decimal.'
        : 'Write ' + picked.d + ' as a fraction in lowest terms.',
      promptBn: toDecimal
        ? bn(fracToString(picked.f)) + ' কে দশমিকে লিখুন।'
        : bn(picked.d) + ' কে সরল ভগ্নাংশে লিখুন।',
      correctAnswer: toDecimal ? picked.d : fracToString(picked.f),
      choices: distractors,
      params: { n: picked.f.n, d: picked.f.d, dir: toDecimal ? 'to-decimal' : 'to-fraction' },
      solutionSteps: toDecimal
        ? [
            step('Divide the numerator by the denominator.'),
            step(picked.f.n + ' ÷ ' + picked.f.d + ' = ' + picked.d),
          ]
        : [
            step('Write the decimal over a power of ten.'),
            step(picked.d + ' = ' + Math.round(Number(picked.d) * 1000) + '/1000'),
            step('Simplify to ' + fracToString(picked.f)),
          ],
      explanation: 'A fraction is a division, so every terminating decimal is a fraction over a power of ten.',
      explanationBn: 'ভগ্নাংশ মানেই ভাগ; তাই প্রতিটি সসীম দশমিককে ১০ এর ঘাতের উপর লেখা যায়।',
    };
  },
);

export const FRACTION_GENERATORS: QuestionGenerator[] = [
  fractionArithmetic,
  compareFractions,
  fractionOfQuantity,
  decimalConversion,
];
