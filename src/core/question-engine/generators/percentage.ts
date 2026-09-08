import {
  applyDiscount,
  applyVat,
  compoundInterest,
  percentChange,
  percentageOf,
  profitLoss,
  simpleInterest,
} from '../../math/arithmetic';
import { formatNumber } from '../../utils/format';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors, person, shopItem } from './helpers';

const percentOf = defineGenerator(
  {
    id: 'pct.of-quantity',
    name: 'Percent of a Quantity',
    nameBn: 'শতকরা নির্ণয়',
    topicId: 'percentage',
    skillIds: ['skill.percent-of'],
    questionType: 'numeric',
    brainCategory: 'money_math',
    tags: ['percentage'],
    examIds: ['exam.bcs-math', 'exam.bank-math', 'exam.ntrca-math'],
    minDifficulty: 2,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const percents = difficulty <= 3 ? [10, 20, 25, 50, 5] : [12, 15, 18, 35, 45, 62, 87];
    const percent = rng.pick(percents);
    const base = rng.int(2, 10 + difficulty * 8) * (difficulty <= 3 ? 100 : 20);
    const result = percentageOf(percent, base);

    return {
      prompt: 'What is ' + percent + '% of ' + base + '?',
      promptBn: bn(base) + ' এর ' + bn(percent) + '% কত?',
      correctAnswer: formatNumber(result.value),
      choices: numericDistractors(result.value, rng, 3, { min: 0 }),
      params: { percent, base },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'Percent means "per hundred", so divide by 100 and multiply by the amount.',
      explanationBn: 'শতকরা মানে প্রতি একশোতে; তাই ১০০ দিয়ে ভাগ করে রাশি দিয়ে গুণ করুন।',
      hints: ['10% is one tenth — build the rest from that.'],
      hintsBn: ['১০% মানে এক দশমাংশ — এর থেকেই বাকিটা বের করুন।'],
    };
  },
);

const discount = defineGenerator(
  {
    id: 'pct.discount',
    name: 'Shopping Discount',
    nameBn: 'ছাড়ের হিসাব',
    topicId: 'money-shopping',
    skillIds: ['skill.discount-vat', 'skill.percent-of'],
    questionType: 'word_problem',
    brainCategory: 'money_math',
    tags: ['percentage', 'real-life', 'shopping'],
    minDifficulty: 2,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const item = shopItem(rng);
    const who = person(rng);
    const price = rng.int(3, 12 + difficulty * 6) * 50;
    const percent = rng.pick([5, 10, 12, 15, 20, 25, 30, 40]);
    const result = applyDiscount(price, percent);

    return {
      prompt:
        who.en +
        ' buys ' +
        item.en +
        ' marked at ৳' +
        price +
        '. The shop gives a ' +
        percent +
        '% discount. How much does ' +
        who.en +
        ' pay?',
      promptBn:
        who.bn +
        ' ' +
        bn(price) +
        ' টাকা দামের ' +
        item.bn +
        ' কিনছে। দোকান ' +
        bn(percent) +
        '% ছাড় দিচ্ছে। তাকে কত টাকা দিতে হবে?',
      correctAnswer: formatNumber(result.value, 2),
      choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
      params: { price, percent },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'A ' + percent + '% discount means paying ' + (100 - percent) + '% of the marked price.',
      explanationBn: bn(percent) + '% ছাড় মানে চিহ্নিত দামের ' + bn(100 - percent) + '% পরিশোধ।',
      hints: ['You can also compute ' + (100 - percent) + '% of the price directly.'],
      hintsBn: ['সরাসরি দামের ' + bn(100 - percent) + '% বের করলেও হয়।'],
    };
  },
);

const vat = defineGenerator(
  {
    id: 'pct.vat',
    name: 'VAT on a Bill',
    nameBn: 'ভ্যাটের হিসাব',
    topicId: 'money-shopping',
    skillIds: ['skill.discount-vat'],
    questionType: 'word_problem',
    brainCategory: 'money_math',
    tags: ['percentage', 'vat', 'real-life'],
    minDifficulty: 2,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const bill = rng.int(4, 10 + difficulty * 5) * 100;
    const percent = rng.pick([5, 7.5, 10, 15]);
    const result = applyVat(bill, percent);

    return {
      prompt: 'A restaurant bill is ৳' + bill + ' before ' + percent + '% VAT. What is the total to pay?',
      promptBn: 'একটি রেস্টুরেন্টের বিল ভ্যাট ছাড়া ' + bn(bill) + ' টাকা। ' + bn(percent) + '% ভ্যাট যোগ করলে মোট কত?',
      correctAnswer: formatNumber(result.value, 2),
      choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
      params: { bill, percent },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'VAT is added on top, so the total is 100% + ' + percent + '% of the bill.',
      explanationBn: 'ভ্যাট বিলের সাথে যোগ হয়, তাই মোট = বিলের ১০০% + ' + bn(percent) + '%।',
    };
  },
);

const profitLossGen = defineGenerator(
  {
    id: 'pct.profit-loss',
    name: 'Profit & Loss',
    nameBn: 'লাভ ও ক্ষতি',
    topicId: 'financial-math',
    skillIds: ['skill.profit-loss'],
    questionType: 'numeric',
    brainCategory: 'money_math',
    tags: ['percentage', 'business'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 3,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const who = person(rng);
    const item = shopItem(rng);
    const cost = rng.int(2, 8 + difficulty * 4) * 50;
    const isProfit = rng.bool(0.6);
    const pct = rng.pick([5, 10, 12, 15, 20, 25]);
    const selling = Math.round(cost * (1 + (isProfit ? pct : -pct) / 100));
    const result = profitLoss(cost, selling);
    const answer = Math.abs(result.value);

    return {
      prompt:
        who.en +
        ' buys ' +
        item.en +
        ' for ৳' +
        cost +
        ' and sells it for ৳' +
        selling +
        '. Find the ' +
        (isProfit ? 'profit' : 'loss') +
        ' percent.',
      promptBn:
        who.bn +
        ' ' +
        bn(cost) +
        ' টাকায় ' +
        item.bn +
        ' কিনে ' +
        bn(selling) +
        ' টাকায় বিক্রি করল। ' +
        (isProfit ? 'লাভ' : 'ক্ষতি') +
        ' শতকরা কত?',
      correctAnswer: formatNumber(answer, 2),
      choices: numericDistractors(answer, rng, 3, { min: 0, decimals: 2 }),
      params: { cost, selling },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'Profit and loss percent are always calculated on the cost price.',
      explanationBn: 'লাভ বা ক্ষতির শতকরা সর্বদা ক্রয়মূল্যের উপর হিসাব হয়।',
      hints: ['Divide the profit by the COST price, not the selling price.'],
      hintsBn: ['লাভকে বিক্রয়মূল্য নয়, ক্রয়মূল্য দিয়ে ভাগ করুন।'],
    };
  },
);

const simpleInterestGen = defineGenerator(
  {
    id: 'pct.simple-interest',
    name: 'Simple Interest',
    nameBn: 'সরল সুদ',
    topicId: 'financial-math',
    skillIds: ['skill.interest'],
    questionType: 'numeric',
    brainCategory: 'money_math',
    tags: ['interest', 'business'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 3,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const principal = rng.int(2, 10 + difficulty * 4) * 1000;
    const rate = rng.pick([4, 5, 6, 7.5, 8, 10, 12]);
    const years = rng.int(2, 3 + difficulty);
    const result = simpleInterest(principal, rate, years);

    return {
      prompt:
        'Find the simple interest on ৳' +
        principal +
        ' at ' +
        rate +
        '% per year for ' +
        years +
        ' years.',
      promptBn:
        bn(principal) + ' টাকার উপর বার্ষিক ' + bn(rate) + '% হারে ' + bn(years) + ' বছরের সরল সুদ কত?',
      correctAnswer: formatNumber(result.value, 2),
      choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
      params: { principal, rate, years },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'Simple interest grows linearly: the principal never changes.',
      explanationBn: 'সরল সুদে আসল অপরিবর্তিত থাকে, তাই সুদ সমহারে বাড়ে।',
    };
  },
);

const compoundInterestGen = defineGenerator(
  {
    id: 'pct.compound-interest',
    name: 'Compound Interest',
    nameBn: 'চক্রবৃদ্ধি সুদ',
    topicId: 'financial-math',
    skillIds: ['skill.interest'],
    questionType: 'numeric',
    tags: ['interest', 'business'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const principal = rng.int(2, 6 + difficulty * 2) * 1000;
    const rate = rng.pick([5, 8, 10, 12]);
    const years = rng.int(2, difficulty <= 5 ? 2 : 3);
    const result = compoundInterest(principal, rate, years);
    const answer = Number(result.value.toFixed(2));

    return {
      prompt:
        'Find the compound interest on ৳' +
        principal +
        ' at ' +
        rate +
        '% per year, compounded yearly for ' +
        years +
        ' years.',
      promptBn:
        bn(principal) +
        ' টাকার উপর বার্ষিক ' +
        bn(rate) +
        '% চক্রবৃদ্ধি হারে ' +
        bn(years) +
        ' বছরের সুদ কত?',
      correctAnswer: formatNumber(answer, 2),
      choices: numericDistractors(answer, rng, 3, { min: 0, decimals: 2 }),
      tolerance: 0.5,
      params: { principal, rate, years },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'In compound interest, each year the interest itself earns interest.',
      explanationBn: 'চক্রবৃদ্ধি সুদে প্রতি বছরের সুদও পরবর্তী বছরে সুদ পায়।',
      hints: ['Find the total amount first, then subtract the principal.'],
      hintsBn: ['প্রথমে মোট টাকা বের করুন, তারপর আসল বিয়োগ করুন।'],
    };
  },
);

const percentChangeGen = defineGenerator(
  {
    id: 'pct.change',
    name: 'Percentage Change',
    nameBn: 'শতকরা পরিবর্তন',
    topicId: 'percentage',
    skillIds: ['skill.percent-change'],
    questionType: 'numeric',
    brainCategory: 'data_interpretation',
    tags: ['percentage', 'change'],
    minDifficulty: 3,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const from = rng.int(2, 10 + difficulty * 3) * 25;
    const direction = rng.bool() ? 1 : -1;
    const pct = rng.pick([4, 8, 10, 12, 16, 20, 25]);
    const to = Math.round(from * (1 + (direction * pct) / 100));
    const result = percentChange(from, to);
    const answer = Number(Math.abs(result.value).toFixed(2));

    return {
      prompt:
        'A price changed from ৳' + from + ' to ৳' + to + '. What is the percentage ' + (direction > 0 ? 'increase' : 'decrease') + '?',
      promptBn:
        'একটি দাম ' + bn(from) + ' টাকা থেকে ' + bn(to) + ' টাকা হয়েছে। শতকরা ' + (direction > 0 ? 'বৃদ্ধি' : 'হ্রাস') + ' কত?',
      correctAnswer: formatNumber(answer, 2),
      choices: numericDistractors(answer, rng, 3, { min: 0, decimals: 2 }),
      params: { from, to },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'Percentage change is always measured against the original value.',
      explanationBn: 'শতকরা পরিবর্তন সর্বদা পূর্বের মানের সাপেক্ষে হিসাব হয়।',
      hints: ['Divide the change by the ORIGINAL amount.'],
      hintsBn: ['পরিবর্তনকে আগের মান দিয়ে ভাগ করুন।'],
    };
  },
);

export const PERCENTAGE_GENERATORS: QuestionGenerator[] = [
  percentOf,
  discount,
  vat,
  profitLossGen,
  simpleInterestGen,
  compoundInterestGen,
  percentChangeGen,
];
