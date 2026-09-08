import { combinations, permutations } from '../../math/numberTheory';
import { simpleProbability } from '../../math/probability';
import { mean, median, modes } from '../../math/statistics';
import { toString as fracToString, frac } from '../../math/fraction';
import { formatNumber } from '../../utils/format';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors, person } from './helpers';

const diceCoin = defineGenerator(
  {
    id: 'prob.dice-coin',
    name: 'Dice & Coins',
    nameBn: 'ছক্কা ও মুদ্রা',
    topicId: 'basic-probability',
    skillIds: ['skill.probability-basic'],
    questionType: 'mcq',
    brainCategory: 'probability',
    tags: ['probability'],
    examIds: ['exam.ssc-math', 'exam.bcs-math'],
    minDifficulty: 3,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const scenarios = [
      {
        favourable: 3,
        total: 6,
        en: 'A fair die is rolled. What is the probability of getting an even number?',
        bn: 'একটি নিরপেক্ষ ছক্কা নিক্ষেপ করা হলো। জোড় সংখ্যা পাওয়ার সম্ভাবনা কত?',
      },
      {
        favourable: 2,
        total: 6,
        en: 'A fair die is rolled. What is the probability of getting a number greater than 4?',
        bn: 'একটি ছক্কা নিক্ষেপে ৪ এর চেয়ে বড় সংখ্যা পাওয়ার সম্ভাবনা কত?',
      },
      {
        favourable: 1,
        total: 4,
        en: 'Two fair coins are tossed. What is the probability of getting two heads?',
        bn: 'দুটি নিরপেক্ষ মুদ্রা নিক্ষেপে দুটোই হেড পাওয়ার সম্ভাবনা কত?',
      },
      {
        favourable: 3,
        total: 4,
        en: 'Two fair coins are tossed. What is the probability of getting at least one head?',
        bn: 'দুটি মুদ্রা নিক্ষেপে অন্তত একটি হেড পাওয়ার সম্ভাবনা কত?',
      },
      {
        favourable: 13,
        total: 52,
        en: 'A card is drawn from a standard deck. What is the probability that it is a heart?',
        bn: 'একটি তাস ৫২টি তাসের প্যাকেট থেকে তোলা হলো। এটি হার্ট হওয়ার সম্ভাবনা কত?',
      },
      {
        favourable: 6,
        total: 36,
        en: 'Two dice are rolled. What is the probability that the sum is 7?',
        bn: 'দুটি ছক্কা নিক্ষেপে যোগফল ৭ হওয়ার সম্ভাবনা কত?',
      },
      {
        favourable: 4,
        total: 52,
        en: 'A card is drawn from a deck. What is the probability that it is an ace?',
        bn: 'একটি তাস তোলা হলো। এটি টেক্কা হওয়ার সম্ভাবনা কত?',
      },
    ];
    const scenario = scenarios[rng.int(0, Math.min(scenarios.length - 1, 2 + difficulty))];
    const result = simpleProbability(scenario.favourable, scenario.total);
    const answer = result.exact;
    const pool = [
      fracToString(frac(scenario.favourable + 1, scenario.total)),
      fracToString(frac(scenario.total - scenario.favourable, scenario.total)),
      fracToString(frac(1, scenario.total)),
      fracToString(frac(scenario.favourable, scenario.total + 1)),
    ].filter((v) => v !== answer);

    return {
      prompt: scenario.en,
      promptBn: scenario.bn,
      correctAnswer: answer,
      choices: rng.shuffle(pool).slice(0, 3),
      params: { favourable: scenario.favourable, total: scenario.total },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'For equally likely outcomes, probability is favourable ÷ total.',
      explanationBn: 'সমসম্ভাব্য ফলের ক্ষেত্রে সম্ভাবনা = অনুকূল ফল ÷ মোট ফল।',
      hints: ['Count the total outcomes first.'],
      hintsBn: ['প্রথমে মোট সম্ভাব্য ফল গণনা করুন।'],
    };
  },
);

const counting = defineGenerator(
  {
    id: 'prob.counting',
    name: 'Permutations & Combinations',
    nameBn: 'বিন্যাস ও সমাবেশ',
    topicId: 'combinatorics',
    skillIds: ['skill.permutation', 'skill.combination'],
    questionType: 'numeric',
    tags: ['combinatorics'],
    examIds: ['exam.hsc-math', 'exam.bcs-math'],
    minDifficulty: 5,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const n = rng.int(5, 6 + Math.min(6, difficulty));
    const r = rng.int(2, Math.min(4, n - 1));
    const isCombination = rng.bool();
    const answer = isCombination ? combinations(n, r) : permutations(n, r);

    return {
      prompt: isCombination
        ? 'In how many ways can a committee of ' + r + ' be chosen from ' + n + ' people?'
        : 'In how many ways can ' + r + ' prizes be given to ' + n + ' students, where order matters?',
      promptBn: isCombination
        ? bn(n) + ' জন থেকে ' + bn(r) + ' জনের একটি কমিটি কত উপায়ে গঠন করা যায়?'
        : bn(n) + ' জন শিক্ষার্থীর মধ্যে ক্রম বিবেচনায় ' + bn(r) + ' টি পুরস্কার কত উপায়ে দেওয়া যায়?',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 1 }),
      params: { n, r, isCombination: isCombination ? 1 : 0 },
      solutionSteps: [
        step(isCombination ? 'Order does not matter → use C(n, r).' : 'Order matters → use P(n, r).'),
        step(
          isCombination
            ? 'C(' + n + ', ' + r + ') = ' + n + '! / [' + r + '!(' + (n - r) + ')!] = ' + answer
            : 'P(' + n + ', ' + r + ') = ' + n + '! / ' + (n - r) + '! = ' + answer,
        ),
      ],
      explanation: 'Combinations count selections; permutations count arrangements.',
      explanationBn: 'সমাবেশ বাছাই গণনা করে, বিন্যাস সাজানো গণনা করে।',
      hints: ['Ask yourself whether swapping two picks makes a new outcome.'],
      hintsBn: ['দুটি বাছাই অদলবদল করলে নতুন ফল হয় কি না ভাবুন।'],
    };
  },
);

const centralTendency = defineGenerator(
  {
    id: 'stat.central-tendency',
    name: 'Mean, Median, Mode',
    nameBn: 'গড়, মধ্যক, প্রচুরক',
    topicId: 'descriptive-statistics',
    skillIds: ['skill.central-tendency'],
    questionType: 'numeric',
    tags: ['statistics'],
    examIds: ['exam.ssc-math', 'exam.bcs-math'],
    minDifficulty: 3,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const count = rng.int(5, 6 + Math.min(4, difficulty));
    const values: number[] = [];
    for (let i = 0; i < count; i++) values.push(rng.int(5, 20 + difficulty * 8));
    // Guarantee a mode exists.
    values.push(values[rng.int(0, values.length - 1)]);
    const which = rng.int(0, 2);
    const modeList = modes(values);
    const answer =
      which === 0 ? mean(values) : which === 1 ? median(values) : (modeList[0] ?? median(values));
    const label = which === 0 ? 'mean' : which === 1 ? 'median' : 'mode';
    const labelBn = which === 0 ? 'গড়' : which === 1 ? 'মধ্যক' : 'প্রচুরক';

    return {
      prompt: 'Find the ' + label + ' of: ' + values.join(', '),
      promptBn: labelBn + ' নির্ণয় করুন: ' + values.map((v) => bn(v)).join(', '),
      correctAnswer: formatNumber(answer, 2),
      choices: numericDistractors(answer, rng, 3, { decimals: 2, min: 0 }),
      params: { values: values.join('-'), which },
      solutionSteps: [
        step('Sorted: ' + values.slice().sort((a, b) => a - b).join(', ')),
        step(
          which === 0
            ? 'mean = sum ÷ count = ' + values.reduce((a, b) => a + b, 0) + ' ÷ ' + values.length
            : which === 1
              ? 'median is the middle value of the sorted list'
              : 'mode is the value that appears most often',
        ),
        step(label + ' = ' + formatNumber(answer, 2)),
      ],
      explanation: 'Mean uses every value, median uses position, mode uses frequency.',
      explanationBn: 'গড়ে সব মান, মধ্যকে অবস্থান, প্রচুরকে পুনরাবৃত্তি বিবেচিত হয়।',
      hints: [which === 1 ? 'Sort the numbers first.' : 'Check whether every value matters.'],
      hintsBn: [which === 1 ? 'আগে সংখ্যাগুলো সাজান।' : 'সব মান গুরুত্বপূর্ণ কি না দেখুন।'],
    };
  },
);

const chartReading = defineGenerator(
  {
    id: 'stat.chart',
    name: 'Reading a Chart',
    nameBn: 'লেখচিত্র পাঠ',
    topicId: 'data-interpretation',
    skillIds: ['skill.chart-reading'],
    questionType: 'graph_interpretation',
    brainCategory: 'data_interpretation',
    tags: ['statistics', 'data'],
    examIds: ['exam.bank-math', 'exam.bcs-math'],
    minDifficulty: 3,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const monthsBn = ['জানু', 'ফেব', 'মার্চ', 'এপ্রি', 'মে'];
    const values = months.map(() => rng.int(20, 40 + difficulty * 20));
    const mode = rng.int(0, 2);
    const total = values.reduce((a, b) => a + b, 0);
    const maxIndex = values.indexOf(Math.max(...values));
    const table = months.map((m, i) => m + ': ' + values[i]).join(' | ');
    const tableBn = monthsBn.map((m, i) => m + ': ' + bn(values[i])).join(' | ');

    if (mode === 0) {
      return {
        prompt: 'Monthly sales (in thousands):\n' + table + '\nWhat is the total for the five months?',
        promptBn: 'মাসিক বিক্রয় (হাজারে):\n' + tableBn + '\nপাঁচ মাসের মোট কত?',
        correctAnswer: String(total),
        choices: numericDistractors(total, rng, 3, { integer: true, min: 0 }),
        params: { values: values.join('-'), mode },
        solutionSteps: [step('Add every column: ' + values.join(' + ') + ' = ' + total)],
        explanation: 'Reading a table accurately matters more than speed here.',
        explanationBn: 'এখানে গতি নয়, সঠিকভাবে সারণি পড়াই বেশি জরুরি।',
      };
    }
    if (mode === 1) {
      const answer = mean(values);
      return {
        prompt: 'Monthly sales (in thousands):\n' + table + '\nWhat is the average monthly sale?',
        promptBn: 'মাসিক বিক্রয় (হাজারে):\n' + tableBn + '\nমাসিক গড় বিক্রয় কত?',
        correctAnswer: formatNumber(answer, 2),
        choices: numericDistractors(answer, rng, 3, { decimals: 2, min: 0 }),
        params: { values: values.join('-'), mode },
        solutionSteps: [
          step('Total = ' + total),
          step('Average = ' + total + ' ÷ 5 = ' + formatNumber(answer, 2)),
        ],
        explanation: 'Average monthly value is the total divided by the number of months.',
        explanationBn: 'মাসিক গড় = মোট ÷ মাসের সংখ্যা।',
      };
    }
    const share = (values[maxIndex] / total) * 100;
    return {
      prompt:
        'Monthly sales (in thousands):\n' +
        table +
        '\nWhat percentage of the total came from ' +
        months[maxIndex] +
        '? (nearest 0.01)',
      promptBn:
        'মাসিক বিক্রয় (হাজারে):\n' + tableBn + '\nমোট বিক্রয়ের কত শতাংশ ' + monthsBn[maxIndex] + ' মাসে হয়েছে?',
      correctAnswer: formatNumber(share, 2),
      choices: numericDistractors(share, rng, 3, { decimals: 2, min: 0 }),
      tolerance: 0.05,
      params: { values: values.join('-'), mode },
      solutionSteps: [
        step('Total = ' + total),
        step(months[maxIndex] + ' share = ' + values[maxIndex] + ' / ' + total + ' × 100'),
        step('= ' + formatNumber(share, 2) + '%'),
      ],
      explanation: 'A share is always part ÷ whole × 100.',
      explanationBn: 'অংশের শতকরা = অংশ ÷ মোট × ১০০।',
    };
  },
);

const conditionalProbabilityGen = defineGenerator(
  {
    id: 'prob.conditional',
    name: 'Probability Without Replacement',
    nameBn: 'প্রতিস্থাপন ছাড়া সম্ভাব্যতা',
    topicId: 'conditional-probability',
    skillIds: ['skill.probability-compound'],
    questionType: 'mcq',
    tags: ['probability', 'conditional'],
    examIds: ['exam.hsc-math', 'exam.bcs-math'],
    minDifficulty: 6,
    maxDifficulty: 9,
  },
  ({ rng }) => {
    const who = person(rng);
    const red = rng.int(3, 8);
    const blue = rng.int(3, 8);
    const total = red + blue;
    const numerator = red * (red - 1);
    const denominator = total * (total - 1);
    const answer = fracToString(frac(numerator, denominator));

    return {
      prompt:
        'A bag holds ' +
        red +
        ' red and ' +
        blue +
        ' blue balls. ' +
        who.en +
        ' draws two balls without replacement. What is the probability that both are red?',
      promptBn:
        'একটি ব্যাগে ' +
        bn(red) +
        ' টি লাল ও ' +
        bn(blue) +
        ' টি নীল বল আছে। ' +
        who.bn +
        ' প্রতিস্থাপন ছাড়া দুটি বল তুলল। দুটোই লাল হওয়ার সম্ভাবনা কত?',
      correctAnswer: answer,
      choices: [
        fracToString(frac(red * red, total * total)),
        fracToString(frac(red, total)),
        fracToString(frac(red * (red - 1), total * total)),
      ],
      params: { red, blue },
      solutionSteps: [
        step('First draw: P(red) = ' + red + '/' + total),
        step('Second draw (one red gone): P(red) = ' + (red - 1) + '/' + (total - 1)),
        step('Multiply: ' + red + '/' + total + ' × ' + (red - 1) + '/' + (total - 1) + ' = ' + answer),
      ],
      explanation: 'Without replacement, the second probability depends on the first draw.',
      explanationBn: 'প্রতিস্থাপন ছাড়া দ্বিতীয় সম্ভাবনা প্রথম তোলার উপর নির্ভর করে।',
      hints: ['The totals shrink after the first draw.'],
      hintsBn: ['প্রথম তোলার পরে মোট সংখ্যা কমে যায়।'],
    };
  },
);

export const DATA_CHANCE_GENERATORS: QuestionGenerator[] = [
  diceCoin,
  counting,
  centralTendency,
  chartReading,
  conditionalProbabilityGen,
];
