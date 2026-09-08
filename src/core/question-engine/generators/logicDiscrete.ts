import { determinant, multiplyMatrices } from '../../math/matrix';
import { formatNumber } from '../../utils/format';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors, PEOPLE, twoPeople } from './helpers';

const setsVenn = defineGenerator(
  {
    id: 'logic.sets',
    name: 'Sets & Venn Diagrams',
    nameBn: 'সেট ও ভেনচিত্র',
    topicId: 'set-theory',
    skillIds: ['skill.sets'],
    questionType: 'numeric',
    brainCategory: 'logic',
    tags: ['sets', 'logic'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const both = rng.int(5, 10 + difficulty * 3);
    const onlyA = rng.int(5, 15 + difficulty * 5);
    const onlyB = rng.int(5, 15 + difficulty * 5);
    const neither = rng.int(2, 8 + difficulty * 2);
    const total = onlyA + onlyB + both + neither;
    const setA = onlyA + both;
    const setB = onlyB + both;
    const mode = rng.int(0, 1);
    const answer = mode === 0 ? both : neither;

    return {
      prompt:
        'In a class of ' +
        total +
        ' students, ' +
        setA +
        ' play cricket, ' +
        setB +
        ' play football and ' +
        (mode === 0 ? neither + ' play neither' : both + ' play both') +
        '. How many play ' +
        (mode === 0 ? 'both' : 'neither') +
        '?',
      promptBn:
        bn(total) +
        ' জন শিক্ষার্থীর একটি শ্রেণিতে ' +
        bn(setA) +
        ' জন ক্রিকেট, ' +
        bn(setB) +
        ' জন ফুটবল খেলে এবং ' +
        (mode === 0 ? bn(neither) + ' জন কোনোটিই খেলে না' : bn(both) + ' জন দুটোই খেলে') +
        '। ' +
        (mode === 0 ? 'দুটোই' : 'কোনোটিই') +
        ' খেলে কতজন?',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
      params: { total, setA, setB, mode },
      solutionSteps: [
        step('n(A ∪ B) = n(A) + n(B) - n(A ∩ B)'),
        step(
          mode === 0
            ? 'n(A ∪ B) = ' + total + ' - ' + neither + ' = ' + (total - neither)
            : 'n(A ∪ B) = ' + setA + ' + ' + setB + ' - ' + both + ' = ' + (setA + setB - both),
        ),
        step(
          mode === 0
            ? 'n(A ∩ B) = ' + setA + ' + ' + setB + ' - ' + (total - neither) + ' = ' + both
            : 'neither = ' + total + ' - ' + (setA + setB - both) + ' = ' + neither,
        ),
      ],
      explanation: 'The inclusion-exclusion principle stops the overlap being counted twice.',
      explanationBn: 'অন্তর্ভুক্তি-বর্জন নীতিতে সাধারণ অংশ দুবার গণনা হওয়া রোধ হয়।',
      hints: ['Draw two overlapping circles and label the overlap.'],
      hintsBn: ['দুটি ছেদকারী বৃত্ত এঁকে সাধারণ অংশ চিহ্নিত করুন।'],
    };
  },
);

const arrangementPuzzle = defineGenerator(
  {
    id: 'logic.arrangement',
    name: 'Arrangement Puzzle',
    nameBn: 'সাজানোর ধাঁধা',
    topicId: 'logical-reasoning',
    skillIds: ['skill.arrangement', 'skill.deduction'],
    questionType: 'logic_puzzle',
    brainCategory: 'logic',
    tags: ['logic', 'puzzle'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 4,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const count = difficulty <= 5 ? 4 : 5;
    const names = rng.pickMany(PEOPLE, count);
    // Build a true ordering, then describe it with relative clues.
    const order = rng.shuffle(names);
    const clues: string[] = [];
    const cluesBn: string[] = [];
    for (let i = 0; i < order.length - 1; i++) {
      clues.push(order[i].en + ' is taller than ' + order[i + 1].en);
      cluesBn.push(order[i].bn + ' ' + order[i + 1].bn + ' এর চেয়ে লম্বা');
    }
    const shuffledClueIndexes = rng.shuffle(clues.map((_, i) => i));
    const askShortest = rng.bool();
    const answer = askShortest ? order[order.length - 1].en : order[0].en;

    return {
      prompt:
        shuffledClueIndexes.map((i) => clues[i]).join('. ') +
        '. Who is the ' +
        (askShortest ? 'shortest' : 'tallest') +
        '?',
      promptBn:
        shuffledClueIndexes.map((i) => cluesBn[i]).join('। ') +
        '। কে সবচেয়ে ' +
        (askShortest ? 'খাটো' : 'লম্বা') +
        '?',
      correctAnswer: answer,
      choices: order.filter((p) => p.en !== answer).map((p) => p.en).slice(0, 3),
      params: { order: order.map((p) => p.en).join('-'), askShortest: askShortest ? 1 : 0 },
      solutionSteps: [
        step('Chain the clues into one order.'),
        step('Tallest → shortest: ' + order.map((p) => p.en).join(' > ')),
        step('So the ' + (askShortest ? 'shortest' : 'tallest') + ' is ' + answer + '.'),
      ],
      explanation: 'Relative clues combine into a single chain — build it before answering.',
      explanationBn: 'আপেক্ষিক তথ্যগুলো একটি শৃঙ্খলে সাজিয়ে নিলে উত্তর স্পষ্ট হয়।',
      hints: ['Write the names in a line and place each clue.'],
      hintsBn: ['নামগুলো এক লাইনে লিখে প্রতিটি তথ্য বসান।'],
    };
  },
);

const findTheError = defineGenerator(
  {
    id: 'logic.find-error',
    name: 'Find the Error',
    nameBn: 'ভুল খুঁজুন',
    topicId: 'logical-reasoning',
    skillIds: ['skill.deduction'],
    questionType: 'find_error',
    brainCategory: 'critical_thinking',
    tags: ['logic', 'error'],
    minDifficulty: 3,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const cases = [
      {
        en: 'Step 1: 2 + 3 × 4. Step 2: = 5 × 4. Step 3: = 20.',
        bn: 'ধাপ ১: ২ + ৩ × ৪। ধাপ ২: = ৫ × ৪। ধাপ ৩: = ২০।',
        answer: 'Step 2',
        why: 'Multiplication must come before addition: 2 + 12 = 14.',
        whyBn: 'যোগের আগে গুণ করতে হয়: ২ + ১২ = ১৪।',
      },
      {
        en: 'Step 1: 1/2 + 1/3. Step 2: = 2/5. Step 3: done.',
        bn: 'ধাপ ১: ১/২ + ১/৩। ধাপ ২: = ২/৫। ধাপ ৩: শেষ।',
        answer: 'Step 2',
        why: 'You cannot add numerators and denominators; the answer is 5/6.',
        whyBn: 'লব ও হর আলাদা যোগ করা যায় না; সঠিক উত্তর ৫/৬।',
      },
      {
        en: 'Step 1: (x + 2)² . Step 2: = x² + 4. Step 3: done.',
        bn: 'ধাপ ১: (x + ২)²। ধাপ ২: = x² + ৪। ধাপ ৩: শেষ।',
        answer: 'Step 2',
        why: 'The middle term is missing: (x + 2)² = x² + 4x + 4.',
        whyBn: 'মধ্যপদ বাদ পড়েছে: (x + ২)² = x² + ৪x + ৪।',
      },
      {
        en: 'Step 1: 20% of 50 is 10. Step 2: so 50 is 20% of 10. Step 3: done.',
        bn: 'ধাপ ১: ৫০ এর ২০% = ১০। ধাপ ২: তাই ১০ এর ২০% = ৫০। ধাপ ৩: শেষ।',
        answer: 'Step 2',
        why: 'Percentages are not symmetric; 20% of 10 is 2.',
        whyBn: 'শতকরা প্রতিসম নয়; ১০ এর ২০% = ২।',
      },
      {
        en: 'Step 1: √(9 + 16). Step 2: = 3 + 4. Step 3: = 7.',
        bn: 'ধাপ ১: √(৯ + ১৬)। ধাপ ২: = ৩ + ৪। ধাপ ৩: = ৭।',
        answer: 'Step 2',
        why: 'The root of a sum is not the sum of the roots: √25 = 5.',
        whyBn: 'যোগফলের বর্গমূল বর্গমূলের যোগফল নয়: √২৫ = ৫।',
      },
      {
        en: 'Step 1: a job takes 6 days for 3 workers. Step 2: so 6 workers take 12 days. Step 3: done.',
        bn: 'ধাপ ১: ৩ জনের ৬ দিন লাগে। ধাপ ২: তাই ৬ জনের ১২ দিন লাগবে। ধাপ ৩: শেষ।',
        answer: 'Step 2',
        why: 'More workers means fewer days — this is inverse proportion, so 3 days.',
        whyBn: 'শ্রমিক বাড়লে দিন কমে; এটি বিপরীত সমানুপাত, তাই ৩ দিন।',
      },
    ];
    const item = cases[rng.int(0, Math.min(cases.length - 1, 1 + Math.floor(difficulty / 1.5)))];

    return {
      prompt: 'Which step contains the mistake?\n' + item.en,
      promptBn: 'কোন ধাপে ভুল আছে?\n' + item.bn,
      correctAnswer: item.answer,
      options: [
        { id: 's1', text: 'Step 1', textBn: 'ধাপ ১' },
        { id: 's2', text: 'Step 2', textBn: 'ধাপ ২' },
        { id: 's3', text: 'Step 3', textBn: 'ধাপ ৩' },
        { id: 'none', text: 'No mistake', textBn: 'কোনো ভুল নেই' },
      ],
      acceptedAnswers: [item.answer],
      params: { case: item.answer + '-' + item.en.length },
      solutionSteps: [step('Check each step against the rules.'), step(item.why)],
      explanation: item.why,
      explanationBn: item.whyBn,
      hints: ['Recompute each step yourself before comparing.'],
      hintsBn: ['তুলনার আগে নিজে প্রতিটি ধাপ হিসাব করুন।'],
    };
  },
);

const matrixOps = defineGenerator(
  {
    id: 'la.matrix',
    name: 'Matrix Operations',
    nameBn: 'ম্যাট্রিক্স প্রক্রিয়া',
    topicId: 'linear-algebra',
    skillIds: ['skill.matrix-ops', 'skill.determinant'],
    questionType: 'numeric',
    tags: ['matrix', 'linear-algebra'],
    examIds: ['exam.hsc-math'],
    minDifficulty: 5,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const a = [
      [rng.int(-4, 8), rng.int(-4, 8)],
      [rng.int(-4, 8), rng.int(-4, 8)],
    ];
    const askDeterminant = difficulty <= 6 || rng.bool();

    if (askDeterminant) {
      const answer = determinant(a);
      return {
        prompt:
          'Find the determinant of the matrix [[' + a[0][0] + ', ' + a[0][1] + '], [' + a[1][0] + ', ' + a[1][1] + ']].',
        promptBn:
          '[[' + bn(a[0][0]) + ', ' + bn(a[0][1]) + '], [' + bn(a[1][0]) + ', ' + bn(a[1][1]) + ']] ম্যাট্রিক্সের নির্ণায়ক কত?',
        correctAnswer: formatNumber(answer),
        choices: numericDistractors(answer, rng, 3, { integer: true }),
        params: { a: a.flat().join('-'), mode: 'det' },
        solutionSteps: [
          step('For [[a, b], [c, d]], det = ad - bc.'),
          step('det = (' + a[0][0] + ')(' + a[1][1] + ') - (' + a[0][1] + ')(' + a[1][0] + ')'),
          step('det = ' + formatNumber(answer)),
        ],
        explanation: 'The determinant tells you whether the matrix is invertible.',
        explanationBn: 'নির্ণায়ক বলে দেয় ম্যাট্রিক্সটির বিপরীত আছে কি না।',
        hints: ['Multiply the main diagonal, subtract the other diagonal.'],
        hintsBn: ['প্রধান কর্ণ গুণ করে অন্য কর্ণের গুণফল বিয়োগ করুন।'],
      };
    }

    const b = [
      [rng.int(-3, 5), rng.int(-3, 5)],
      [rng.int(-3, 5), rng.int(-3, 5)],
    ];
    const product = multiplyMatrices(a, b);
    const answer = product[0][0];

    return {
      prompt:
        'For A = [[' +
        a[0][0] + ', ' + a[0][1] + '], [' + a[1][0] + ', ' + a[1][1] + ']] and B = [[' +
        b[0][0] + ', ' + b[0][1] + '], [' + b[1][0] + ', ' + b[1][1] +
        ']], find the top-left entry of AB.',
      promptBn:
        'A = [[' + bn(a[0][0]) + ', ' + bn(a[0][1]) + '], [' + bn(a[1][0]) + ', ' + bn(a[1][1]) +
        ']] এবং B = [[' + bn(b[0][0]) + ', ' + bn(b[0][1]) + '], [' + bn(b[1][0]) + ', ' + bn(b[1][1]) +
        ']] হলে AB এর প্রথম সারির প্রথম উপাদান কত?',
      correctAnswer: formatNumber(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true }),
      params: { a: a.flat().join('-'), b: b.flat().join('-'), mode: 'mul' },
      solutionSteps: [
        step('Entry (1,1) = row 1 of A · column 1 of B.'),
        step('= (' + a[0][0] + ')(' + b[0][0] + ') + (' + a[0][1] + ')(' + b[1][0] + ')'),
        step('= ' + formatNumber(answer)),
      ],
      explanation: 'Matrix multiplication pairs a row with a column.',
      explanationBn: 'ম্যাট্রিক্স গুণে একটি সারি একটি কলামের সাথে মিলে।',
    };
  },
);

const graphDegrees = defineGenerator(
  {
    id: 'discrete.graph',
    name: 'Graph Degrees',
    nameBn: 'গ্রাফের মাত্রা',
    topicId: 'graph-theory',
    skillIds: ['skill.graph-basics'],
    questionType: 'numeric',
    brainCategory: 'logic',
    tags: ['graph-theory', 'discrete'],
    minDifficulty: 6,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const vertices = rng.int(4, 5 + Math.min(4, difficulty));
    const complete = rng.bool();
    const edges = complete ? (vertices * (vertices - 1)) / 2 : rng.int(vertices - 1, vertices + 3);
    const answer = complete ? edges : 2 * edges;

    return {
      prompt: complete
        ? 'How many edges does a complete graph on ' + vertices + ' vertices have?'
        : 'A graph has ' + vertices + ' vertices and ' + edges + ' edges. What is the sum of all vertex degrees?',
      promptBn: complete
        ? bn(vertices) + ' শীর্ষবিশিষ্ট একটি পূর্ণ গ্রাফে কতটি প্রান্ত আছে?'
        : 'একটি গ্রাফে ' + bn(vertices) + ' টি শীর্ষ ও ' + bn(edges) + ' টি প্রান্ত আছে। সব শীর্ষের মাত্রার সমষ্টি কত?',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
      params: { vertices, edges, complete: complete ? 1 : 0 },
      solutionSteps: complete
        ? [
            step('Every pair of vertices is joined once.'),
            step('edges = C(n, 2) = n(n-1)/2 = ' + vertices + '×' + (vertices - 1) + '/2 = ' + answer),
          ]
        : [
            step('Handshaking lemma: Σ degrees = 2 × edges.'),
            step('Σ degrees = 2 × ' + edges + ' = ' + answer),
          ],
      explanation: complete
        ? 'A complete graph joins every pair exactly once.'
        : 'Every edge contributes 1 to the degree of each of its two endpoints.',
      explanationBn: complete
        ? 'পূর্ণ গ্রাফে প্রতিটি জোড়া শীর্ষ একবার সংযুক্ত থাকে।'
        : 'প্রতিটি প্রান্ত তার দুই শীর্ষের মাত্রায় ১ করে যোগ করে।',
    };
  },
);

const ageLogic = defineGenerator(
  {
    id: 'logic.deduction',
    name: 'Deduction Puzzle',
    nameBn: 'অনুমানের ধাঁধা',
    topicId: 'logical-reasoning',
    skillIds: ['skill.deduction'],
    questionType: 'logic_puzzle',
    brainCategory: 'critical_thinking',
    tags: ['logic', 'deduction'],
    minDifficulty: 5,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const [first] = twoPeople(rng);
    const rawTotal = rng.int(20, 40 + difficulty * 10);
    const diff = rng.int(2, Math.min(rawTotal - 2, 6 + difficulty * 2));
    // Keep both numbers whole.
    const total = (rawTotal + diff) % 2 === 0 ? rawTotal : rawTotal + 1;
    return buildDeduction(first, total, diff);
  },
);

function buildDeduction(first: { en: string; bn: string }, total: number, diff: number) {
  const larger = (total + diff) / 2;
  const smaller = total - larger;
  return {
    prompt:
      'Two numbers add to ' +
      total +
      ' and differ by ' +
      diff +
      '. ' +
      first.en +
      ' claims the larger number is ' +
      larger +
      '. Is ' +
      first.en +
      ' right, and what is the smaller number?',
    promptBn:
      'দুটি সংখ্যার যোগফল ' +
      bn(total) +
      ' এবং অন্তর ' +
      bn(diff) +
      '। ' +
      first.bn +
      ' বলছে বড় সংখ্যাটি ' +
      bn(larger) +
      '। ছোট সংখ্যাটি কত?',
    correctAnswer: String(smaller),
    choices: [String(smaller + 1), String(Math.max(0, smaller - 1)), String(larger)],
    params: { total, diff },
    solutionSteps: [
      step('larger + smaller = ' + total),
      step('larger - smaller = ' + diff),
      step('Adding: 2 × larger = ' + (total + diff) + ', so larger = ' + larger),
      step('smaller = ' + total + ' - ' + larger + ' = ' + smaller),
    ],
    explanation: 'Adding and subtracting the two facts isolates each unknown.',
    explanationBn: 'দুটি তথ্য যোগ ও বিয়োগ করলে প্রতিটি অজানা আলাদা হয়ে যায়।',
    hints: ['Add the two equations together.'],
    hintsBn: ['দুটি সমীকরণ যোগ করুন।'],
  };
}

export const LOGIC_DISCRETE_GENERATORS: QuestionGenerator[] = [
  setsVenn,
  arrangementPuzzle,
  findTheError,
  matrixOps,
  graphDegrees,
  ageLogic,
];
