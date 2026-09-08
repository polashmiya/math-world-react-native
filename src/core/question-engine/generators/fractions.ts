import {
  add,
  compare,
  div,
  frac,
  gcd,
  mul,
  sub,
  toNumber,
  toString as fracToString,
} from '../../math/fraction';
import { lcm } from '../../math/numberTheory';
import { roundToPlace } from '../../math/arithmetic';
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

const simplifyFraction = defineGenerator(
  {
    id: 'frac.simplify',
    name: 'Simplify a Fraction',
    nameBn: 'ভগ্নাংশ সরলীকরণ',
    topicId: 'fractions',
    skillIds: ['skill.fraction-arithmetic'],
    questionType: 'mcq',
    brainCategory: 'number_sense',
    tags: ['fractions', 'simplify'],
    minDifficulty: 1,
    maxDifficulty: 5,
  },
  ({ rng, difficulty }) => {
    // Build a fully-reduced fraction, then scale it up so the question has
    // real simplifying to do.
    const cap = 3 + difficulty;
    let num = rng.int(1, cap);
    let den = rng.int(num + 1, cap + 3);
    const g = gcd(num, den);
    num = num / g;
    den = den / g;
    const scale = rng.int(2, 3 + difficulty);
    const n = num * scale;
    const d = den * scale;
    const answer = num + '/' + den;

    return {
      prompt: 'Simplify ' + n + '/' + d + ' to its lowest terms.',
      promptBn: bn(n) + '/' + bn(d) + ' কে সরলতম আকারে লিখুন।',
      correctAnswer: answer,
      choices: [n + '/' + d, num + '/' + (den * 2), (num * 2) + '/' + den],
      params: { n, d },
      solutionSteps: [
        step('Find the GCD of ' + n + ' and ' + d + ': GCD = ' + scale * g),
        step(n + ' ÷ ' + scale * g + ' = ' + num + ', ' + d + ' ÷ ' + scale * g + ' = ' + den),
        step('Simplified: ' + answer),
      ],
      explanation: 'Dividing both numerator and denominator by their GCD gives the lowest-terms form.',
      explanationBn: 'লব ও হর উভয়কে তাদের গসাগু দিয়ে ভাগ করলে সরলতম আকার পাওয়া যায়।',
      hints: ['Find the greatest common divisor of the numerator and denominator first.'],
      hintsBn: ['প্রথমে লব ও হরের গসাগু বের করুন।'],
    };
  },
);

const mixedImproper = defineGenerator(
  {
    id: 'frac.mixed-improper',
    name: 'Mixed Numbers & Improper Fractions',
    nameBn: 'মিশ্র ও অপ্রকৃত ভগ্নাংশ',
    topicId: 'fractions',
    skillIds: ['skill.fraction-arithmetic'],
    questionType: 'mcq',
    tags: ['fractions', 'mixed-numbers'],
    minDifficulty: 1,
    maxDifficulty: 5,
  },
  ({ rng, difficulty }) => {
    const whole = rng.int(1, 3 + Math.floor(difficulty / 2));
    const den = rng.int(2, 5 + difficulty);
    const num = rng.int(1, den - 1);
    const value = frac(whole * den + num, den);
    const toImproper = rng.bool();
    const mixedText = whole + ' ' + num + '/' + den;
    const improperText = fracToString(value);

    return {
      prompt: toImproper
        ? 'Write ' + mixedText + ' as an improper fraction.'
        : 'Write ' + improperText + ' as a mixed number.',
      promptBn: toImproper
        ? bn(whole) + ' ' + bn(num) + '/' + bn(den) + ' কে অপ্রকৃত ভগ্নাংশে লিখুন।'
        : bn(value.n) + '/' + bn(value.d) + ' কে মিশ্র সংখ্যায় লিখুন।',
      correctAnswer: toImproper ? improperText : mixedText,
      choices: [
        (whole + 1) + ' ' + num + '/' + den,
        num + '/' + den,
        (whole * den) + '/' + den,
      ],
      params: { whole, num, den, dir: toImproper ? 'to-improper' : 'to-mixed' },
      solutionSteps: toImproper
        ? [
            step('Multiply the whole number by the denominator: ' + whole + ' × ' + den + ' = ' + whole * den),
            step('Add the numerator: ' + whole * den + ' + ' + num + ' = ' + value.n),
            step('Result: ' + improperText),
          ]
        : [
            step('Divide the numerator by the denominator: ' + value.n + ' ÷ ' + value.d + ' = ' + whole + ' remainder ' + num),
            step('Result: ' + mixedText),
          ],
      explanation: 'A mixed number and its improper fraction always name the same amount.',
      explanationBn: 'মিশ্র সংখ্যা ও তার অপ্রকৃত ভগ্নাংশ সর্বদা একই পরিমাণ বোঝায়।',
    };
  },
);

const rounding = defineGenerator(
  {
    id: 'dec.rounding',
    name: 'Rounding Decimals',
    nameBn: 'দশমিক নিকটবর্তীকরণ',
    topicId: 'decimals',
    skillIds: ['skill.rounding'],
    questionType: 'numeric',
    brainCategory: 'number_sense',
    tags: ['decimals', 'rounding'],
    minDifficulty: 1,
    maxDifficulty: 5,
  },
  ({ rng, difficulty }) => {
    const places = difficulty <= 2 ? rng.pick([0, 1]) : rng.pick([0, 1, 2]);
    const whole = rng.int(1, 20 + difficulty * 10);
    const decimalDigits = rng.int(1, 999);
    const value = Number((whole + decimalDigits / 1000).toFixed(3));
    const result = roundToPlace(value, places);
    const placeLabel =
      places === 0 ? 'the nearest whole number' : places + ' decimal place' + (places === 1 ? '' : 's');
    const placeLabelBn = places === 0 ? 'নিকটতম পূর্ণসংখ্যায়' : bn(places) + ' দশমিক স্থানে';

    return {
      prompt: 'Round ' + value + ' to ' + placeLabel + '.',
      promptBn: bn(value) + ' কে ' + placeLabelBn + ' নিকটবর্তী করুন।',
      correctAnswer: formatNumber(result.value, Math.max(places, 0)),
      choices: numericDistractors(result.value, rng, 3, { decimals: Math.max(places, 0) }),
      params: { value, places },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'Look one digit past the rounding place: 5 or more rounds up, 4 or less rounds down.',
      explanationBn: 'নিকটবর্তীকরণের ঘরের পরের অঙ্কটি দেখুন: ৫ বা বেশি হলে বাড়ে, ৪ বা কম হলে একই থাকে।',
    };
  },
);

const decimalArithmetic = defineGenerator(
  {
    id: 'dec.arithmetic',
    name: 'Decimal Arithmetic',
    nameBn: 'দশমিকের প্রক্রিয়া',
    topicId: 'decimals',
    skillIds: ['skill.decimal-arithmetic'],
    questionType: 'numeric',
    tags: ['decimals', 'arithmetic'],
    minDifficulty: 1,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const decimals = difficulty <= 3 ? 1 : 2;
    const scale = Math.pow(10, decimals);
    const a = rng.int(1, 20 + difficulty * 10) / scale;
    const b = rng.int(1, 20 + difficulty * 10) / scale;
    const isAdd = rng.bool(0.55);
    const answer = Number((isAdd ? a + b : Math.max(a, b) - Math.min(a, b)).toFixed(decimals));
    const [big, small] = a >= b ? [a, b] : [b, a];

    return {
      prompt: isAdd ? a + ' + ' + b + ' = ?' : big + ' - ' + small + ' = ?',
      promptBn: isAdd ? bn(a) + ' + ' + bn(b) + ' = ?' : bn(big) + ' - ' + bn(small) + ' = ?',
      correctAnswer: formatNumber(answer, decimals),
      choices: numericDistractors(answer, rng, 3, { decimals }),
      params: { a, b, isAdd: isAdd ? 1 : 0 },
      solutionSteps: [
        step('Line up the decimal points, then ' + (isAdd ? 'add' : 'subtract') + ' as with whole numbers.'),
        step((isAdd ? a + ' + ' + b : big + ' - ' + small) + ' = ' + answer),
      ],
      explanation: 'Decimals add and subtract just like whole numbers once the decimal points line up.',
      explanationBn: 'দশমিক বিন্দু সমান করে নিলে দশমিক সংখ্যাও পূর্ণসংখ্যার মতোই যোগ-বিয়োগ করা যায়।',
      hints: ['Line up the decimal points before you add or subtract.'],
      hintsBn: ['যোগ বা বিয়োগের আগে দশমিক বিন্দু সমান করে নিন।'],
    };
  },
);

export const FRACTION_GENERATORS: QuestionGenerator[] = [
  fractionArithmetic,
  compareFractions,
  fractionOfQuantity,
  decimalConversion,
  simplifyFraction,
  mixedImproper,
  rounding,
  decimalArithmetic,
];
