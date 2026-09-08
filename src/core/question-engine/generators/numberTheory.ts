import {
  digitSum,
  divisorCount,
  factorizationString,
  gcd,
  isPrime,
  lcm,
  primesUpTo,
  reverseDigits,
} from '../../math/numberTheory';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors } from './helpers';

const hcfLcm = defineGenerator(
  {
    id: 'nt.hcf-lcm',
    name: 'HCF & LCM',
    nameBn: 'গসাগু ও লসাগু',
    topicId: 'number-theory',
    skillIds: ['skill.hcf-lcm'],
    questionType: 'numeric',
    tags: ['number-theory'],
    examIds: ['exam.bcs-math', 'exam.ntrca-math', 'exam.ssc-math'],
    minDifficulty: 3,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const base = rng.int(2, 6 + difficulty);
    const a = base * rng.int(2, 6 + difficulty);
    const b = base * rng.int(2, 8 + difficulty);
    const wantHcf = rng.bool();
    const answer = wantHcf ? gcd(a, b) : lcm(a, b);

    return {
      prompt: 'Find the ' + (wantHcf ? 'HCF (GCD)' : 'LCM') + ' of ' + a + ' and ' + b + '.',
      promptBn: bn(a) + ' ও ' + bn(b) + ' এর ' + (wantHcf ? 'গসাগু' : 'লসাগু') + ' নির্ণয় করুন।',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 1 }),
      params: { a, b, wantHcf: wantHcf ? 1 : 0 },
      solutionSteps: [
        step(a + ' = ' + factorizationString(a)),
        step(b + ' = ' + factorizationString(b)),
        step(
          wantHcf
            ? 'HCF takes the lowest power of each common prime: ' + answer
            : 'LCM takes the highest power of every prime present: ' + answer,
        ),
        step('Check: HCF × LCM = ' + gcd(a, b) + ' × ' + lcm(a, b) + ' = ' + gcd(a, b) * lcm(a, b) + ' = ' + a + ' × ' + b),
      ],
      explanation: 'HCF uses the shared primes at their lowest powers; LCM uses all primes at their highest powers.',
      explanationBn: 'গসাগুতে সাধারণ মৌলিক উৎপাদকের সর্বনিম্ন ঘাত, লসাগুতে সব উৎপাদকের সর্বোচ্চ ঘাত নেওয়া হয়।',
      hints: ['Prime factorise both numbers first.'],
      hintsBn: ['প্রথমে দুটি সংখ্যাকে মৌলিক উৎপাদকে বিশ্লেষণ করুন।'],
    };
  },
);

const primeCheck = defineGenerator(
  {
    id: 'nt.prime',
    name: 'Prime or Not',
    nameBn: 'মৌলিক কি না',
    topicId: 'number-theory',
    skillIds: ['skill.primes'],
    questionType: 'true_false',
    brainCategory: 'number_sense',
    tags: ['number-theory', 'primes'],
    examIds: ['exam.bcs-math'],
    minDifficulty: 2,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const cap = 30 + difficulty * 25;
    const primes = primesUpTo(cap).filter((p) => p > 10);
    const usePrime = rng.bool();
    let value: number;
    if (usePrime) {
      value = rng.pick(primes);
    } else {
      // Composite with no small obvious factor makes it a real question.
      const p = rng.pick(primes.slice(0, Math.max(2, Math.floor(primes.length / 2))));
      const q = rng.pick([3, 5, 7, 11]);
      value = p * q;
    }
    const answer = isPrime(value) ? 'true' : 'false';

    return {
      prompt: 'True or false: ' + value + ' is a prime number.',
      promptBn: 'সত্য না মিথ্যা: ' + bn(value) + ' একটি মৌলিক সংখ্যা।',
      correctAnswer: answer,
      params: { value },
      solutionSteps: [
        step('Test divisibility by primes up to √' + value + ' ≈ ' + Math.floor(Math.sqrt(value)) + '.'),
        step(value + ' = ' + factorizationString(value)),
        step(isPrime(value) ? value + ' has no factor other than 1 and itself.' : value + ' is composite.'),
      ],
      explanation: 'You only need to test prime divisors up to the square root.',
      explanationBn: 'বর্গমূল পর্যন্ত মৌলিক সংখ্যা দিয়ে ভাগ পরীক্ষা করলেই যথেষ্ট।',
      hints: ['Check 2, 3, 5, 7, 11, 13 …'],
      hintsBn: ['২, ৩, ৫, ৭, ১১, ১৩ … দিয়ে পরীক্ষা করুন।'],
    };
  },
);

const divisibility = defineGenerator(
  {
    id: 'nt.divisibility',
    name: 'Divisibility Rules',
    nameBn: 'বিভাজ্যতার নিয়ম',
    topicId: 'number-theory',
    skillIds: ['skill.divisibility'],
    questionType: 'mcq',
    tags: ['number-theory', 'divisibility'],
    examIds: ['exam.bcs-math', 'exam.ntrca-math'],
    minDifficulty: 3,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const divisors = [3, 4, 6, 8, 9, 11];
    const divisor = divisors[rng.int(0, Math.min(divisors.length - 1, 1 + Math.floor(difficulty / 2)))];
    const multiplier = rng.int(20, 40 + difficulty * 30);
    const target = divisor * multiplier;
    const wrong = [target + 1, target + divisor - 1, target - 1].filter((v) => v % divisor !== 0);

    const rules: Record<number, { en: string; bn: string }> = {
      3: { en: 'the digit sum is divisible by 3', bn: 'অঙ্কের যোগফল ৩ দ্বারা বিভাজ্য' },
      4: { en: 'the last two digits form a number divisible by 4', bn: 'শেষ দুই অঙ্ক ৪ দ্বারা বিভাজ্য' },
      6: { en: 'it is divisible by both 2 and 3', bn: 'এটি ২ ও ৩ উভয় দ্বারা বিভাজ্য' },
      8: { en: 'the last three digits form a number divisible by 8', bn: 'শেষ তিন অঙ্ক ৮ দ্বারা বিভাজ্য' },
      9: { en: 'the digit sum is divisible by 9', bn: 'অঙ্কের যোগফল ৯ দ্বারা বিভাজ্য' },
      11: { en: 'the alternating digit sum is divisible by 11', bn: 'একান্তর অঙ্কের যোগফলের অন্তর ১১ দ্বারা বিভাজ্য' },
    };

    return {
      prompt: 'Which of these numbers is divisible by ' + divisor + '?',
      promptBn: 'নিচের কোন সংখ্যাটি ' + bn(divisor) + ' দ্বারা বিভাজ্য?',
      correctAnswer: String(target),
      choices: wrong.slice(0, 3).map(String),
      params: { divisor, target },
      solutionSteps: [
        step('Rule: a number is divisible by ' + divisor + ' when ' + rules[divisor].en + '.'),
        step('For ' + target + ': digit sum = ' + digitSum(target) + ', last two digits = ' + (target % 100)),
        step(target + ' ÷ ' + divisor + ' = ' + target / divisor + ' exactly.'),
      ],
      explanation: 'Divisibility rules test a number without doing the full division.',
      explanationBn: 'বিভাজ্যতার নিয়মে পুরো ভাগ না করেই পরীক্ষা করা যায়।',
      hints: [rules[divisor].en],
      hintsBn: [rules[divisor].bn],
    };
  },
);

const digitProblem = defineGenerator(
  {
    id: 'nt.digits',
    name: 'Digit Problem',
    nameBn: 'অঙ্কের সমস্যা',
    topicId: 'number-theory',
    skillIds: ['skill.digits'],
    questionType: 'numeric',
    brainCategory: 'number_sense',
    tags: ['number-theory', 'digits'],
    examIds: ['exam.bcs-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng }) => {
    const tens = rng.int(1, 9);
    const units = rng.int(0, 9);
    const value = tens * 10 + units;
    const reversed = reverseDigits(value);
    const mode = rng.int(0, 1);
    const answer = mode === 0 ? digitSum(value) : Math.abs(value - reversed);

    return {
      prompt:
        mode === 0
          ? 'What is the sum of the digits of ' + value + '?'
          : 'A two-digit number is ' + value + '. Find the positive difference between the number and the number formed by reversing its digits.',
      promptBn:
        mode === 0
          ? bn(value) + ' এর অঙ্কগুলোর সমষ্টি কত?'
          : 'একটি দুই অঙ্কের সংখ্যা ' + bn(value) + '। সংখ্যাটি ও অঙ্ক বিপরীত করে পাওয়া সংখ্যার ধনাত্মক অন্তর কত?',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
      params: { value, mode },
      solutionSteps:
        mode === 0
          ? [step('Add each digit: ' + tens + ' + ' + units + ' = ' + answer)]
          : [
              step('Reversed number = ' + reversed),
              step('Difference = |' + value + ' - ' + reversed + '| = ' + answer),
              step('Note: the difference is always 9 × |tens digit - units digit| = 9 × ' + Math.abs(tens - units)),
            ],
      explanation:
        mode === 0
          ? 'The digit sum is used by the divisibility rules for 3 and 9.'
          : 'For a two-digit number, reversing changes the value by 9 times the digit difference.',
      explanationBn:
        mode === 0
          ? 'অঙ্কের যোগফল ৩ ও ৯ এর বিভাজ্যতার নিয়মে ব্যবহৃত হয়।'
          : 'দুই অঙ্কের সংখ্যায় অঙ্ক বিপরীত করলে মান ৯ × অঙ্কের অন্তর পরিমাণ বদলায়।',
    };
  },
);

const divisorCounting = defineGenerator(
  {
    id: 'nt.divisor-count',
    name: 'Number of Divisors',
    nameBn: 'উৎপাদকের সংখ্যা',
    topicId: 'number-theory',
    skillIds: ['skill.primes'],
    questionType: 'numeric',
    tags: ['number-theory'],
    examIds: ['exam.bcs-math', 'exam.olympiad-math'],
    minDifficulty: 5,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const smallPrimes = [2, 3, 5, 7];
    let value = 1;
    const used: number[] = [];
    const count = difficulty <= 6 ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const p = rng.pick(smallPrimes.filter((x) => !used.includes(x)));
      used.push(p);
      value *= Math.pow(p, rng.int(1, 3));
    }
    const answer = divisorCount(value);

    return {
      prompt: 'How many positive divisors does ' + value + ' have?',
      promptBn: bn(value) + ' এর ধনাত্মক উৎপাদক কতটি?',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 1 }),
      params: { value },
      solutionSteps: [
        step(value + ' = ' + factorizationString(value)),
        step('Add 1 to each exponent and multiply.'),
        step('Number of divisors = ' + answer),
      ],
      explanation: 'Each divisor picks an exponent from 0 up to the maximum for every prime.',
      explanationBn: 'প্রতিটি উৎপাদক প্রতিটি মৌলিক সংখ্যার জন্য ০ থেকে সর্বোচ্চ ঘাত বেছে নেয়।',
      hints: ['If n = p^a · q^b then it has (a+1)(b+1) divisors.'],
      hintsBn: ['n = p^a · q^b হলে উৎপাদক সংখ্যা (a+১)(b+১)।'],
    };
  },
);

const modular = defineGenerator(
  {
    id: 'nt.modular',
    name: 'Modular Arithmetic',
    nameBn: 'মডুলার গণিত',
    topicId: 'advanced-number-theory',
    skillIds: ['skill.modular'],
    questionType: 'numeric',
    tags: ['number-theory', 'modular'],
    examIds: ['exam.olympiad-math'],
    minDifficulty: 6,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const base = rng.int(2, 9);
    const exponent = rng.int(5, 10 + difficulty * 4);
    const modulus = rng.pick([5, 7, 9, 11, 13]);
    let answer = 1;
    for (let i = 0; i < exponent; i++) answer = (answer * base) % modulus;

    // Find the cycle length to explain the shortcut.
    let cycle = 1;
    let value = base % modulus;
    while (value !== 1 && cycle < modulus) {
      value = (value * base) % modulus;
      cycle++;
    }

    return {
      prompt: 'Find the remainder when ' + base + '^' + exponent + ' is divided by ' + modulus + '.',
      promptBn: bn(base) + '^' + bn(exponent) + ' কে ' + bn(modulus) + ' দ্বারা ভাগ করলে ভাগশেষ কত?',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
      params: { base, exponent, modulus },
      solutionSteps: [
        step('Work with remainders instead of the huge power.'),
        step(base + '^k mod ' + modulus + ' repeats with a cycle of length ' + cycle + '.'),
        step(exponent + ' mod ' + cycle + ' = ' + (exponent % cycle)),
        step('So the remainder is ' + answer + '.'),
      ],
      explanation: 'Powers modulo n cycle, so only the exponent modulo the cycle length matters.',
      explanationBn: 'মডুলো n এ ঘাতগুলো চক্রাকারে ফিরে আসে, তাই চক্রের দৈর্ঘ্য দিয়ে ঘাতের ভাগশেষই গুরুত্বপূর্ণ।',
      hints: ['Compute the first few powers and look for the repeat.'],
      hintsBn: ['প্রথম কয়েকটি ঘাত বের করে পুনরাবৃত্তি খুঁজুন।'],
    };
  },
);

export const NUMBER_THEORY_GENERATORS: QuestionGenerator[] = [
  hcfLcm,
  primeCheck,
  divisibility,
  digitProblem,
  divisorCounting,
  modular,
];
