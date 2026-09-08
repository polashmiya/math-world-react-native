import { divisionWithRemainder } from '../../math/arithmetic';
import { evaluate } from '../../math/expression';
import { formatNumber } from '../../utils/format';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors, person, scaleRange } from './helpers';

const addSubtract = defineGenerator(
  {
    id: 'arith.add-subtract',
    name: 'Addition & Subtraction',
    nameBn: 'যোগ ও বিয়োগ',
    topicId: 'arithmetic',
    skillIds: ['skill.add-subtract'],
    questionType: 'numeric',
    brainCategory: 'mental_math',
    tags: ['arithmetic', 'mental'],
    minDifficulty: 1,
    maxDifficulty: 5,
  },
  ({ rng, difficulty }) => {
    const { min, max } = scaleRange(difficulty, 20, 3.2);
    const a = rng.int(min, max);
    const b = rng.int(min, max);
    const isAdd = rng.bool(0.55);
    const [big, small] = a >= b ? [a, b] : [b, a];
    const answer = isAdd ? a + b : big - small;
    const prompt = isAdd ? a + ' + ' + b + ' = ?' : big + ' - ' + small + ' = ?';
    const promptBn = isAdd
      ? bn(a) + ' + ' + bn(b) + ' = ?'
      : bn(big) + ' - ' + bn(small) + ' = ?';

    return {
      prompt,
      promptBn,
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true }),
      params: { a, b, op: isAdd ? 'add' : 'sub' },
      solutionSteps: [
        step(isAdd ? 'Line up the place values and add.' : 'Line up the place values and subtract.'),
        step(prompt.replace(' = ?', '') + ' = ' + answer),
      ],
      explanation: isAdd
        ? 'Add the units first, then carry into the next place value.'
        : 'Subtract the units first, borrowing from the next place value when needed.',
      explanationBn: isAdd
        ? 'প্রথমে এককের ঘর যোগ করুন, প্রয়োজনে হাতে রাখুন।'
        : 'প্রথমে এককের ঘর বিয়োগ করুন, প্রয়োজনে ধার নিন।',
      hints: ['Break the numbers into place values.'],
      hintsBn: ['সংখ্যাগুলোকে স্থানীয় মানে ভাগ করুন।'],
    };
  },
);

const multiplyDivide = defineGenerator(
  {
    id: 'arith.multiply-divide',
    name: 'Multiplication & Division',
    nameBn: 'গুণ ও ভাগ',
    topicId: 'arithmetic',
    skillIds: ['skill.multiply-divide'],
    questionType: 'numeric',
    brainCategory: 'mental_math',
    tags: ['arithmetic', 'tables'],
    minDifficulty: 1,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const cap = 5 + difficulty * 6;
    const a = rng.int(2, cap);
    const b = rng.int(2, Math.max(3, Math.round(cap / 2)));
    const isMultiply = rng.bool(0.6);
    const product = a * b;
    const answer = isMultiply ? product : a;
    const prompt = isMultiply ? a + ' × ' + b + ' = ?' : product + ' ÷ ' + b + ' = ?';
    const promptBn = isMultiply ? bn(a) + ' × ' + bn(b) + ' = ?' : bn(product) + ' ÷ ' + bn(b) + ' = ?';

    return {
      prompt,
      promptBn,
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
      params: { a, b, op: isMultiply ? 'mul' : 'div' },
      solutionSteps: isMultiply
        ? [step('Multiply: ' + a + ' × ' + b + ' = ' + product)]
        : [
            step('Division undoes multiplication.'),
            step('Which number times ' + b + ' gives ' + product + '?'),
            step(product + ' ÷ ' + b + ' = ' + answer),
          ],
      explanation: isMultiply
        ? 'Multiplication is repeated addition: ' + b + ' groups of ' + a + '.'
        : 'Ask how many groups of ' + b + ' fit into ' + product + '.',
      explanationBn: isMultiply
        ? 'গুণ মানে বারবার যোগ: ' + bn(a) + ' এর ' + bn(b) + ' গুণ।'
        : bn(product) + ' এর মধ্যে ' + bn(b) + ' কতবার আছে তা ভাবুন।',
    };
  },
);

const bodmas = defineGenerator(
  {
    id: 'arith.bodmas',
    name: 'Order of Operations',
    nameBn: 'প্রক্রিয়ার ক্রম',
    topicId: 'order-of-operations',
    skillIds: ['skill.bodmas'],
    questionType: 'numeric',
    brainCategory: 'mental_math',
    tags: ['bodmas', 'arithmetic'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 2,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const a = rng.int(2, 6 + difficulty);
    const b = rng.int(2, 5 + difficulty);
    const c = rng.int(2, 9);
    const d = rng.int(2, 6);
    const expression =
      difficulty <= 3
        ? a + ' + ' + b + ' × ' + c
        : difficulty <= 5
          ? '(' + a + ' + ' + b + ') × ' + c + ' - ' + d
          : a + ' + ' + b + ' × ' + c + ' - ' + (b * d) + ' ÷ ' + d;
    const answer = evaluate(expression);

    return {
      prompt: 'Evaluate: ' + expression,
      promptBn: 'মান নির্ণয় করুন: ' + bn(expression),
      correctAnswer: formatNumber(answer),
      choices: numericDistractors(answer, rng, 3, { integer: Number.isInteger(answer) }),
      params: { a, b, c, d, difficulty },
      solutionSteps: [
        step('Follow BODMAS: Brackets, Orders, Division/Multiplication, Addition/Subtraction.'),
        step('Work through the multiplication and division first.'),
        step(expression + ' = ' + formatNumber(answer)),
      ],
      explanation: 'Multiplication and division are resolved before addition and subtraction.',
      explanationBn: 'যোগ-বিয়োগের আগে গুণ ও ভাগ করতে হয়।',
      hints: ['Do the brackets first, then × and ÷ from left to right.'],
      hintsBn: ['প্রথমে বন্ধনী, এরপর বাম থেকে ডানে × ও ÷।'],
    };
  },
);

const remainder = defineGenerator(
  {
    id: 'arith.remainder',
    name: 'Division with Remainder',
    nameBn: 'ভাগশেষ',
    topicId: 'arithmetic',
    skillIds: ['skill.multiply-divide'],
    questionType: 'numeric',
    tags: ['division', 'remainder'],
    minDifficulty: 2,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const divisor = rng.int(3, 5 + difficulty * 2);
    const quotient = rng.int(4, 8 + difficulty * 4);
    const rem = rng.int(1, divisor - 1);
    const dividend = divisor * quotient + rem;
    const result = divisionWithRemainder(dividend, divisor);

    return {
      prompt: 'What is the remainder when ' + dividend + ' is divided by ' + divisor + '?',
      promptBn: bn(dividend) + ' কে ' + bn(divisor) + ' দ্বারা ভাগ করলে ভাগশেষ কত?',
      correctAnswer: String(result.remainder),
      choices: numericDistractors(result.remainder, rng, 3, { integer: true, min: 0 }),
      params: { dividend, divisor },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'dividend = divisor × quotient + remainder, and the remainder is always less than the divisor.',
      explanationBn: 'ভাজ্য = ভাজক × ভাগফল + ভাগশেষ; ভাগশেষ সর্বদা ভাজকের চেয়ে ছোট।',
    };
  },
);

const wordSum = defineGenerator(
  {
    id: 'arith.word-sum',
    name: 'Everyday Sum',
    nameBn: 'দৈনন্দিন যোগ',
    topicId: 'arithmetic',
    skillIds: ['skill.add-subtract'],
    questionType: 'word_problem',
    brainCategory: 'money_math',
    tags: ['word-problem', 'real-life'],
    minDifficulty: 1,
    maxDifficulty: 5,
  },
  ({ rng, difficulty }) => {
    const who = person(rng);
    const scale = 10 * Math.pow(2.2, difficulty - 1);
    const start = rng.int(Math.round(scale * 2), Math.round(scale * 6));
    const spent = rng.int(Math.round(scale * 0.5), start - 1);
    const earned = rng.int(Math.round(scale * 0.3), Math.round(scale * 2));
    const answer = start - spent + earned;

    return {
      prompt:
        who.en +
        ' had ৳' +
        start +
        ', spent ৳' +
        spent +
        ' at the market and later earned ৳' +
        earned +
        '. How much money does ' +
        who.en +
        ' have now?',
      promptBn:
        who.bn +
        ' এর কাছে ' +
        bn(start) +
        ' টাকা ছিল। বাজারে ' +
        bn(spent) +
        ' টাকা খরচ করে পরে ' +
        bn(earned) +
        ' টাকা আয় করল। এখন তার কাছে কত টাকা আছে?',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
      params: { start, spent, earned },
      solutionSteps: [
        step('After spending: ' + start + ' - ' + spent + ' = ' + (start - spent)),
        step('After earning: ' + (start - spent) + ' + ' + earned + ' = ' + answer),
      ],
      explanation: 'Handle the events in order: money out first, then money in.',
      explanationBn: 'ঘটনাগুলো ক্রমে হিসাব করুন: আগে খরচ, পরে আয়।',
    };
  },
);

const placeValue = defineGenerator(
  {
    id: 'arith.place-value',
    name: 'Place Value',
    nameBn: 'স্থানীয় মান',
    topicId: 'place-value',
    skillIds: ['skill.place-value'],
    questionType: 'mcq',
    brainCategory: 'number_sense',
    tags: ['place-value'],
    minDifficulty: 1,
    maxDifficulty: 4,
  },
  ({ rng, difficulty }) => {
    const digitCount = 3 + Math.min(4, difficulty);
    let value = rng.int(1, 9);
    for (let i = 1; i < digitCount; i++) value = value * 10 + rng.int(0, 9);
    const digits = String(value).split('');
    const index = rng.int(0, digits.length - 1);
    const digit = Number(digits[index]);
    const placeNames = ['units', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];
    const placeNamesBn = ['একক', 'দশক', 'শতক', 'হাজার', 'দশ হাজার', 'লক্ষ', 'নিযুত'];
    const power = digits.length - 1 - index;
    const answer = digit * Math.pow(10, power);

    return {
      prompt: 'In the number ' + value + ', what is the place value of the digit ' + digit + ' (the ' + placeNames[power] + ' place)?',
      promptBn:
        bn(value) + ' সংখ্যায় ' + bn(digit) + ' অঙ্কটির স্থানীয় মান কত (' + placeNamesBn[power] + ' স্থান)?',
      correctAnswer: String(answer),
      choices: [
        String(digit),
        String(digit * Math.pow(10, Math.max(0, power - 1))),
        String(digit * Math.pow(10, power + 1)),
        String(Math.pow(10, power)),
      ],
      params: { value, index },
      solutionSteps: [
        step('The digit ' + digit + ' sits in the ' + placeNames[power] + ' place.'),
        step('Place value = digit × ' + Math.pow(10, power) + ' = ' + answer),
      ],
      explanation: 'Place value multiplies the digit by the value of its position.',
      explanationBn: 'স্থানীয় মান = অঙ্ক × তার স্থানের মান।',
    };
  },
);

export const ARITHMETIC_GENERATORS: QuestionGenerator[] = [
  addSubtract,
  multiplyDivide,
  bodmas,
  remainder,
  wordSum,
  placeValue,
];
