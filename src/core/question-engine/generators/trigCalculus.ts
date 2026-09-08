import { integrateDefinite, limitAt } from '../../math/calculus';
import { lawOfCosinesAngle, trig } from '../../math/trigonometry';
import { formatNumber } from '../../utils/format';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors } from './helpers';

const trigRatios = defineGenerator(
  {
    id: 'trig.ratios',
    name: 'Trigonometric Ratios',
    nameBn: 'ত্রিকোণমিতিক অনুপাত',
    topicId: 'trigonometry',
    skillIds: ['skill.trig-ratios'],
    questionType: 'mcq',
    tags: ['trigonometry'],
    examIds: ['exam.hsc-math', 'exam.admission-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng }) => {
    const table = [
      { angle: 30, sin: '1/2', cos: '√3/2', tan: '1/√3' },
      { angle: 45, sin: '√2/2', cos: '√2/2', tan: '1' },
      { angle: 60, sin: '√3/2', cos: '1/2', tan: '√3' },
      { angle: 0, sin: '0', cos: '1', tan: '0' },
      { angle: 90, sin: '1', cos: '0', tan: 'undefined' },
    ];
    const row = table[rng.int(0, table.length - 1)];
    const fns = ['sin', 'cos', 'tan'] as const;
    const fn = fns[rng.int(0, row.angle === 90 ? 1 : 2)];
    const answer = row[fn];
    const pool = table
      .filter((r) => r.angle !== row.angle)
      .map((r) => r[fn])
      .filter((v) => v !== answer && v !== 'undefined');

    return {
      prompt: 'What is the exact value of ' + fn + ' ' + row.angle + '°?',
      promptBn: fn + ' ' + bn(row.angle) + '° এর সঠিক মান কত?',
      correctAnswer: answer,
      choices: rng.shuffle(pool).slice(0, 3),
      params: { angle: row.angle, fn },
      solutionSteps: [
        step('Use the standard-angle table.'),
        step(fn + ' ' + row.angle + '° = ' + answer),
        step('As a decimal ≈ ' + (answer === 'undefined' ? 'undefined' : formatNumber(trig(fn, row.angle).value, 4))),
      ],
      explanation: 'Standard angles come from the 30-60-90 and 45-45-90 triangles.',
      explanationBn: '৩০-৬০-৯০ ও ৪৫-৪৫-৯০ ত্রিভুজ থেকেই আদর্শ কোণের মান আসে।',
      hints: ['Draw the special right triangle.'],
      hintsBn: ['বিশেষ সমকোণী ত্রিভুজটি আঁকুন।'],
    };
  },
);

const heightsDistances = defineGenerator(
  {
    id: 'trig.heights',
    name: 'Heights & Distances',
    nameBn: 'উচ্চতা ও দূরত্ব',
    topicId: 'trigonometry',
    skillIds: ['skill.heights-distances'],
    questionType: 'word_problem',
    tags: ['trigonometry', 'real-life'],
    examIds: ['exam.hsc-math', 'exam.admission-math'],
    minDifficulty: 5,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const angle = rng.pick([30, 45, 60]);
    const base = rng.int(10, 20 + difficulty * 5);
    const height = base * trig('tan', angle).value;

    return {
      prompt:
        'From a point ' +
        base +
        ' m away from the foot of a tower, the angle of elevation of its top is ' +
        angle +
        '°. Find the height of the tower.',
      promptBn:
        'একটি টাওয়ারের পাদদেশ থেকে ' +
        bn(base) +
        ' মিটার দূরের একটি বিন্দু থেকে চূড়ার উন্নতি কোণ ' +
        bn(angle) +
        '°। টাওয়ারের উচ্চতা কত?',
      correctAnswer: formatNumber(height, 2),
      choices: numericDistractors(height, rng, 3, { min: 0, decimals: 2 }),
      tolerance: 0.5,
      params: { angle, base },
      solutionSteps: [
        step('tan(angle) = opposite / adjacent = height / ' + base),
        step('height = ' + base + ' × tan ' + angle + '° = ' + base + ' × ' + formatNumber(trig('tan', angle).value, 4)),
        step('height ≈ ' + formatNumber(height, 2) + ' m'),
      ],
      explanation: 'The angle of elevation, the horizontal distance and the height form a right triangle.',
      explanationBn: 'উন্নতি কোণ, অনুভূমিক দূরত্ব ও উচ্চতা মিলে একটি সমকোণী ত্রিভুজ তৈরি করে।',
      hints: ['Use tan because you know the adjacent side.'],
      hintsBn: ['সংলগ্ন বাহু জানা আছে, তাই tan ব্যবহার করুন।'],
    };
  },
);

const trigIdentity = defineGenerator(
  {
    id: 'trig.identity',
    name: 'Trigonometric Identity',
    nameBn: 'ত্রিকোণমিতিক অভেদ',
    topicId: 'trigonometry',
    skillIds: ['skill.trig-identities'],
    questionType: 'mcq',
    tags: ['trigonometry', 'identity'],
    examIds: ['exam.hsc-math'],
    minDifficulty: 5,
    maxDifficulty: 9,
  },
  ({ rng }) => {
    const items = [
      { q: 'sin²θ + cos²θ', a: '1', wrong: ['0', '2', 'tan²θ'] },
      { q: '1 + tan²θ', a: 'sec²θ', wrong: ['cosec²θ', 'cot²θ', 'sin²θ'] },
      { q: '1 + cot²θ', a: 'cosec²θ', wrong: ['sec²θ', 'tan²θ', 'cos²θ'] },
      { q: 'sin θ / cos θ', a: 'tan θ', wrong: ['cot θ', 'sec θ', 'cosec θ'] },
      { q: '2 sin θ cos θ', a: 'sin 2θ', wrong: ['cos 2θ', 'tan 2θ', '2 tan θ'] },
      { q: 'cos²θ - sin²θ', a: 'cos 2θ', wrong: ['sin 2θ', '1', '2cos θ'] },
    ];
    const item = items[rng.int(0, items.length - 1)];

    return {
      prompt: 'Simplify: ' + item.q,
      promptBn: 'সরল করুন: ' + item.q,
      correctAnswer: item.a,
      choices: item.wrong,
      params: { q: item.q },
      solutionSteps: [
        step('Recall the standard identities.'),
        step(item.q + ' = ' + item.a),
      ],
      explanation: 'These identities follow from the Pythagorean relation on the unit circle.',
      explanationBn: 'এই অভেদগুলো একক বৃত্তে পিথাগোরাসের সম্পর্ক থেকে আসে।',
    };
  },
);

const cosineRule = defineGenerator(
  {
    id: 'trig.cosine-rule',
    name: 'Law of Cosines',
    nameBn: 'কোসাইন সূত্র',
    topicId: 'trigonometry',
    skillIds: ['skill.trig-ratios'],
    questionType: 'numeric',
    tags: ['trigonometry'],
    examIds: ['exam.hsc-math'],
    minDifficulty: 6,
    maxDifficulty: 9,
  },
  ({ rng }) => {
    const sets = [
      [3, 4, 5],
      [5, 12, 13],
      [7, 8, 9],
      [6, 7, 8],
      [8, 15, 17],
    ];
    const [a, b, c] = sets[rng.int(0, sets.length - 1)];
    const result = lawOfCosinesAngle(a, b, c);

    return {
      prompt: 'A triangle has sides a = ' + a + ', b = ' + b + ', c = ' + c + '. Find angle C in degrees.',
      promptBn: 'একটি ত্রিভুজের বাহু a = ' + bn(a) + ', b = ' + bn(b) + ', c = ' + bn(c) + '। C কোণ কত ডিগ্রি?',
      correctAnswer: formatNumber(result.value, 2),
      choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
      tolerance: 0.5,
      params: { a, b, c },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'The law of cosines generalises Pythagoras to any triangle.',
      explanationBn: 'কোসাইন সূত্র পিথাগোরাসকে যেকোনো ত্রিভুজে সাধারণীকরণ করে।',
    };
  },
);

const derivative = defineGenerator(
  {
    id: 'calc.derivative',
    name: 'Differentiate a Polynomial',
    nameBn: 'বহুপদীর অন্তরজ',
    topicId: 'differentiation',
    skillIds: ['skill.derivative'],
    questionType: 'mcq',
    tags: ['calculus', 'derivative'],
    examIds: ['exam.hsc-math', 'exam.admission-math'],
    minDifficulty: 5,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const a = rng.int(1, 3 + Math.floor(difficulty / 2));
    const b = rng.int(1, 6);
    const c = rng.int(-8, 9);
    const power = rng.int(2, difficulty <= 6 ? 3 : 4);
    const answer = buildDerivativeString(a, power, b);

    return {
      prompt: 'Differentiate f(x) = ' + a + 'x^' + power + ' + ' + b + 'x + ' + c,
      promptBn: 'অন্তরীকরণ করুন: f(x) = ' + bn(a + 'x^' + power + ' + ' + b + 'x + ' + c),
      correctAnswer: answer,
      choices: [
        buildDerivativeString(a, power + 1, b),
        buildDerivativeString(a * power, power, b),
        buildDerivativeString(a, power, b + 1),
      ],
      params: { a, b, c, power },
      solutionSteps: [
        step('Power rule: d/dx xⁿ = n·xⁿ⁻¹'),
        step('d/dx ' + a + 'x^' + power + ' = ' + a * power + 'x^' + (power - 1)),
        step('d/dx ' + b + 'x = ' + b + ', and the constant differentiates to 0.'),
        step("f'(x) = " + answer),
      ],
      explanation: 'Differentiate term by term; constants vanish.',
      explanationBn: 'পদে পদে অন্তরীকরণ করুন; ধ্রুবকের অন্তরজ শূন্য।',
      hints: ['Multiply by the power, then reduce the power by one.'],
      hintsBn: ['ঘাত দিয়ে গুণ করে ঘাত এক কমান।'],
    };
  },
);

function buildDerivativeString(coefficient: number, power: number, linear: number): string {
  const lead = coefficient * power;
  const reduced = power - 1;
  const first = reduced === 1 ? lead + 'x' : lead + 'x^' + reduced;
  return first + ' + ' + linear;
}

const definiteIntegral = defineGenerator(
  {
    id: 'calc.integral',
    name: 'Definite Integral',
    nameBn: 'নির্দিষ্ট সমাকলন',
    topicId: 'integration',
    skillIds: ['skill.integral'],
    questionType: 'numeric',
    tags: ['calculus', 'integral'],
    examIds: ['exam.hsc-math'],
    minDifficulty: 6,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const power = rng.int(1, difficulty <= 7 ? 2 : 3);
    const coefficient = rng.int(1, 4);
    const upper = rng.int(2, 4);
    const source = coefficient + 'x^' + power;
    const exact = (coefficient * Math.pow(upper, power + 1)) / (power + 1);
    const numeric = integrateDefinite(source, 0, upper);

    return {
      prompt: 'Evaluate ∫₀^' + upper + ' ' + coefficient + 'x^' + power + ' dx',
      promptBn: 'মান নির্ণয় করুন: ∫₀^' + bn(upper) + ' ' + bn(coefficient + 'x^' + power) + ' dx',
      correctAnswer: formatNumber(exact, 4),
      choices: numericDistractors(exact, rng, 3, { decimals: 2, min: 0 }),
      tolerance: 0.05,
      params: { coefficient, power, upper },
      solutionSteps: [
        step('∫ xⁿ dx = xⁿ⁺¹/(n+1)'),
        step('Antiderivative = ' + coefficient + 'x^' + (power + 1) + '/' + (power + 1)),
        step(
          'Evaluate from 0 to ' +
            upper +
            ': ' +
            coefficient +
            '(' +
            upper +
            ')^' +
            (power + 1) +
            '/' +
            (power + 1) +
            ' = ' +
            formatNumber(exact, 4),
        ),
        step('Numeric check (' + numeric.method + '): ' + formatNumber(numeric.value, 4)),
      ],
      explanation: 'Integrate by raising the power and dividing by the new power.',
      explanationBn: 'ঘাত এক বাড়িয়ে নতুন ঘাত দিয়ে ভাগ করলেই সমাকলন হয়।',
    };
  },
);

const limitQuestion = defineGenerator(
  {
    id: 'calc.limit',
    name: 'Evaluate a Limit',
    nameBn: 'সীমা নির্ণয়',
    topicId: 'calculus',
    skillIds: ['skill.limits'],
    questionType: 'numeric',
    tags: ['calculus', 'limit'],
    examIds: ['exam.hsc-math', 'exam.admission-math'],
    minDifficulty: 6,
    maxDifficulty: 9,
  },
  ({ rng }) => {
    const a = rng.int(1, 6);
    // lim x→a (x² - a²)/(x - a) = 2a
    const source = '(x^2 - ' + a * a + ')/(x - ' + a + ')';
    const exact = 2 * a;
    const numeric = limitAt(source, a);

    return {
      prompt: 'Evaluate lim(x→' + a + ') ' + source,
      promptBn: 'মান নির্ণয় করুন: lim(x→' + bn(a) + ') ' + bn(source),
      correctAnswer: String(exact),
      choices: numericDistractors(exact, rng, 3, { integer: true }),
      params: { a },
      solutionSteps: [
        step('Direct substitution gives 0/0, so factorise first.'),
        step('x² - ' + a * a + ' = (x - ' + a + ')(x + ' + a + ')'),
        step('Cancel (x - ' + a + '): the limit is x + ' + a + ' at x = ' + a + ' → ' + exact),
        step('Numeric check: ' + formatNumber(numeric.value ?? exact, 4)),
      ],
      explanation: 'A 0/0 form means a common factor is hiding — cancel it before substituting.',
      explanationBn: '০/০ আকার মানে সাধারণ উৎপাদক আছে; আগে তা বাতিল করুন।',
      hints: ['Factorise the difference of squares.'],
      hintsBn: ['বর্গের অন্তর সূত্রে উৎপাদক করুন।'],
    };
  },
);

export const TRIG_CALCULUS_GENERATORS: QuestionGenerator[] = [
  trigRatios,
  heightsDistances,
  trigIdentity,
  cosineRule,
  derivative,
  definiteIntegral,
  limitQuestion,
];
