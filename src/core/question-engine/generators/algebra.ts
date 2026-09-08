import { evaluate } from '../../math/expression';
import { polyEval, polyToString, type Polynomial } from '../../math/polynomial';
import { formatRoot, tryFactorQuadratic } from '../../math/equation';
import { formatNumber } from '../../utils/format';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors, twoPeople } from './helpers';

const signed = (value: number): string => (value >= 0 ? '+ ' + value : '- ' + Math.abs(value));

const solveLinear = defineGenerator(
  {
    id: 'alg.solve-linear',
    name: 'Solve a Linear Equation',
    nameBn: 'সরল সমীকরণ সমাধান',
    topicId: 'linear-equations',
    skillIds: ['skill.solve-linear'],
    questionType: 'numeric',
    tags: ['algebra', 'equation'],
    examIds: ['exam.ssc-math', 'exam.bcs-math'],
    minDifficulty: 2,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const a = rng.int(2, 3 + difficulty);
    const root = rng.int(-4 - difficulty, 8 + difficulty);
    const b = rng.int(-10 - difficulty * 2, 10 + difficulty * 2);
    const c = a * root + b;
    const prompt = a + 'x ' + signed(b) + ' = ' + c;

    return {
      prompt: 'Solve for x: ' + prompt,
      promptBn: 'x এর মান নির্ণয় করুন: ' + bn(prompt),
      correctAnswer: String(root),
      choices: numericDistractors(root, rng, 3, { integer: true }),
      params: { a, b, c },
      solutionSteps: [
        step('Move the constant across: ' + a + 'x = ' + c + ' ' + signed(-b)),
        step(a + 'x = ' + (c - b)),
        step('x = ' + (c - b) + ' ÷ ' + a + ' = ' + root),
      ],
      explanation: 'Undo the operations in reverse order to isolate x.',
      explanationBn: 'x কে একা করার জন্য প্রক্রিয়াগুলো উল্টো ক্রমে বাতিল করুন।',
      hints: ['First get all the x terms on one side.'],
      hintsBn: ['প্রথমে x যুক্ত পদগুলো এক দিকে নিন।'],
    };
  },
);

const solveLinearBothSides = defineGenerator(
  {
    id: 'alg.solve-linear-both-sides',
    name: 'Variables on Both Sides',
    nameBn: 'দুই পাশে চলক',
    topicId: 'linear-equations',
    skillIds: ['skill.solve-linear'],
    questionType: 'numeric',
    tags: ['algebra', 'equation'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const root = rng.int(-6, 10);
    const a = rng.int(3, 5 + difficulty);
    const c = rng.int(1, a - 1);
    const b = rng.int(-12, 12);
    const d = (a - c) * root + b;
    const prompt = a + 'x ' + signed(b) + ' = ' + c + 'x ' + signed(d);

    return {
      prompt: 'Solve for x: ' + prompt,
      promptBn: 'x এর মান নির্ণয় করুন: ' + bn(prompt),
      correctAnswer: String(root),
      choices: numericDistractors(root, rng, 3, { integer: true }),
      params: { a, b, c, d },
      solutionSteps: [
        step('Subtract ' + c + 'x from both sides: ' + (a - c) + 'x ' + signed(b) + ' = ' + d),
        step((a - c) + 'x = ' + (d - b)),
        step('x = ' + (d - b) + ' ÷ ' + (a - c) + ' = ' + root),
      ],
      explanation: 'Collect the variable terms on one side and the numbers on the other.',
      explanationBn: 'চলকের পদগুলো এক দিকে ও সংখ্যাগুলো অন্য দিকে নিন।',
    };
  },
);

const solveQuadratic = defineGenerator(
  {
    id: 'alg.solve-quadratic',
    name: 'Solve a Quadratic',
    nameBn: 'দ্বিঘাত সমাধান',
    topicId: 'quadratic-equations',
    skillIds: ['skill.solve-quadratic'],
    questionType: 'mcq',
    tags: ['algebra', 'quadratic'],
    examIds: ['exam.ssc-math', 'exam.hsc-math', 'exam.admission-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const r1 = rng.int(-6 - difficulty, 8);
    const r2 = rng.int(-6 - difficulty, 8);
    // x² - (r1+r2)x + r1r2 = 0
    const b = -(r1 + r2);
    const c = r1 * r2;
    const poly = [c, b, 1];
    const prompt = polyToString(poly) + ' = 0';
    const roots = Array.from(new Set([r1, r2])).sort((x, y) => x - y);
    const answer = roots.join(', ');
    const factor = tryFactorQuadratic(1, b, c) ?? '';

    return {
      prompt: 'Solve: ' + prompt,
      promptBn: 'সমাধান করুন: ' + bn(prompt),
      correctAnswer: answer,
      choices: [
        roots.map((r) => -r).join(', '),
        [r1 + 1, r2].sort((x, y) => x - y).join(', '),
        [r1, r2 + 2].sort((x, y) => x - y).join(', '),
      ],
      params: { b, c },
      solutionSteps: [
        step('Look for two numbers with product ' + c + ' and sum ' + -b + '.'),
        step('They are ' + r1 + ' and ' + r2 + '.'),
        step('Factorised: ' + factor),
        step('So x = ' + answer),
      ],
      explanation: 'A quadratic factorises when you can split the middle term using the product and sum.',
      explanationBn: 'গুণফল ও যোগফল ব্যবহার করে মধ্যপদ ভাঙলে দ্বিঘাত রাশি উৎপাদকে বিশ্লেষণ হয়।',
      hints: ['product of roots = ' + c + ', sum of roots = ' + -b],
      hintsBn: ['বীজের গুণফল = ' + bn(c) + ', যোগফল = ' + bn(-b)],
    };
  },
);

const discriminant = defineGenerator(
  {
    id: 'alg.discriminant',
    name: 'Nature of Roots',
    nameBn: 'বীজের প্রকৃতি',
    topicId: 'quadratic-equations',
    skillIds: ['skill.discriminant'],
    questionType: 'mcq',
    tags: ['quadratic', 'discriminant'],
    examIds: ['exam.hsc-math', 'exam.admission-math'],
    minDifficulty: 5,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const a = rng.int(1, 2 + Math.floor(difficulty / 3));
    const b = rng.int(-8 - difficulty, 8 + difficulty);
    const c = rng.int(-6 - difficulty, 8 + difficulty);
    const disc = b * b - 4 * a * c;
    const answer =
      disc > 0
        ? 'Two distinct real roots'
        : disc === 0
          ? 'One repeated real root'
          : 'No real roots';

    return {
      prompt:
        'Without solving, describe the roots of ' +
        polyToString([c, b, a]) +
        ' = 0.',
      promptBn: 'সমাধান না করে ' + bn(polyToString([c, b, a])) + ' = 0 সমীকরণের বীজের প্রকৃতি বলুন।',
      correctAnswer: answer,
      options: [
        { id: 'two', text: 'Two distinct real roots', textBn: 'দুটি ভিন্ন বাস্তব বীজ' },
        { id: 'one', text: 'One repeated real root', textBn: 'একটি দ্বিগুণ বাস্তব বীজ' },
        { id: 'none', text: 'No real roots', textBn: 'কোনো বাস্তব বীজ নেই' },
      ],
      acceptedAnswers: [answer],
      params: { a, b, c },
      solutionSteps: [
        step('D = b² - 4ac'),
        step('D = (' + b + ')² - 4(' + a + ')(' + c + ') = ' + disc),
        step(disc > 0 ? 'D > 0 → two distinct real roots' : disc === 0 ? 'D = 0 → one repeated root' : 'D < 0 → no real roots'),
      ],
      explanation: 'The discriminant alone decides how many real roots a quadratic has.',
      explanationBn: 'নিশ্চায়কই বলে দেয় দ্বিঘাত সমীকরণের বাস্তব বীজ কতটি।',
    };
  },
);

const expandBrackets = defineGenerator(
  {
    id: 'alg.expand',
    name: 'Expanding Brackets',
    nameBn: 'বন্ধনী বিস্তার',
    topicId: 'elementary-algebra',
    skillIds: ['skill.expand-factorise'],
    questionType: 'mcq',
    tags: ['algebra', 'expand'],
    minDifficulty: 3,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const a = rng.int(1, 2 + Math.floor(difficulty / 2));
    const b = rng.int(-7, 9);
    const c = rng.int(1, 2 + Math.floor(difficulty / 2));
    const d = rng.int(-7, 9);
    // (ax + b)(cx + d)
    const poly = [b * d, a * d + b * c, a * c];
    const answer = polyToString(poly);
    const left = (a === 1 ? 'x' : a + 'x') + ' ' + signed(b);
    const right = (c === 1 ? 'x' : c + 'x') + ' ' + signed(d);

    return {
      prompt: 'Expand and simplify: (' + left + ')(' + right + ')',
      promptBn: 'বিস্তার করে সরল করুন: (' + bn(left) + ')(' + bn(right) + ')',
      correctAnswer: answer,
      choices: [
        polyToString([b * d, a * d - b * c, a * c]),
        polyToString([b * d, a * c, a * c]),
        polyToString([b + d, a * d + b * c, a * c]),
      ],
      params: { a, b, c, d },
      solutionSteps: [
        step('Use FOIL: multiply First, Outer, Inner, Last.'),
        step(
          'First: ' + a * c + 'x², Outer: ' + a * d + 'x, Inner: ' + b * c + 'x, Last: ' + b * d,
        ),
        step('Collect like terms: ' + answer),
      ],
      explanation: 'Every term in the first bracket multiplies every term in the second.',
      explanationBn: 'প্রথম বন্ধনীর প্রতিটি পদ দ্বিতীয় বন্ধনীর প্রতিটি পদের সাথে গুণ হয়।',
      hints: ['Multiply term by term, then collect the x terms.'],
      hintsBn: ['পদে পদে গুণ করে x যুক্ত পদগুলো একত্র করুন।'],
    };
  },
);

const substitution = defineGenerator(
  {
    id: 'alg.substitution',
    name: 'Substitution',
    nameBn: 'মান নির্ণয়',
    topicId: 'elementary-algebra',
    skillIds: ['skill.substitution'],
    questionType: 'numeric',
    tags: ['algebra', 'substitution'],
    minDifficulty: 2,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const a = rng.int(2, 4 + difficulty);
    const b = rng.int(-8, 9);
    const c = rng.int(1, 5 + difficulty);
    const x = rng.int(-4, 7);
    const expressionText = a + 'x^2 ' + signed(b) + 'x ' + signed(c);
    const answer = evaluate(expressionText, { x });

    return {
      prompt: 'If x = ' + x + ', find the value of ' + a + 'x² ' + signed(b) + 'x ' + signed(c) + '.',
      promptBn: 'x = ' + bn(x) + ' হলে ' + bn(a + 'x² ' + signed(b) + 'x ' + signed(c)) + ' এর মান কত?',
      correctAnswer: formatNumber(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true }),
      params: { a, b, c, x },
      solutionSteps: [
        step('Substitute x = ' + x + '.'),
        step(a + '(' + x + ')² ' + signed(b) + '(' + x + ') ' + signed(c)),
        step('= ' + a * x * x + ' ' + signed(b * x) + ' ' + signed(c) + ' = ' + formatNumber(answer)),
      ],
      explanation: 'Substitute first, then follow the order of operations — squares before products.',
      explanationBn: 'প্রথমে মান বসান, তারপর ক্রম অনুসারে হিসাব করুন — বর্গ আগে, গুণ পরে।',
      hints: ['Careful with the sign when squaring a negative number.'],
      hintsBn: ['ঋণাত্মক সংখ্যার বর্গে চিহ্ন সাবধানে দেখুন।'],
    };
  },
);

const indices = defineGenerator(
  {
    id: 'alg.indices',
    name: 'Laws of Indices',
    nameBn: 'সূচকের সূত্র',
    topicId: 'indices-logarithms',
    skillIds: ['skill.indices'],
    questionType: 'mcq',
    tags: ['indices'],
    examIds: ['exam.hsc-math', 'exam.admission-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const base = rng.pick([2, 3, 5, 'x', 'a']);
    const m = rng.int(2, 4 + Math.floor(difficulty / 2));
    const n = rng.int(2, 3 + Math.floor(difficulty / 2));
    const mode = rng.int(0, 2);
    const label = String(base);

    if (mode === 0) {
      const answer = label + '^' + (m + n);
      return {
        prompt: 'Simplify: ' + label + '^' + m + ' × ' + label + '^' + n,
        promptBn: 'সরল করুন: ' + bn(label + '^' + m) + ' × ' + bn(label + '^' + n),
        correctAnswer: answer,
        choices: [label + '^' + m * n, label + '^' + Math.abs(m - n), label + '^' + (m + n + 1)],
        params: { base: label, m, n, mode },
        solutionSteps: [step('aᵐ × aⁿ = aᵐ⁺ⁿ'), step(label + '^' + m + ' × ' + label + '^' + n + ' = ' + answer)],
        explanation: 'Multiplying powers of the same base adds the indices.',
        explanationBn: 'একই ভিত্তির ঘাত গুণ করলে সূচক যোগ হয়।',
      };
    }
    if (mode === 1) {
      const answer = label + '^' + m * n;
      return {
        prompt: 'Simplify: (' + label + '^' + m + ')^' + n,
        promptBn: 'সরল করুন: (' + bn(label + '^' + m) + ')^' + bn(n),
        correctAnswer: answer,
        choices: [label + '^' + (m + n), label + '^' + Math.abs(m - n), label + '^' + (m * n + 1)],
        params: { base: label, m, n, mode },
        solutionSteps: [step('(aᵐ)ⁿ = aᵐⁿ'), step('(' + label + '^' + m + ')^' + n + ' = ' + answer)],
        explanation: 'A power raised to a power multiplies the indices.',
        explanationBn: 'ঘাতের ঘাত নিলে সূচক গুণ হয়।',
      };
    }
    const big = Math.max(m, n) + 2;
    const small = Math.min(m, n);
    const answer = label + '^' + (big - small);
    return {
      prompt: 'Simplify: ' + label + '^' + big + ' ÷ ' + label + '^' + small,
      promptBn: 'সরল করুন: ' + bn(label + '^' + big) + ' ÷ ' + bn(label + '^' + small),
      correctAnswer: answer,
      choices: [label + '^' + (big + small), label + '^' + big * small, label + '^' + (big - small + 1)],
      params: { base: label, m: big, n: small, mode },
      solutionSteps: [step('aᵐ ÷ aⁿ = aᵐ⁻ⁿ'), step(label + '^' + big + ' ÷ ' + label + '^' + small + ' = ' + answer)],
      explanation: 'Dividing powers of the same base subtracts the indices.',
      explanationBn: 'একই ভিত্তির ঘাত ভাগ করলে সূচক বিয়োগ হয়।',
    };
  },
);

const logarithms = defineGenerator(
  {
    id: 'alg.logarithm',
    name: 'Logarithms',
    nameBn: 'লগারিদম',
    topicId: 'indices-logarithms',
    skillIds: ['skill.logarithms'],
    questionType: 'numeric',
    tags: ['logarithm'],
    examIds: ['exam.hsc-math'],
    minDifficulty: 5,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const base = rng.pick([2, 3, 5, 10]);
    const exponent = rng.int(2, 3 + Math.floor(difficulty / 2));
    const value = Math.pow(base, exponent);

    return {
      prompt: 'Find log' + base + '(' + value + ').',
      promptBn: 'log' + bn(base) + '(' + bn(value) + ') এর মান নির্ণয় করুন।',
      correctAnswer: String(exponent),
      choices: numericDistractors(exponent, rng, 3, { integer: true, min: 0 }),
      params: { base, exponent },
      solutionSteps: [
        step('log_b(x) asks: b to what power gives x?'),
        step(base + '^' + exponent + ' = ' + value),
        step('So log' + base + '(' + value + ') = ' + exponent),
      ],
      explanation: 'A logarithm is the inverse of exponentiation.',
      explanationBn: 'লগারিদম হলো সূচকের বিপরীত প্রক্রিয়া।',
      hints: ['Write ' + value + ' as a power of ' + base + '.'],
      hintsBn: [bn(value) + ' কে ' + bn(base) + ' এর ঘাত হিসেবে লিখুন।'],
    };
  },
);

const arithmeticProgression = defineGenerator(
  {
    id: 'alg.ap',
    name: 'Arithmetic Progression',
    nameBn: 'সমান্তর ধারা',
    topicId: 'sequences-series',
    skillIds: ['skill.ap'],
    questionType: 'numeric',
    brainCategory: 'pattern',
    tags: ['sequence', 'ap'],
    examIds: ['exam.ssc-math', 'exam.bcs-math'],
    minDifficulty: 3,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const first = rng.int(-5, 12);
    const diff = rng.nonZeroInt(-6, 9);
    const n = rng.int(6, 10 + difficulty * 3);
    const askSum = difficulty >= 6 && rng.bool();
    const nth = first + (n - 1) * diff;
    const sum = (n * (2 * first + (n - 1) * diff)) / 2;
    const series = [0, 1, 2, 3].map((i) => first + i * diff).join(', ') + ', …';

    if (askSum) {
      return {
        prompt: 'For the series ' + series + ', find the sum of the first ' + n + ' terms.',
        promptBn: bn(series) + ' ধারাটির প্রথম ' + bn(n) + ' পদের সমষ্টি নির্ণয় করুন।',
        correctAnswer: formatNumber(sum),
        choices: numericDistractors(sum, rng, 3, { integer: true }),
        params: { first, diff, n, mode: 'sum' },
        solutionSteps: [
          step('a = ' + first + ', d = ' + diff + ', n = ' + n),
          step('Sₙ = n/2 [2a + (n-1)d]'),
          step('Sₙ = ' + n + '/2 [2(' + first + ') + ' + (n - 1) + '(' + diff + ')] = ' + formatNumber(sum)),
        ],
        explanation: 'The sum formula pairs the first and last terms.',
        explanationBn: 'সমষ্টির সূত্র প্রথম ও শেষ পদকে জোড়ায় মিলিয়ে কাজ করে।',
      };
    }
    return {
      prompt: 'For the series ' + series + ', find the ' + n + 'th term.',
      promptBn: bn(series) + ' ধারাটির ' + bn(n) + ' তম পদ নির্ণয় করুন।',
      correctAnswer: formatNumber(nth),
      choices: numericDistractors(nth, rng, 3, { integer: true }),
      params: { first, diff, n, mode: 'nth' },
      solutionSteps: [
        step('a = ' + first + ', d = ' + diff),
        step('aₙ = a + (n-1)d'),
        step('a' + n + ' = ' + first + ' + ' + (n - 1) + '(' + diff + ') = ' + formatNumber(nth)),
      ],
      explanation: 'In an AP each term adds the same common difference.',
      explanationBn: 'সমান্তর ধারায় প্রতিটি পদে একই সাধারণ অন্তর যোগ হয়।',
      hints: ['common difference d = ' + diff],
      hintsBn: ['সাধারণ অন্তর d = ' + bn(diff)],
    };
  },
);

const geometricProgression = defineGenerator(
  {
    id: 'alg.gp',
    name: 'Geometric Progression',
    nameBn: 'গুণোত্তর ধারা',
    topicId: 'sequences-series',
    skillIds: ['skill.gp'],
    questionType: 'numeric',
    brainCategory: 'pattern',
    tags: ['sequence', 'gp'],
    examIds: ['exam.hsc-math'],
    minDifficulty: 4,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const first = rng.int(1, 5);
    const ratio = rng.pick([2, 3, -2]);
    const n = rng.int(4, 5 + Math.min(4, difficulty));
    const nth = first * Math.pow(ratio, n - 1);
    const series = [0, 1, 2, 3].map((i) => first * Math.pow(ratio, i)).join(', ') + ', …';

    return {
      prompt: 'For the series ' + series + ', find the ' + n + 'th term.',
      promptBn: bn(series) + ' ধারাটির ' + bn(n) + ' তম পদ নির্ণয় করুন।',
      correctAnswer: formatNumber(nth),
      choices: numericDistractors(nth, rng, 3, { integer: true }),
      params: { first, ratio, n },
      solutionSteps: [
        step('a = ' + first + ', r = ' + ratio),
        step('aₙ = a·rⁿ⁻¹'),
        step('a' + n + ' = ' + first + ' × (' + ratio + ')^' + (n - 1) + ' = ' + formatNumber(nth)),
      ],
      explanation: 'In a GP each term multiplies by the same common ratio.',
      explanationBn: 'গুণোত্তর ধারায় প্রতিটি পদ একই সাধারণ অনুপাত দিয়ে গুণ হয়।',
      hints: ['common ratio r = ' + ratio],
      hintsBn: ['সাধারণ অনুপাত r = ' + bn(ratio)],
    };
  },
);

const numberPattern = defineGenerator(
  {
    id: 'alg.pattern',
    name: 'Find the Next Number',
    nameBn: 'পরের সংখ্যা',
    topicId: 'sequences-series',
    skillIds: ['skill.pattern'],
    questionType: 'pattern',
    brainCategory: 'pattern',
    tags: ['pattern', 'sequence'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 2,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const kinds = ['linear', 'square', 'double', 'fibonacci', 'alternating', 'triangular'] as const;
    const kind = kinds[rng.int(0, Math.min(kinds.length - 1, 1 + Math.floor(difficulty / 1.6)))];
    const seq: number[] = [];
    let rule = '';
    let ruleBn = '';

    switch (kind) {
      case 'linear': {
        const a = rng.int(2, 9);
        const d = rng.int(2, 9);
        for (let i = 0; i < 6; i++) seq.push(a + i * d);
        rule = 'add ' + d + ' each time';
        ruleBn = 'প্রতিবার ' + bn(d) + ' যোগ হচ্ছে';
        break;
      }
      case 'square': {
        const start = rng.int(1, 4);
        for (let i = 0; i < 6; i++) seq.push(Math.pow(start + i, 2));
        rule = 'consecutive perfect squares from ' + start + '²';
        ruleBn = bn(start) + '² থেকে ক্রমিক পূর্ণবর্গ';
        break;
      }
      case 'double': {
        const a = rng.int(1, 5);
        const r = rng.pick([2, 3]);
        for (let i = 0; i < 6; i++) seq.push(a * Math.pow(r, i));
        rule = 'multiply by ' + r + ' each time';
        ruleBn = 'প্রতিবার ' + bn(r) + ' দিয়ে গুণ হচ্ছে';
        break;
      }
      case 'fibonacci': {
        let a = rng.int(1, 4);
        let b = rng.int(a, a + 4);
        seq.push(a, b);
        for (let i = 0; i < 4; i++) {
          const next = a + b;
          seq.push(next);
          a = b;
          b = next;
        }
        rule = 'each term is the sum of the two before it';
        ruleBn = 'প্রতিটি পদ আগের দুই পদের যোগফল';
        break;
      }
      case 'alternating': {
        const a = rng.int(3, 9);
        const up = rng.int(4, 9);
        const down = rng.int(1, 3);
        let current = a;
        for (let i = 0; i < 6; i++) {
          seq.push(current);
          current += i % 2 === 0 ? up : -down;
        }
        rule = 'alternately add ' + up + ' and subtract ' + down;
        ruleBn = 'একবার ' + bn(up) + ' যোগ, একবার ' + bn(down) + ' বিয়োগ';
        break;
      }
      default: {
        for (let i = 1; i <= 6; i++) seq.push((i * (i + 1)) / 2);
        rule = 'triangular numbers: add 2, then 3, then 4, …';
        ruleBn = 'ত্রিভুজ সংখ্যা: ২, ৩, ৪ … যোগ হচ্ছে';
      }
    }

    const shown = seq.slice(0, 5);
    const answer = seq[5];

    return {
      prompt: 'What comes next? ' + shown.join(', ') + ', ?',
      promptBn: 'পরের সংখ্যা কী? ' + shown.map((v) => bn(v)).join(', ') + ', ?',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true }),
      params: { kind, seq: shown.join('-') },
      solutionSteps: [
        step('Look at the differences: ' + shown.slice(1).map((v, i) => v - shown[i]).join(', ')),
        step('The rule is: ' + rule),
        step('Next term = ' + answer),
      ],
      explanation: 'Find the rule connecting consecutive terms before predicting: ' + rule + '.',
      explanationBn: 'ভবিষ্যদ্বাণীর আগে পদের সম্পর্ক খুঁজুন: ' + ruleBn + '।',
      hints: ['Try the differences first, then the ratios.'],
      hintsBn: ['প্রথমে অন্তর দেখুন, তারপর অনুপাত।'],
    };
  },
);

const wordEquation = defineGenerator(
  {
    id: 'alg.word-equation',
    name: 'Equation Word Problem',
    nameBn: 'সমীকরণের শব্দ সমস্যা',
    topicId: 'linear-equations',
    skillIds: ['skill.word-equation'],
    questionType: 'word_problem',
    tags: ['algebra', 'word-problem'],
    examIds: ['exam.ssc-math', 'exam.ntrca-math'],
    minDifficulty: 3,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const [first, second] = twoPeople(rng);
    const smaller = rng.int(5, 10 + difficulty * 5);
    const extra = rng.int(3, 8 + difficulty * 3);
    const total = smaller * 2 + extra;

    return {
      prompt:
        first.en +
        ' and ' +
        second.en +
        ' have ' +
        total +
        ' marbles altogether. ' +
        first.en +
        ' has ' +
        extra +
        ' more than ' +
        second.en +
        '. How many does ' +
        second.en +
        ' have?',
      promptBn:
        first.bn +
        ' ও ' +
        second.bn +
        ' এর মোট ' +
        bn(total) +
        ' টি মার্বেল আছে। ' +
        first.bn +
        ' এর কাছে ' +
        second.bn +
        ' এর চেয়ে ' +
        bn(extra) +
        ' টি বেশি আছে। ' +
        second.bn +
        ' এর কাছে কতটি আছে?',
      correctAnswer: String(smaller),
      choices: numericDistractors(smaller, rng, 3, { integer: true, min: 0 }),
      params: { total, extra },
      solutionSteps: [
        step('Let ' + second.en + ' have x marbles, so ' + first.en + ' has x + ' + extra + '.'),
        step('x + (x + ' + extra + ') = ' + total),
        step('2x = ' + (total - extra) + ', so x = ' + smaller),
      ],
      explanation: 'Name the smaller quantity x and write both quantities in terms of x.',
      explanationBn: 'ছোট রাশিকে x ধরে উভয় রাশিকে x এর মাধ্যমে প্রকাশ করুন।',
      hints: ['Let the smaller amount be x.'],
      hintsBn: ['ছোট সংখ্যাটিকে x ধরুন।'],
    };
  },
);

const solveSimultaneous = defineGenerator(
  {
    id: 'alg.simultaneous',
    name: 'Simultaneous Equations',
    nameBn: 'যুগপৎ সমীকরণ',
    topicId: 'simultaneous-equations',
    skillIds: ['skill.solve-simultaneous'],
    questionType: 'mcq',
    tags: ['algebra', 'system'],
    examIds: ['exam.ssc-math', 'exam.admission-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const x = rng.int(-4, 8);
    const y = rng.int(-4, 8);
    const a1 = rng.nonZeroInt(1, 3 + Math.floor(difficulty / 2));
    const b1 = rng.nonZeroInt(1, 3 + Math.floor(difficulty / 2));
    const a2 = rng.nonZeroInt(1, 3 + Math.floor(difficulty / 2));
    let b2 = rng.nonZeroInt(-4, 4);
    if (a1 * b2 - a2 * b1 === 0) b2 = b1 + 1;
    const c1 = a1 * x + b1 * y;
    const c2 = a2 * x + b2 * y;
    const answer = '(' + x + ', ' + y + ')';

    return {
      prompt:
        'Solve the system:\n' +
        a1 + 'x ' + signed(b1) + 'y = ' + c1 + '\n' +
        a2 + 'x ' + signed(b2) + 'y = ' + c2,
      promptBn:
        'সমাধান করুন:\n' +
        bn(a1 + 'x ' + signed(b1) + 'y = ' + c1) + '\n' +
        bn(a2 + 'x ' + signed(b2) + 'y = ' + c2),
      correctAnswer: answer,
      choices: ['(' + y + ', ' + x + ')', '(' + (x + 1) + ', ' + y + ')', '(' + x + ', ' + (y - 1) + ')'],
      params: { a1, b1, c1, a2, b2, c2 },
      solutionSteps: [
        step('Multiply the equations so one variable cancels.'),
        step('Eliminate y: (' + a1 + ')(' + b2 + ') - (' + a2 + ')(' + b1 + ') = ' + (a1 * b2 - a2 * b1)),
        step('x = ' + formatRoot(x) + ', then back-substitute to get y = ' + formatRoot(y)),
      ],
      explanation: 'Elimination removes one unknown so the other can be found directly.',
      explanationBn: 'অপনয়ন পদ্ধতিতে একটি চলক বাদ দিয়ে অন্যটি সরাসরি পাওয়া যায়।',
      hints: ['Try to make the coefficients of one variable equal.'],
      hintsBn: ['একটি চলকের সহগ সমান করার চেষ্টা করুন।'],
    };
  },
);

const polynomials = defineGenerator(
  {
    id: 'alg.polynomials',
    name: 'Polynomials: Remainder Theorem',
    nameBn: 'বহুপদী: শেষাংশ উপপাদ্য',
    topicId: 'polynomials',
    skillIds: ['skill.polynomial-roots'],
    questionType: 'numeric',
    tags: ['algebra', 'polynomials'],
    examIds: ['exam.hsc-math', 'exam.admission-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const degree = difficulty <= 5 ? 2 : 3;
    const p: Polynomial = Array.from({ length: degree + 1 }, () => rng.int(-6, 6));
    if (p[degree] === 0) p[degree] = rng.pick([1, 2, -1, -2]);
    const a = rng.pick([-3, -2, -1, 1, 2, 3]);
    const remainder = polyEval(p, a);
    const display = polyToString(p);
    const divisor = a >= 0 ? '(x - ' + a + ')' : '(x + ' + Math.abs(a) + ')';

    return {
      prompt:
        'Find the remainder when p(x) = ' + display + ' is divided by ' + divisor + ', using the Remainder Theorem.',
      promptBn:
        'শেষাংশ উপপাদ্য ব্যবহার করে p(x) = ' + display + ' কে ' + divisor + ' দ্বারা ভাগ করলে ভাগশেষ কত?',
      correctAnswer: String(remainder),
      choices: numericDistractors(remainder, rng, 3, { integer: true }),
      params: { coefficients: p.join(','), a },
      solutionSteps: [
        step('The Remainder Theorem: dividing p(x) by (x - a) leaves a remainder of p(a).'),
        step('Here a = ' + a + ', so evaluate p(' + a + ').'),
        step('p(' + a + ') = ' + remainder),
      ],
      explanation: 'Substituting x = a into p(x) gives exactly the remainder of dividing by (x - a) — no long division needed.',
      explanationBn: 'p(x)-এ x = a বসালে সরাসরি (x - a) দিয়ে ভাগ করার ভাগশেষ পাওয়া যায়, ভাগ করার দরকার নেই।',
      hints: ['Substitute x = ' + a + ' directly into p(x).'],
      hintsBn: ['সরাসরি p(x)-এ x = ' + a + ' বসান।'],
    };
  },
);

export const ALGEBRA_GENERATORS: QuestionGenerator[] = [
  solveLinear,
  solveLinearBothSides,
  solveQuadratic,
  discriminant,
  expandBrackets,
  substitution,
  indices,
  logarithms,
  arithmeticProgression,
  geometricProgression,
  numberPattern,
  wordEquation,
  solveSimultaneous,
  polynomials,
];
