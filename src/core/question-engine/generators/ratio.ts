import { mixtureAlligation, ratioShare, simplifyRatio, unitaryMethod } from '../../math/arithmetic';
import { mean } from '../../math/statistics';
import { formatNumber } from '../../utils/format';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors, person, shopItem, twoPeople } from './helpers';

const shareInRatio = defineGenerator(
  {
    id: 'ratio.share',
    name: 'Sharing in a Ratio',
    nameBn: 'অনুপাতে ভাগ',
    topicId: 'ratio-proportion',
    skillIds: ['skill.ratio-share'],
    questionType: 'word_problem',
    brainCategory: 'money_math',
    tags: ['ratio'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 3,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const [first, second] = twoPeople(rng);
    const partA = rng.int(1, 3 + difficulty);
    const partB = rng.int(1, 3 + difficulty);
    const unit = rng.int(3, 8 + difficulty * 4) * 10;
    const total = (partA + partB) * unit;
    const result = ratioShare(total, [partA, partB]);
    const answer = result.values[0];

    return {
      prompt:
        '৳' +
        total +
        ' is shared between ' +
        first.en +
        ' and ' +
        second.en +
        ' in the ratio ' +
        partA +
        ' : ' +
        partB +
        '. How much does ' +
        first.en +
        ' get?',
      promptBn:
        bn(total) +
        ' টাকা ' +
        first.bn +
        ' ও ' +
        second.bn +
        ' এর মধ্যে ' +
        bn(partA) +
        ' : ' +
        bn(partB) +
        ' অনুপাতে ভাগ করা হলো। ' +
        first.bn +
        ' কত টাকা পাবে?',
      correctAnswer: formatNumber(answer, 2),
      choices: numericDistractors(answer, rng, 3, { min: 0, decimals: 2 }),
      params: { total, partA, partB },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'Add the ratio parts to find the value of one part, then scale up.',
      explanationBn: 'অনুপাতের অংশগুলো যোগ করে এক অংশের মান বের করুন, তারপর গুণ করুন।',
      hints: ['Total parts = ' + (partA + partB) + '.'],
      hintsBn: ['মোট অংশ = ' + bn(partA + partB) + '।'],
    };
  },
);

const simplifyRatioGen = defineGenerator(
  {
    id: 'ratio.simplify',
    name: 'Simplifying a Ratio',
    nameBn: 'অনুপাত সরলীকরণ',
    topicId: 'ratio-proportion',
    skillIds: ['skill.ratio-share'],
    questionType: 'mcq',
    tags: ['ratio'],
    minDifficulty: 2,
    maxDifficulty: 5,
  },
  ({ rng, difficulty }) => {
    const base = rng.int(2, 4 + difficulty);
    const a = base * rng.int(2, 5);
    const b = base * rng.int(2, 7);
    const result = simplifyRatio(a, b);

    return {
      prompt: 'Simplify the ratio ' + a + ' : ' + b + '.',
      promptBn: bn(a) + ' : ' + bn(b) + ' অনুপাতটি সরল করুন।',
      correctAnswer: result.ratio,
      choices: [
        a + ' : ' + b,
        Math.round(a / 2) + ' : ' + Math.round(b / 2),
        result.fraction.d + ' : ' + result.fraction.n,
      ],
      params: { a, b },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'Divide both sides of a ratio by their greatest common divisor.',
      explanationBn: 'অনুপাতের উভয় পদকে তাদের গসাগু দিয়ে ভাগ করুন।',
    };
  },
);

const proportion = defineGenerator(
  {
    id: 'ratio.proportion',
    name: 'Direct Proportion',
    nameBn: 'সরল সমানুপাত',
    topicId: 'ratio-proportion',
    skillIds: ['skill.proportion'],
    questionType: 'word_problem',
    brainCategory: 'money_math',
    tags: ['proportion', 'unitary'],
    minDifficulty: 2,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const item = shopItem(rng);
    const quantityA = rng.int(2, 4 + difficulty);
    const unitPrice = rng.int(2, 8 + difficulty * 3) * 5;
    const costA = quantityA * unitPrice;
    const quantityB = rng.int(quantityA + 1, quantityA + 6 + difficulty);
    const result = unitaryMethod(quantityA, costA, quantityB);

    return {
      prompt:
        quantityA +
        ' ' +
        item.unit +
        ' of ' +
        item.en +
        ' cost ৳' +
        costA +
        '. How much do ' +
        quantityB +
        ' ' +
        item.unit +
        ' cost?',
      promptBn:
        bn(quantityA) +
        ' ' +
        item.unitBn +
        ' ' +
        item.bn +
        ' এর দাম ' +
        bn(costA) +
        ' টাকা। ' +
        bn(quantityB) +
        ' ' +
        item.unitBn +
        ' এর দাম কত?',
      correctAnswer: formatNumber(result.value, 2),
      choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
      params: { quantityA, costA, quantityB },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'The unitary method finds the cost of one unit first.',
      explanationBn: 'ঐকিক নিয়মে আগে এক এককের দাম বের করা হয়।',
      hints: ['Find the price of 1 ' + item.unit + ' first.'],
      hintsBn: ['প্রথমে ১ ' + item.unitBn + ' এর দাম বের করুন।'],
    };
  },
);

const inverseProportion = defineGenerator(
  {
    id: 'ratio.inverse-proportion',
    name: 'Inverse Proportion',
    nameBn: 'বিপরীত সমানুপাত',
    topicId: 'ratio-proportion',
    skillIds: ['skill.proportion'],
    questionType: 'word_problem',
    tags: ['proportion'],
    examIds: ['exam.bcs-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const workers = rng.int(4, 6 + difficulty * 2);
    const days = rng.int(6, 10 + difficulty * 3);
    const totalWork = workers * days;
    const newWorkers = rng.pick([workers * 2, Math.max(2, Math.round(workers / 2)), workers + rng.int(2, 6)]);
    const answer = totalWork / newWorkers;

    return {
      prompt:
        workers +
        ' workers can finish a job in ' +
        days +
        ' days. How many days will ' +
        newWorkers +
        ' workers take, working at the same rate?',
      promptBn:
        bn(workers) +
        ' জন শ্রমিক একটি কাজ ' +
        bn(days) +
        ' দিনে শেষ করতে পারে। একই হারে কাজ করলে ' +
        bn(newWorkers) +
        ' জন শ্রমিকের কত দিন লাগবে?',
      correctAnswer: formatNumber(answer, 2),
      choices: numericDistractors(answer, rng, 3, { min: 0, decimals: 2 }),
      params: { workers, days, newWorkers },
      solutionSteps: [
        step('Total work = workers × days = ' + workers + ' × ' + days + ' = ' + totalWork + ' worker-days'),
        step('Days = total work ÷ workers = ' + totalWork + ' ÷ ' + newWorkers + ' = ' + formatNumber(answer, 2)),
      ],
      explanation: 'More workers means fewer days: the product workers × days stays constant.',
      explanationBn: 'শ্রমিক বাড়লে দিন কমে; শ্রমিক × দিন গুণফল স্থির থাকে।',
      hints: ['Keep workers × days constant.'],
      hintsBn: ['শ্রমিক × দিন গুণফল অপরিবর্তিত রাখুন।'],
    };
  },
);

const averageGen = defineGenerator(
  {
    id: 'ratio.average',
    name: 'Average',
    nameBn: 'গড়',
    topicId: 'average',
    skillIds: ['skill.average'],
    questionType: 'numeric',
    brainCategory: 'number_sense',
    tags: ['average'],
    examIds: ['exam.bcs-math', 'exam.ntrca-math'],
    minDifficulty: 2,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const count = rng.int(4, 4 + Math.min(4, difficulty));
    const values: number[] = [];
    for (let i = 0; i < count; i++) values.push(rng.int(10, 20 + difficulty * 15));
    const answer = mean(values);

    return {
      prompt: 'Find the average of: ' + values.join(', '),
      promptBn: 'গড় নির্ণয় করুন: ' + values.map((v) => bn(v)).join(', '),
      correctAnswer: formatNumber(answer, 2),
      choices: numericDistractors(answer, rng, 3, { min: 0, decimals: 2 }),
      params: { values: values.join('-') },
      solutionSteps: [
        step('Sum = ' + values.join(' + ') + ' = ' + values.reduce((a, b) => a + b, 0)),
        step('Average = sum ÷ count = ' + values.reduce((a, b) => a + b, 0) + ' ÷ ' + count + ' = ' + formatNumber(answer, 2)),
      ],
      explanation: 'The average shares the total equally among all the values.',
      explanationBn: 'গড় মোট রাশিকে সমানভাগে ভাগ করে দেয়।',
    };
  },
);

const averageMissing = defineGenerator(
  {
    id: 'ratio.average-missing',
    name: 'Missing Value from Average',
    nameBn: 'গড় থেকে অজানা মান',
    topicId: 'average',
    skillIds: ['skill.average'],
    questionType: 'numeric',
    tags: ['average', 'reverse'],
    examIds: ['exam.bcs-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const count = rng.int(4, 4 + Math.min(4, difficulty));
    const target = rng.int(20, 40 + difficulty * 10);
    const values: number[] = [];
    for (let i = 0; i < count - 1; i++) values.push(rng.int(10, target * 2));
    const total = target * count;
    const missing = total - values.reduce((a, b) => a + b, 0);
    // Keep the answer sensible for a school problem.
    const adjusted = missing > 0 ? missing : 1;
    const finalTotal = values.reduce((a, b) => a + b, 0) + adjusted;
    const finalAverage = finalTotal / count;

    return {
      prompt:
        'The average of ' +
        count +
        ' numbers is ' +
        formatNumber(finalAverage, 2) +
        '. ' +
        (count - 1) +
        ' of them are ' +
        values.join(', ') +
        '. Find the remaining number.',
      promptBn:
        bn(count) +
        ' টি সংখ্যার গড় ' +
        bn(formatNumber(finalAverage, 2)) +
        '। এর মধ্যে ' +
        bn(count - 1) +
        ' টি হলো ' +
        values.map((v) => bn(v)).join(', ') +
        '। বাকি সংখ্যাটি কত?',
      correctAnswer: String(adjusted),
      choices: numericDistractors(adjusted, rng, 3, { integer: true, min: 0 }),
      params: { count, values: values.join('-'), missing: adjusted },
      solutionSteps: [
        step('Total = average × count = ' + formatNumber(finalAverage, 2) + ' × ' + count + ' = ' + formatNumber(finalTotal, 2)),
        step('Sum of the known numbers = ' + values.reduce((a, b) => a + b, 0)),
        step('Missing number = ' + formatNumber(finalTotal, 2) + ' - ' + values.reduce((a, b) => a + b, 0) + ' = ' + adjusted),
      ],
      explanation: 'Reverse the average: multiply to recover the total, then subtract what you know.',
      explanationBn: 'গড় থেকে উল্টো হিসাব: গুণ করে মোট বের করুন, তারপর জানা অংশ বাদ দিন।',
    };
  },
);

const mixture = defineGenerator(
  {
    id: 'ratio.mixture',
    name: 'Mixture & Alligation',
    nameBn: 'মিশ্রণ',
    topicId: 'ratio-proportion',
    skillIds: ['skill.mixture'],
    questionType: 'mcq',
    tags: ['mixture', 'ratio'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 5,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const cheaper = rng.int(20, 40);
    const dearer = cheaper + rng.int(10, 20 + difficulty * 2);
    const mean1 = rng.int(cheaper + 2, dearer - 2);
    const result = mixtureAlligation(cheaper, dearer, mean1);
    const who = person(rng);

    return {
      prompt:
        who.en +
        ' mixes rice costing ৳' +
        cheaper +
        '/kg with rice costing ৳' +
        dearer +
        '/kg to sell at ৳' +
        mean1 +
        '/kg. In what ratio should they be mixed?',
      promptBn:
        who.bn +
        ' প্রতি কেজি ' +
        bn(cheaper) +
        ' টাকার চাল ও ' +
        bn(dearer) +
        ' টাকার চাল মিশিয়ে প্রতি কেজি ' +
        bn(mean1) +
        ' টাকায় বিক্রি করতে চায়। কোন অনুপাতে মিশাবে?',
      correctAnswer: result.ratio,
      choices: [
        dearer - mean1 + ' : ' + (mean1 - cheaper + 1),
        mean1 - cheaper + ' : ' + (dearer - mean1),
        cheaper + ' : ' + dearer,
      ],
      params: { cheaper, dearer, mean: mean1 },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'The alligation rule compares each price with the mean price.',
      explanationBn: 'মিশ্রণ বিধিতে প্রতিটি দামকে মধ্যদামের সাথে তুলনা করা হয়।',
      hints: ['cheaper : dearer = (dearer - mean) : (mean - cheaper)'],
      hintsBn: ['কম দাম : বেশি দাম = (বেশি - মধ্য) : (মধ্য - কম)'],
    };
  },
);

export const RATIO_GENERATORS: QuestionGenerator[] = [
  shareInRatio,
  simplifyRatioGen,
  proportion,
  inverseProportion,
  averageGen,
  averageMissing,
  mixture,
];
