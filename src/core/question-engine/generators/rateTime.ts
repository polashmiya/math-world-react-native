import { averageSpeed, timeToWorkTogether } from '../../math/arithmetic';
import { formatNumber } from '../../utils/format';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors, person, place, twoPeople } from './helpers';

const speedDistance = defineGenerator(
  {
    id: 'rate.speed-distance',
    name: 'Speed, Time & Distance',
    nameBn: 'গতি, সময় ও দূরত্ব',
    topicId: 'time-speed-distance',
    skillIds: ['skill.speed-distance'],
    questionType: 'word_problem',
    brainCategory: 'speed',
    tags: ['speed', 'real-life'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 2,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const from = place(rng);
    const to = place(rng);
    const speed = rng.int(30, 40 + difficulty * 10);
    const hours = rng.int(2, 3 + difficulty);
    const distance = speed * hours;
    const ask = rng.int(0, 2);

    if (ask === 0) {
      return {
        prompt:
          'A bus travels from ' +
          from.en +
          ' towards ' +
          to.en +
          ' at ' +
          speed +
          ' km/h for ' +
          hours +
          ' hours. How far does it travel?',
        promptBn:
          from.bn + ' থেকে ' + to.bn + ' এর দিকে একটি বাস ঘণ্টায় ' + bn(speed) + ' কিমি বেগে ' + bn(hours) + ' ঘণ্টা চলল। কত দূর গেল?',
        correctAnswer: String(distance),
        choices: numericDistractors(distance, rng, 3, { integer: true, min: 0 }),
        params: { speed, hours, ask },
        solutionSteps: [
          step('distance = speed × time'),
          step('distance = ' + speed + ' × ' + hours + ' = ' + distance + ' km'),
        ],
        explanation: 'Distance is the product of speed and time when the speed is constant.',
        explanationBn: 'গতি স্থির থাকলে দূরত্ব = গতি × সময়।',
      };
    }
    if (ask === 1) {
      const result = averageSpeed(distance, hours);
      return {
        prompt: 'A car covers ' + distance + ' km in ' + hours + ' hours. Find its average speed in km/h.',
        promptBn: 'একটি গাড়ি ' + bn(hours) + ' ঘণ্টায় ' + bn(distance) + ' কিমি গেল। এর গড় গতি ঘণ্টায় কত কিমি?',
        correctAnswer: formatNumber(result.value, 2),
        choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
        params: { distance, hours, ask },
        solutionSteps: result.steps.map((s) => step(s)),
        explanation: 'Average speed is total distance divided by total time.',
        explanationBn: 'গড় গতি = মোট দূরত্ব ÷ মোট সময়।',
      };
    }
    return {
      prompt: 'How long does a train take to cover ' + distance + ' km at ' + speed + ' km/h?',
      promptBn: 'ঘণ্টায় ' + bn(speed) + ' কিমি বেগে ' + bn(distance) + ' কিমি যেতে একটি ট্রেনের কত সময় লাগবে?',
      correctAnswer: String(hours),
      choices: numericDistractors(hours, rng, 3, { integer: true, min: 0 }),
      params: { distance, speed, ask },
      solutionSteps: [
        step('time = distance ÷ speed'),
        step('time = ' + distance + ' ÷ ' + speed + ' = ' + hours + ' hours'),
      ],
      explanation: 'Rearrange distance = speed × time to get time = distance ÷ speed.',
      explanationBn: 'দূরত্ব = গতি × সময় থেকে সময় = দূরত্ব ÷ গতি।',
    };
  },
);

const relativeSpeed = defineGenerator(
  {
    id: 'rate.relative-speed',
    name: 'Relative Speed',
    nameBn: 'আপেক্ষিক গতি',
    topicId: 'time-speed-distance',
    skillIds: ['skill.speed-distance'],
    questionType: 'word_problem',
    tags: ['speed', 'relative'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 5,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const speedA = rng.int(40, 60 + difficulty * 5);
    const speedB = rng.int(20, speedA - 10);
    const opposite = rng.bool();
    const gap = rng.int(10, 20 + difficulty * 10) * 10;
    const relative = opposite ? speedA + speedB : speedA - speedB;
    const answer = gap / relative;

    return {
      prompt:
        'Two vehicles start ' +
        gap +
        ' km apart, moving ' +
        (opposite ? 'towards each other' : 'in the same direction') +
        ' at ' +
        speedA +
        ' km/h and ' +
        speedB +
        ' km/h. After how many hours do they meet?',
      promptBn:
        'দুটি যান ' +
        bn(gap) +
        ' কিমি দূরত্বে থেকে ঘণ্টায় ' +
        bn(speedA) +
        ' কিমি ও ' +
        bn(speedB) +
        ' কিমি বেগে ' +
        (opposite ? 'পরস্পরের দিকে' : 'একই দিকে') +
        ' চলছে। কত ঘণ্টা পরে তারা মিলবে?',
      correctAnswer: formatNumber(answer, 2),
      choices: numericDistractors(answer, rng, 3, { min: 0, decimals: 2 }),
      params: { speedA, speedB, gap, opposite: opposite ? 1 : 0 },
      solutionSteps: [
        step(
          opposite
            ? 'Moving towards each other, add the speeds: ' + speedA + ' + ' + speedB + ' = ' + relative + ' km/h'
            : 'Moving the same way, subtract the speeds: ' + speedA + ' - ' + speedB + ' = ' + relative + ' km/h',
        ),
        step('time = gap ÷ relative speed = ' + gap + ' ÷ ' + relative + ' = ' + formatNumber(answer, 2) + ' hours'),
      ],
      explanation: 'Relative speed adds when the motion is opposite and subtracts when it is the same way.',
      explanationBn: 'বিপরীত দিকে চললে গতি যোগ হয়, একই দিকে চললে বিয়োগ হয়।',
      hints: [opposite ? 'Add the two speeds.' : 'Subtract the two speeds.'],
      hintsBn: [opposite ? 'দুটি গতি যোগ করুন।' : 'দুটি গতি বিয়োগ করুন।'],
    };
  },
);

const trainCrossing = defineGenerator(
  {
    id: 'rate.train-crossing',
    name: 'Train Crossing a Platform',
    nameBn: 'ট্রেন ও প্ল্যাটফর্ম',
    topicId: 'time-speed-distance',
    skillIds: ['skill.speed-distance'],
    questionType: 'word_problem',
    tags: ['speed', 'trains'],
    examIds: ['exam.bcs-math', 'exam.bank-math'],
    minDifficulty: 6,
    maxDifficulty: 9,
  },
  ({ rng }) => {
    const trainLength = rng.int(10, 30) * 10;
    const platformLength = rng.int(10, 40) * 10;
    const speedKmh = rng.int(36, 90);
    const speedMs = (speedKmh * 1000) / 3600;
    const total = trainLength + platformLength;
    const answer = total / speedMs;

    return {
      prompt:
        'A ' +
        trainLength +
        ' m long train running at ' +
        speedKmh +
        ' km/h crosses a platform ' +
        platformLength +
        ' m long. How many seconds does it take?',
      promptBn:
        bn(trainLength) +
        ' মিটার লম্বা একটি ট্রেন ঘণ্টায় ' +
        bn(speedKmh) +
        ' কিমি বেগে চলে ' +
        bn(platformLength) +
        ' মিটার লম্বা প্ল্যাটফর্ম অতিক্রম করে। কত সেকেন্ড লাগবে?',
      correctAnswer: formatNumber(answer, 2),
      choices: numericDistractors(answer, rng, 3, { min: 0, decimals: 2 }),
      tolerance: 0.2,
      params: { trainLength, platformLength, speedKmh },
      solutionSteps: [
        step('Distance to cover = train + platform = ' + trainLength + ' + ' + platformLength + ' = ' + total + ' m'),
        step('Speed = ' + speedKmh + ' km/h = ' + speedKmh + ' × 5/18 = ' + formatNumber(speedMs, 4) + ' m/s'),
        step('time = ' + total + ' ÷ ' + formatNumber(speedMs, 4) + ' = ' + formatNumber(answer, 2) + ' s'),
      ],
      explanation: 'The train must clear its own length plus the platform length.',
      explanationBn: 'ট্রেনকে নিজের দৈর্ঘ্য ও প্ল্যাটফর্মের দৈর্ঘ্য দুটোই অতিক্রম করতে হয়।',
      hints: ['Convert km/h to m/s by multiplying by 5/18.'],
      hintsBn: ['কিমি/ঘণ্টা কে ৫/১৮ দিয়ে গুণ করে মি/সে করুন।'],
    };
  },
);

const workTogether = defineGenerator(
  {
    id: 'rate.work-together',
    name: 'Time & Work',
    nameBn: 'সময় ও কাজ',
    topicId: 'work-time',
    skillIds: ['skill.work-rate'],
    questionType: 'word_problem',
    tags: ['work', 'rate'],
    examIds: ['exam.bcs-math', 'exam.bank-math', 'exam.ntrca-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const [first, second] = twoPeople(rng);
    const hoursA = rng.int(4, 8 + difficulty * 2);
    const hoursB = rng.int(4, 8 + difficulty * 2);
    const result = timeToWorkTogether(hoursA, hoursB);

    return {
      prompt:
        first.en +
        ' can finish a job in ' +
        hoursA +
        ' days and ' +
        second.en +
        ' in ' +
        hoursB +
        ' days. Working together, how many days will they take?',
      promptBn:
        first.bn +
        ' একটি কাজ ' +
        bn(hoursA) +
        ' দিনে এবং ' +
        second.bn +
        ' ' +
        bn(hoursB) +
        ' দিনে করতে পারে। একসাথে কাজ করলে কত দিন লাগবে?',
      correctAnswer: formatNumber(result.value, 2),
      choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
      tolerance: 0.05,
      params: { hoursA, hoursB },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'Add the work rates, never the times.',
      explanationBn: 'সময় নয়, কাজের হার যোগ করতে হয়।',
      hints: ['Think in "fraction of the job per day".'],
      hintsBn: ['প্রতিদিন কাজের কত অংশ হয় সেভাবে ভাবুন।'],
    };
  },
);

const agesProblem = defineGenerator(
  {
    id: 'rate.age',
    name: 'Age Problem',
    nameBn: 'বয়সের সমস্যা',
    topicId: 'linear-equations',
    skillIds: ['skill.age-problems', 'skill.word-equation'],
    questionType: 'word_problem',
    tags: ['age', 'equations'],
    examIds: ['exam.bcs-math', 'exam.ntrca-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const [parent, child] = twoPeople(rng);
    const multiple = rng.int(2, 3 + Math.min(3, Math.floor(difficulty / 2)));
    const years = rng.int(4, 6 + difficulty);
    // Now: parent = multiple × child. After `years`: parent + years = k(child + years).
    const childAge = rng.int(6, 8 + difficulty * 2);
    const parentAge = multiple * childAge;
    const futureRatio = (parentAge + years) / (childAge + years);

    return {
      prompt:
        parent.en +
        ' is ' +
        multiple +
        ' times as old as ' +
        child.en +
        '. ' +
        child.en +
        ' is ' +
        childAge +
        ' years old. What will be the ratio of their ages after ' +
        years +
        ' years?',
      promptBn:
        parent.bn +
        ' এর বয়স ' +
        child.bn +
        ' এর বয়সের ' +
        bn(multiple) +
        ' গুণ। ' +
        child.bn +
        ' এর বয়স ' +
        bn(childAge) +
        ' বছর। ' +
        bn(years) +
        ' বছর পরে তাদের বয়সের অনুপাত কত হবে?',
      correctAnswer: (parentAge + years) + ' : ' + (childAge + years),
      choices: [
        parentAge + ' : ' + childAge,
        (parentAge + years) + ' : ' + childAge,
        parentAge + ' : ' + (childAge + years),
      ],
      params: { childAge, multiple, years },
      solutionSteps: [
        step(child.en + ' now = ' + childAge + ', ' + parent.en + ' now = ' + multiple + ' × ' + childAge + ' = ' + parentAge),
        step('After ' + years + ' years: ' + (parentAge + years) + ' and ' + (childAge + years)),
        step('Ratio = ' + (parentAge + years) + ' : ' + (childAge + years) + ' ≈ ' + formatNumber(futureRatio, 3)),
      ],
      explanation: 'Everyone ages by the same number of years, so add the same amount to both ages.',
      explanationBn: 'সবার বয়স সমানভাবে বাড়ে, তাই উভয় বয়সে একই সংখ্যা যোগ করুন।',
    };
  },
);

const pipesAndCisterns = defineGenerator(
  {
    id: 'rate.pipes',
    name: 'Pipes & Cisterns',
    nameBn: 'নল ও চৌবাচ্চা',
    topicId: 'work-time',
    skillIds: ['skill.work-rate'],
    questionType: 'word_problem',
    tags: ['work', 'rate'],
    examIds: ['exam.bcs-math'],
    minDifficulty: 6,
    maxDifficulty: 9,
  },
  ({ rng, difficulty }) => {
    const fill = rng.int(4, 6 + difficulty);
    const empty = fill + rng.int(2, 6 + difficulty);
    const net = 1 / fill - 1 / empty;
    const answer = 1 / net;
    const who = person(rng);

    return {
      prompt:
        'A tap fills a tank in ' +
        fill +
        ' hours while a leak empties it in ' +
        empty +
        ' hours. With both open, how long does ' +
        who.en +
        ' need to fill the tank?',
      promptBn:
        'একটি নল ' +
        bn(fill) +
        ' ঘণ্টায় একটি চৌবাচ্চা পূর্ণ করে, আর একটি ছিদ্র ' +
        bn(empty) +
        ' ঘণ্টায় খালি করে। দুটোই খোলা থাকলে চৌবাচ্চাটি পূর্ণ হতে কত সময় লাগবে?',
      correctAnswer: formatNumber(answer, 2),
      choices: numericDistractors(answer, rng, 3, { min: 0, decimals: 2 }),
      tolerance: 0.05,
      params: { fill, empty },
      solutionSteps: [
        step('Filling rate = 1/' + fill + ' tank per hour'),
        step('Emptying rate = 1/' + empty + ' tank per hour'),
        step('Net rate = 1/' + fill + ' - 1/' + empty + ' = ' + formatNumber(net, 6)),
        step('Time = 1 ÷ net rate = ' + formatNumber(answer, 2) + ' hours'),
      ],
      explanation: 'A leak works against the tap, so subtract its rate.',
      explanationBn: 'ছিদ্র নলের বিপরীতে কাজ করে, তাই তার হার বিয়োগ হয়।',
    };
  },
);

export const RATE_TIME_GENERATORS: QuestionGenerator[] = [
  speedDistance,
  relativeSpeed,
  trainCrossing,
  workTogether,
  agesProblem,
  pipesAndCisterns,
];
