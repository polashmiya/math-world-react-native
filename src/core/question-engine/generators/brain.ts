import { convertUnit } from '../../math/arithmetic';
import { formatNumber } from '../../utils/format';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors, person, place, shopItem } from './helpers';

/**
 * Daily Brain Math generators (spec §20). These train everyday mathematical
 * thinking rather than exam syllabus, so the numbers stay realistic and the
 * strategy is always named in the solution.
 */

const mentalMath = defineGenerator(
  {
    id: 'brain.mental-math',
    name: 'Mental Math Strategy',
    nameBn: 'মানসিক কৌশল',
    topicId: 'mental-math',
    skillIds: ['skill.mental-strategy'],
    questionType: 'mental_math',
    brainCategory: 'mental_math',
    tags: ['brain', 'mental'],
    minDifficulty: 1,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const kinds = ['near-hundred', 'double-halve', 'times-five', 'square-ending-5', 'split-add'] as const;
    const kind = kinds[rng.int(0, Math.min(kinds.length - 1, Math.floor(difficulty / 1.6)))];

    if (kind === 'near-hundred') {
      const a = 100 - rng.int(1, 9);
      const b = rng.int(3, 9 + difficulty * 3);
      const answer = a * b;
      return {
        prompt: a + ' × ' + b + ' = ?  (try the near-100 trick)',
        promptBn: bn(a) + ' × ' + bn(b) + ' = ?  (১০০ এর কাছাকাছি কৌশলে)',
        correctAnswer: String(answer),
        choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
        params: { a, b, kind },
        solutionSteps: [
          step('Write ' + a + ' as 100 - ' + (100 - a) + '.'),
          step(a + ' × ' + b + ' = 100×' + b + ' - ' + (100 - a) + '×' + b),
          step('= ' + 100 * b + ' - ' + (100 - a) * b + ' = ' + answer),
        ],
        explanation: 'Rounding to a friendly number and correcting afterwards is faster than long multiplication.',
        explanationBn: 'সুবিধাজনক সংখ্যায় নিয়ে পরে সংশোধন করলে গুণ অনেক দ্রুত হয়।',
        hints: ['Multiply by 100 first, then subtract.'],
        hintsBn: ['প্রথমে ১০০ দিয়ে গুণ করে পরে বিয়োগ করুন।'],
      };
    }
    if (kind === 'double-halve') {
      const even = rng.int(2, 8 + difficulty) * 2;
      const other = rng.int(5, 15 + difficulty * 5);
      const answer = even * other;
      return {
        prompt: even + ' × ' + other + ' = ?  (halve one, double the other)',
        promptBn: bn(even) + ' × ' + bn(other) + ' = ?  (একটিকে অর্ধেক, অন্যটিকে দ্বিগুণ করে)',
        correctAnswer: String(answer),
        choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
        params: { even, other, kind },
        solutionSteps: [
          step('Halve ' + even + ' → ' + even / 2 + ', double ' + other + ' → ' + other * 2 + '.'),
          step(even / 2 + ' × ' + other * 2 + ' = ' + answer),
        ],
        explanation: 'Halving one factor and doubling the other keeps the product the same.',
        explanationBn: 'এক গুণনীয়ককে অর্ধেক ও অন্যটিকে দ্বিগুণ করলে গুণফল অপরিবর্তিত থাকে।',
      };
    }
    if (kind === 'times-five') {
      const a = rng.int(12, 40 + difficulty * 20);
      const answer = a * 5;
      return {
        prompt: a + ' × 5 = ?  (use ×10 ÷ 2)',
        promptBn: bn(a) + ' × ৫ = ?  (×১০ ÷ ২ কৌশলে)',
        correctAnswer: String(answer),
        choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
        params: { a, kind },
        solutionSteps: [
          step(a + ' × 10 = ' + a * 10),
          step('Half of that is ' + answer + '.'),
        ],
        explanation: 'Multiplying by 5 is the same as multiplying by 10 and halving.',
        explanationBn: '৫ দিয়ে গুণ মানে ১০ দিয়ে গুণ করে অর্ধেক করা।',
      };
    }
    if (kind === 'square-ending-5') {
      const tens = rng.int(1, 3 + Math.floor(difficulty / 2));
      const value = tens * 10 + 5;
      const answer = value * value;
      return {
        prompt: value + '² = ?  (squares ending in 5)',
        promptBn: bn(value) + '² = ?  (৫ দিয়ে শেষ সংখ্যার বর্গ)',
        correctAnswer: String(answer),
        choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
        params: { value, kind },
        solutionSteps: [
          step('Take the tens digit ' + tens + ' and multiply by the next number: ' + tens + ' × ' + (tens + 1) + ' = ' + tens * (tens + 1)),
          step('Write 25 after it: ' + answer),
        ],
        explanation: 'For n5², compute n(n+1) and append 25.',
        explanationBn: 'n৫² এর জন্য n(n+১) বের করে শেষে ২৫ বসান।',
      };
    }
    const a = rng.int(20, 60 + difficulty * 20);
    const b = rng.int(20, 60 + difficulty * 20);
    const answer = a + b;
    return {
      prompt: a + ' + ' + b + ' = ?  (split into place values)',
      promptBn: bn(a) + ' + ' + bn(b) + ' = ?  (স্থানীয় মানে ভেঙে)',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
      params: { a, b, kind },
      solutionSteps: [
        step('Tens: ' + Math.floor(a / 10) * 10 + ' + ' + Math.floor(b / 10) * 10 + ' = ' + (Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10)),
        step('Units: ' + (a % 10) + ' + ' + (b % 10) + ' = ' + ((a % 10) + (b % 10))),
        step('Total = ' + answer),
      ],
      explanation: 'Adding tens and units separately avoids carrying mistakes.',
      explanationBn: 'দশক ও একক আলাদা যোগ করলে হাতে রাখার ভুল কমে।',
    };
  },
);

const estimation = defineGenerator(
  {
    id: 'brain.estimation',
    name: 'Estimate First',
    nameBn: 'আগে আন্দাজ',
    topicId: 'estimation',
    skillIds: ['skill.estimate'],
    questionType: 'estimation',
    brainCategory: 'estimation',
    tags: ['brain', 'estimation'],
    minDifficulty: 1,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const item = shopItem(rng);
    const unitPrice = rng.int(3, 12 + difficulty * 8) * 5;
    const quantity = rng.int(3, 6 + difficulty * 2);
    const exact = unitPrice * quantity;
    const rounded = Math.round(unitPrice / 10) * 10 * quantity;

    return {
      prompt:
        'Estimate the cost of ' +
        quantity +
        ' ' +
        item.unit +
        ' of ' +
        item.en +
        ' at ৳' +
        unitPrice +
        ' each. Which estimate is closest?',
      promptBn:
        'প্রতি ' +
        item.unitBn +
        ' ' +
        bn(unitPrice) +
        ' টাকা দরে ' +
        bn(quantity) +
        ' ' +
        item.unitBn +
        ' ' +
        item.bn +
        ' এর দাম আন্দাজ করুন। কোনটি সবচেয়ে কাছাকাছি?',
      correctAnswer: String(rounded),
      choices: [String(rounded * 2), String(Math.round(rounded / 2)), String(rounded + 100 * quantity)],
      params: { unitPrice, quantity },
      solutionSteps: [
        step('Round ৳' + unitPrice + ' to ৳' + Math.round(unitPrice / 10) * 10 + '.'),
        step(Math.round(unitPrice / 10) * 10 + ' × ' + quantity + ' = ' + rounded),
        step('Exact answer is ' + exact + ' — the estimate is within ৳' + Math.abs(exact - rounded) + '.'),
      ],
      explanation: 'A good estimate tells you instantly whether an exact answer is sensible.',
      explanationBn: 'ভালো আন্দাজ থাকলে সঠিক উত্তর যুক্তিসঙ্গত কি না তা সাথে সাথে বোঝা যায়।',
      hints: ['Round to the nearest ten before multiplying.'],
      hintsBn: ['গুণের আগে নিকটতম দশে নিন।'],
    };
  },
);

const moneyMath = defineGenerator(
  {
    id: 'brain.money',
    name: 'Money Math',
    nameBn: 'টাকার গণিত',
    topicId: 'money-shopping',
    skillIds: ['skill.money-sense', 'skill.budget'],
    questionType: 'word_problem',
    brainCategory: 'money_math',
    tags: ['brain', 'money', 'real-life'],
    minDifficulty: 1,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const who = person(rng);
    const item = shopItem(rng);
    const price = rng.int(3, 10 + difficulty * 5) * 12;
    const quantity = rng.int(2, 4 + difficulty);
    const paid = Math.ceil((price * quantity) / 100) * 100 + rng.pick([0, 100, 200]);
    const change = paid - price * quantity;

    return {
      prompt:
        who.en +
        ' buys ' +
        quantity +
        ' ' +
        item.unit +
        ' of ' +
        item.en +
        ' at ৳' +
        price +
        ' each and pays with ৳' +
        paid +
        '. How much change should ' +
        who.en +
        ' get?',
      promptBn:
        who.bn +
        ' প্রতি ' +
        item.unitBn +
        ' ' +
        bn(price) +
        ' টাকা দরে ' +
        bn(quantity) +
        ' ' +
        item.unitBn +
        ' ' +
        item.bn +
        ' কিনে ' +
        bn(paid) +
        ' টাকা দিল। কত টাকা ফেরত পাবে?',
      correctAnswer: String(change),
      choices: numericDistractors(change, rng, 3, { integer: true, min: 0 }),
      params: { price, quantity, paid },
      solutionSteps: [
        step('Cost = ' + price + ' × ' + quantity + ' = ' + price * quantity),
        step('Change = ' + paid + ' - ' + price * quantity + ' = ' + change),
      ],
      explanation: 'Total the purchase first, then subtract from what was handed over.',
      explanationBn: 'প্রথমে মোট দাম বের করে দেওয়া টাকা থেকে বিয়োগ করুন।',
      hints: ['Count up from the cost to the amount paid.'],
      hintsBn: ['দাম থেকে দেওয়া টাকা পর্যন্ত গুনে উঠুন।'],
    };
  },
);

const timeMath = defineGenerator(
  {
    id: 'brain.time',
    name: 'Time Sense',
    nameBn: 'সময়জ্ঞান',
    topicId: 'measurement',
    skillIds: ['skill.unit-conversion'],
    questionType: 'word_problem',
    brainCategory: 'time',
    tags: ['brain', 'time', 'real-life'],
    minDifficulty: 1,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const startHour = rng.int(6, 20);
    const startMinute = rng.pick([0, 10, 15, 20, 30, 40, 45, 50]);
    const durationMinutes = rng.int(20, 60 + difficulty * 40);
    const totalMinutes = startHour * 60 + startMinute + durationMinutes;
    const endHour = Math.floor(totalMinutes / 60) % 24;
    const endMinute = totalMinutes % 60;
    const format = (h: number, m: number): string => String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    const answer = format(endHour, endMinute);

    return {
      prompt:
        'A journey starts at ' +
        format(startHour, startMinute) +
        ' and takes ' +
        durationMinutes +
        ' minutes. What time does it end? (24-hour clock)',
      promptBn:
        'একটি যাত্রা ' +
        bn(format(startHour, startMinute)) +
        ' এ শুরু হয়ে ' +
        bn(durationMinutes) +
        ' মিনিট চলে। কখন শেষ হবে? (২৪ ঘণ্টা ঘড়ি)',
      correctAnswer: answer,
      choices: [
        format((endHour + 1) % 24, endMinute),
        format(endHour, (endMinute + 10) % 60),
        format((endHour + 24 - 1) % 24, endMinute),
      ],
      questionType: 'mcq',
      params: { startHour, startMinute, durationMinutes },
      solutionSteps: [
        step(durationMinutes + ' minutes = ' + Math.floor(durationMinutes / 60) + ' h ' + (durationMinutes % 60) + ' min'),
        step('Add the hours, then the minutes, carrying over 60.'),
        step('End time = ' + answer),
      ],
      explanation: 'Time carries at 60, not 100 — add hours and minutes separately.',
      explanationBn: 'সময়ে হাতে যায় ৬০ এ, ১০০ এ নয় — ঘণ্টা ও মিনিট আলাদা যোগ করুন।',
    };
  },
);

const measurementConversion = defineGenerator(
  {
    id: 'brain.measurement',
    name: 'Unit Conversion',
    nameBn: 'একক রূপান্তর',
    topicId: 'measurement',
    skillIds: ['skill.unit-conversion'],
    questionType: 'numeric',
    brainCategory: 'measurement',
    tags: ['brain', 'measurement'],
    minDifficulty: 1,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const conversions = [
      { from: 'km', to: 'm', factor: 1000 },
      { from: 'm', to: 'cm', factor: 100 },
      { from: 'kg', to: 'g', factor: 1000 },
      { from: 'litre', to: 'ml', factor: 1000 },
      { from: 'hour', to: 'minute', factor: 60 },
      { from: 'day', to: 'hour', factor: 24 },
      { from: 'week', to: 'day', factor: 7 },
    ];
    const c = conversions[rng.int(0, Math.min(conversions.length - 1, 2 + difficulty))];
    const value = rng.int(2, 8 + difficulty * 4);
    const result = convertUnit(value, c.factor, c.from, c.to);

    return {
      prompt: 'Convert ' + value + ' ' + c.from + ' into ' + c.to + '.',
      promptBn: bn(value) + ' ' + c.from + ' কে ' + c.to + ' এ রূপান্তর করুন।',
      correctAnswer: formatNumber(result.value),
      choices: numericDistractors(result.value, rng, 3, { min: 0 }),
      params: { value, from: c.from, to: c.to },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'Converting to a smaller unit multiplies; to a larger unit divides.',
      explanationBn: 'ছোট এককে গেলে গুণ, বড় এককে গেলে ভাগ হয়।',
      hints: ['1 ' + c.from + ' = ' + c.factor + ' ' + c.to],
      hintsBn: ['১ ' + c.from + ' = ' + bn(c.factor) + ' ' + c.to],
    };
  },
);

const visualMath = defineGenerator(
  {
    id: 'brain.visual',
    name: 'Visual Reasoning',
    nameBn: 'দৃশ্য যুক্তি',
    topicId: 'measurement',
    skillIds: ['skill.estimate'],
    questionType: 'mcq',
    brainCategory: 'visual_math',
    tags: ['brain', 'visual'],
    minDifficulty: 2,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const kinds = ['cube-faces', 'fold', 'grid-count', 'scale'] as const;
    const kind = kinds[rng.int(0, Math.min(kinds.length - 1, Math.floor(difficulty / 2)))];

    if (kind === 'cube-faces') {
      const n = rng.int(2, 3 + Math.floor(difficulty / 3));
      const answer = 6 * n * n;
      return {
        prompt: 'A cube of side ' + n + ' cm is painted on all faces. What is the total painted area in cm²?',
        promptBn: bn(n) + ' সেমি বাহুর একটি ঘনকের সব তল রং করা হলো। মোট রং করা ক্ষেত্রফল কত বর্গ সেমি?',
        correctAnswer: String(answer),
        choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
        params: { n, kind },
        solutionSteps: [
          step('A cube has 6 identical square faces.'),
          step('Each face = ' + n + '² = ' + n * n + ' cm²'),
          step('Total = 6 × ' + n * n + ' = ' + answer + ' cm²'),
        ],
        explanation: 'Surface area counts every face, not the volume.',
        explanationBn: 'পৃষ্ঠতলে সব তল গণনা হয়, আয়তন নয়।',
      };
    }
    if (kind === 'grid-count') {
      const rows = rng.int(3, 4 + difficulty);
      const cols = rng.int(3, 4 + difficulty);
      const answer = rows * cols;
      return {
        prompt: 'A floor is tiled ' + rows + ' tiles across and ' + cols + ' tiles down. How many tiles are used?',
        promptBn: 'একটি মেঝেতে আড়াআড়ি ' + bn(rows) + ' টি ও লম্বালম্বি ' + bn(cols) + ' টি টাইলস বসানো হলো। মোট কতটি টাইলস লাগল?',
        correctAnswer: String(answer),
        choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
        params: { rows, cols, kind },
        solutionSteps: [step('Rows × columns = ' + rows + ' × ' + cols + ' = ' + answer)],
        explanation: 'A rectangular array is counted by multiplying its two sides.',
        explanationBn: 'আয়তাকার সাজানো জিনিস দুই দিকের সংখ্যা গুণ করে গণনা হয়।',
      };
    }
    if (kind === 'fold') {
      const folds = rng.int(2, 3 + Math.floor(difficulty / 2));
      const answer = Math.pow(2, folds);
      return {
        prompt: 'A sheet of paper is folded in half ' + folds + ' times. How many layers are there?',
        promptBn: 'একটি কাগজ ' + bn(folds) + ' বার অর্ধেক ভাঁজ করা হলো। কতটি স্তর হবে?',
        correctAnswer: String(answer),
        choices: numericDistractors(answer, rng, 3, { integer: true, min: 1 }),
        params: { folds, kind },
        solutionSteps: [
          step('Each fold doubles the layers.'),
          step('layers = 2^' + folds + ' = ' + answer),
        ],
        explanation: 'Repeated doubling grows exponentially, not linearly.',
        explanationBn: 'বারবার দ্বিগুণ হওয়া সরলরেখায় নয়, সূচকীয় হারে বাড়ে।',
        hints: ['Doubling, not adding.'],
        hintsBn: ['যোগ নয়, দ্বিগুণ হচ্ছে।'],
      };
    }
    const scale = rng.pick([100, 200, 500, 1000]);
    const mapCm = rng.int(2, 8 + difficulty);
    return {
      prompt: 'On a map, 1 cm represents ' + scale + ' m. What real distance does ' + mapCm + ' cm represent, in metres?',
      promptBn: 'একটি মানচিত্রে ১ সেমি = ' + bn(scale) + ' মিটার। ' + bn(mapCm) + ' সেমি প্রকৃত কত মিটার বোঝায়?',
      correctAnswer: String(scale * mapCm),
      choices: numericDistractors(scale * mapCm, rng, 3, { integer: true, min: 0 }),
      params: { scale, mapCm, kind },
      solutionSteps: [
        step('1 cm → ' + scale + ' m'),
        step(mapCm + ' cm → ' + mapCm + ' × ' + scale + ' = ' + scale * mapCm + ' m'),
      ],
      explanation: 'A map scale is a multiplication factor.',
      explanationBn: 'মানচিত্রের স্কেল একটি গুণনীয়ক মাত্র।',
      hints: ['Multiply the map distance by the scale.'],
      hintsBn: ['মানচিত্রের দূরত্বকে স্কেল দিয়ে গুণ করুন।'],
    };
  },
);

const strategyChoice = defineGenerator(
  {
    id: 'brain.strategy',
    name: 'Best Strategy',
    nameBn: 'সেরা কৌশল',
    topicId: 'mental-math',
    skillIds: ['skill.mental-strategy'],
    questionType: 'mcq',
    brainCategory: 'strategy',
    tags: ['brain', 'strategy'],
    minDifficulty: 2,
    maxDifficulty: 8,
  },
  ({ rng }) => {
    const cases = [
      {
        en: 'Which is the quickest way to work out 25 × 16?',
        bn: '২৫ × ১৬ বের করার সবচেয়ে দ্রুত উপায় কোনটি?',
        answer: '25 × 4 × 4 = 100 × 4',
        wrong: ['Long multiplication digit by digit', 'Repeated addition of 25', 'Divide 16 by 25'],
        why: '16 = 4 × 4, and 25 × 4 = 100 makes the rest trivial.',
        whyBn: '১৬ = ৪ × ৪, আর ২৫ × ৪ = ১০০ হলে বাকিটা সহজ।',
      },
      {
        en: 'Which is the quickest way to find 15% of ৳800?',
        bn: '৮০০ টাকার ১৫% বের করার দ্রুততম উপায় কোনটি?',
        answer: '10% is 80, half of that is 40, so 120',
        wrong: ['Multiply 800 by 15 then divide by 10', 'Divide 800 by 15', 'Add 15 to 800'],
        why: 'Build 15% from 10% + 5%, both easy to halve and shift.',
        whyBn: '১০% ও ৫% মিলিয়ে ১৫% বের করা সহজ।',
      },
      {
        en: 'Which is the best first move for 998 + 457?',
        bn: '৯৯৮ + ৪৫৭ এর জন্য প্রথম সেরা পদক্ষেপ কোনটি?',
        answer: 'Make it 1000 + 457, then subtract 2',
        wrong: ['Add column by column with carrying', 'Round both to 1000 and 500', 'Subtract 457 from 998'],
        why: 'Compensation turns an awkward sum into a friendly one.',
        whyBn: 'সমন্বয় করে কঠিন যোগকে সহজ যোগে বদলানো যায়।',
      },
      {
        en: 'A shirt is ৳1200 with 25% off. Fastest route to the price?',
        bn: '১২০০ টাকার শার্টে ২৫% ছাড়। দাম বের করার দ্রুততম উপায়?',
        answer: 'Pay 3/4 of 1200 = 900',
        wrong: ['Find 25% then subtract twice', 'Divide 1200 by 25', 'Add 25% to 1200'],
        why: '25% off means paying three quarters — one division by 4.',
        whyBn: '২৫% ছাড় মানে তিন-চতুর্থাংশ দাম, শুধু ৪ দিয়ে ভাগ।',
      },
    ];
    const item = cases[rng.int(0, cases.length - 1)];

    return {
      prompt: item.en,
      promptBn: item.bn,
      correctAnswer: item.answer,
      choices: item.wrong,
      params: { case: item.answer.slice(0, 12) },
      solutionSteps: [step(item.why)],
      explanation: item.why,
      explanationBn: item.whyBn,
    };
  },
);

const numberSense = defineGenerator(
  {
    id: 'brain.number-sense',
    name: 'Number Sense',
    nameBn: 'সংখ্যাজ্ঞান',
    topicId: 'mental-math',
    skillIds: ['skill.mental-strategy'],
    questionType: 'mcq',
    brainCategory: 'number_sense',
    tags: ['brain', 'number-sense'],
    minDifficulty: 1,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const scale = 10 * Math.pow(2, difficulty - 1);
    const values = [
      rng.int(Math.round(scale), Math.round(scale * 4)),
      rng.int(Math.round(scale), Math.round(scale * 4)),
      rng.int(Math.round(scale), Math.round(scale * 4)),
      rng.int(Math.round(scale), Math.round(scale * 4)),
    ];
    const askLargest = rng.bool();
    const answer = askLargest ? Math.max(...values) : Math.min(...values);

    return {
      prompt: 'Which value is ' + (askLargest ? 'largest' : 'smallest') + '?',
      promptBn: 'কোন মানটি সবচেয়ে ' + (askLargest ? 'বড়' : 'ছোট') + '?',
      correctAnswer: String(answer),
      choices: values.filter((v) => v !== answer).map(String),
      params: { values: values.join('-'), askLargest: askLargest ? 1 : 0 },
      solutionSteps: [
        step('Compare place value from the left.'),
        step('Sorted: ' + values.slice().sort((a, b) => a - b).join(' < ')),
        step('Answer: ' + answer),
      ],
      explanation: 'Compare the highest place value first, then move right.',
      explanationBn: 'বাম দিকের সর্বোচ্চ স্থানীয় মান আগে তুলনা করুন।',
    };
  },
);

const speedSense = defineGenerator(
  {
    id: 'brain.speed-sense',
    name: 'Journey Sense',
    nameBn: 'যাত্রার হিসাব',
    topicId: 'time-speed-distance',
    skillIds: ['skill.speed-distance'],
    questionType: 'word_problem',
    brainCategory: 'speed',
    tags: ['brain', 'speed', 'real-life'],
    minDifficulty: 2,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const from = place(rng);
    const to = place(rng);
    const speed = rng.pick([20, 30, 40, 50, 60]);
    const minutes = rng.pick([15, 20, 30, 45, 90, 120]);
    const distance = (speed * minutes) / 60;

    return {
      prompt:
        'A bus from ' +
        from.en +
        ' to ' +
        to.en +
        ' averages ' +
        speed +
        ' km/h. How far does it get in ' +
        minutes +
        ' minutes?',
      promptBn:
        from.bn + ' থেকে ' + to.bn + ' এর বাস ঘণ্টায় গড়ে ' + bn(speed) + ' কিমি চলে। ' + bn(minutes) + ' মিনিটে কত কিমি যাবে?',
      correctAnswer: formatNumber(distance, 2),
      choices: numericDistractors(distance, rng, 3, { min: 0, decimals: 2 }),
      params: { speed, minutes },
      solutionSteps: [
        step(minutes + ' minutes = ' + formatNumber(minutes / 60, 4) + ' hours'),
        step('distance = ' + speed + ' × ' + formatNumber(minutes / 60, 4) + ' = ' + formatNumber(distance, 2) + ' km'),
      ],
      explanation: 'Convert minutes to hours before using a km/h speed.',
      explanationBn: 'কিমি/ঘণ্টা ব্যবহারের আগে মিনিটকে ঘণ্টায় নিন।',
      hints: ['30 minutes is half an hour.'],
      hintsBn: ['৩০ মিনিট মানে আধা ঘণ্টা।'],
    };
  },
);

export const BRAIN_GENERATORS: QuestionGenerator[] = [
  mentalMath,
  estimation,
  moneyMath,
  timeMath,
  measurementConversion,
  visualMath,
  strategyChoice,
  numberSense,
  speedSense,
];
