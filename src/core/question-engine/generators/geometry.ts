import {
  circleArea,
  circleCircumference,
  coneVolume,
  cuboidVolume,
  cylinderVolume,
  distance,
  interiorAngleSum,
  midpoint,
  pythagorasHypotenuse,
  pythagorasLeg,
  rectangleArea,
  rectanglePerimeter,
  sphereVolume,
  trapeziumArea,
  triangleArea,
  triangleAreaHeron,
} from '../../math/geometry';
import { formatNumber } from '../../utils/format';
import { defineGenerator, step, type QuestionGenerator } from '../types';
import { bn, numericDistractors } from './helpers';

const areaPerimeter = defineGenerator(
  {
    id: 'geo.area-perimeter',
    name: 'Area & Perimeter',
    nameBn: 'ক্ষেত্রফল ও পরিসীমা',
    topicId: 'mensuration',
    skillIds: ['skill.area-perimeter'],
    questionType: 'numeric',
    tags: ['geometry', 'mensuration'],
    examIds: ['exam.ssc-math', 'exam.bcs-math', 'exam.ntrca-math'],
    minDifficulty: 2,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const shapes = ['rectangle', 'triangle', 'circle', 'trapezium'] as const;
    const shape = shapes[rng.int(0, Math.min(shapes.length - 1, Math.floor(difficulty / 2)))];
    const askArea = rng.bool(0.7);

    if (shape === 'rectangle') {
      const l = rng.int(4, 10 + difficulty * 3);
      const w = rng.int(2, l - 1);
      const result = askArea ? rectangleArea(l, w) : rectanglePerimeter(l, w);
      return {
        prompt:
          'A rectangle is ' + l + ' cm long and ' + w + ' cm wide. Find its ' + (askArea ? 'area in cm²' : 'perimeter in cm') + '.',
        promptBn:
          'একটি আয়তক্ষেত্রের দৈর্ঘ্য ' + bn(l) + ' সেমি ও প্রস্থ ' + bn(w) + ' সেমি। এর ' + (askArea ? 'ক্ষেত্রফল (বর্গ সেমি)' : 'পরিসীমা (সেমি)') + ' কত?',
        correctAnswer: formatNumber(result.value),
        choices: numericDistractors(result.value, rng, 3, { min: 0 }),
        params: { shape, l, w, askArea: askArea ? 1 : 0 },
        solutionSteps: result.steps.map((s) => step(s)),
        explanation: askArea
          ? 'Area of a rectangle multiplies the two side lengths.'
          : 'Perimeter adds all four sides: 2 lengths + 2 widths.',
        explanationBn: askArea
          ? 'আয়তক্ষেত্রের ক্ষেত্রফল = দৈর্ঘ্য × প্রস্থ।'
          : 'পরিসীমা = ২(দৈর্ঘ্য + প্রস্থ)।',
      };
    }
    if (shape === 'triangle') {
      const base = rng.int(4, 12 + difficulty * 2);
      const height = rng.int(3, 10 + difficulty * 2);
      const result = triangleArea(base, height);
      return {
        prompt: 'A triangle has base ' + base + ' cm and height ' + height + ' cm. Find its area in cm².',
        promptBn: 'একটি ত্রিভুজের ভূমি ' + bn(base) + ' সেমি ও উচ্চতা ' + bn(height) + ' সেমি। ক্ষেত্রফল কত বর্গ সেমি?',
        correctAnswer: formatNumber(result.value),
        choices: numericDistractors(result.value, rng, 3, { min: 0 }),
        params: { shape, base, height },
        solutionSteps: result.steps.map((s) => step(s)),
        explanation: 'A triangle is exactly half of the rectangle around it.',
        explanationBn: 'ত্রিভুজ তার পরিবেষ্টিত আয়তক্ষেত্রের ঠিক অর্ধেক।',
        hints: ['Do not forget the ½.'],
        hintsBn: ['½ ভুলবেন না।'],
      };
    }
    if (shape === 'circle') {
      const r = rng.int(3, 8 + difficulty * 2);
      const result = askArea ? circleArea(r) : circleCircumference(r);
      return {
        prompt:
          'A circle has radius ' + r + ' cm. Find its ' + (askArea ? 'area in cm²' : 'circumference in cm') + ' (use π ≈ 3.1416).',
        promptBn:
          'একটি বৃত্তের ব্যাসার্ধ ' + bn(r) + ' সেমি। এর ' + (askArea ? 'ক্ষেত্রফল' : 'পরিধি') + ' কত? (π ≈ ৩.১৪১৬)',
        correctAnswer: formatNumber(result.value, 2),
        choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
        tolerance: 0.5,
        params: { shape, r, askArea: askArea ? 1 : 0 },
        solutionSteps: result.steps.map((s) => step(s)),
        explanation: askArea ? 'Area uses r², circumference uses r.' : 'Circumference is proportional to the radius.',
        explanationBn: askArea ? 'ক্ষেত্রফলে r², পরিধিতে r ব্যবহৃত হয়।' : 'পরিধি ব্যাসার্ধের সমানুপাতিক।',
      };
    }
    const a = rng.int(5, 12 + difficulty * 2);
    const b = rng.int(2, a - 1);
    const h = rng.int(3, 9 + difficulty);
    const result = trapeziumArea(a, b, h);
    return {
      prompt:
        'A trapezium has parallel sides ' + a + ' cm and ' + b + ' cm, and height ' + h + ' cm. Find its area in cm².',
      promptBn:
        'একটি ট্রাপিজিয়ামের সমান্তরাল বাহু ' + bn(a) + ' সেমি ও ' + bn(b) + ' সেমি, উচ্চতা ' + bn(h) + ' সেমি। ক্ষেত্রফল কত?',
      correctAnswer: formatNumber(result.value),
      choices: numericDistractors(result.value, rng, 3, { min: 0 }),
      params: { shape, a, b, h },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'A trapezium area averages the parallel sides, then multiplies by height.',
      explanationBn: 'ট্রাপিজিয়ামের ক্ষেত্রফলে সমান্তরাল বাহুর গড় নিয়ে উচ্চতা দিয়ে গুণ হয়।',
    };
  },
);

const volumeSurface = defineGenerator(
  {
    id: 'geo.volume',
    name: 'Volume of Solids',
    nameBn: 'ঘনবস্তুর আয়তন',
    topicId: 'mensuration',
    skillIds: ['skill.volume-surface'],
    questionType: 'numeric',
    tags: ['mensuration', '3d'],
    examIds: ['exam.ssc-math', 'exam.hsc-math'],
    minDifficulty: 3,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const solids = ['cuboid', 'cylinder', 'sphere', 'cone'] as const;
    const solid = solids[rng.int(0, Math.min(solids.length - 1, Math.floor(difficulty / 2)))];

    if (solid === 'cuboid') {
      const l = rng.int(3, 8 + difficulty);
      const w = rng.int(2, 7 + difficulty);
      const h = rng.int(2, 6 + difficulty);
      const result = cuboidVolume(l, w, h);
      return {
        prompt: 'Find the volume of a box measuring ' + l + ' × ' + w + ' × ' + h + ' cm.',
        promptBn: bn(l) + ' × ' + bn(w) + ' × ' + bn(h) + ' সেমি একটি বাক্সের আয়তন কত ঘন সেমি?',
        correctAnswer: formatNumber(result.value),
        choices: numericDistractors(result.value, rng, 3, { min: 0 }),
        params: { solid, l, w, h },
        solutionSteps: result.steps.map((s) => step(s)),
        explanation: 'Volume of a cuboid multiplies its three dimensions.',
        explanationBn: 'আয়তঘনের আয়তন = দৈর্ঘ্য × প্রস্থ × উচ্চতা।',
      };
    }
    if (solid === 'cylinder') {
      const r = rng.int(2, 6 + difficulty);
      const h = rng.int(4, 10 + difficulty);
      const result = cylinderVolume(r, h);
      return {
        prompt: 'A cylinder has radius ' + r + ' cm and height ' + h + ' cm. Find its volume in cm³ (π ≈ 3.1416).',
        promptBn: 'একটি সিলিন্ডারের ব্যাসার্ধ ' + bn(r) + ' সেমি ও উচ্চতা ' + bn(h) + ' সেমি। আয়তন কত ঘন সেমি?',
        correctAnswer: formatNumber(result.value, 2),
        choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
        tolerance: 1,
        params: { solid, r, h },
        solutionSteps: result.steps.map((s) => step(s)),
        explanation: 'A cylinder is a circle swept through its height.',
        explanationBn: 'সিলিন্ডার হলো বৃত্তকে উচ্চতা বরাবর টেনে নেওয়া আকৃতি।',
      };
    }
    if (solid === 'sphere') {
      const r = rng.int(2, 5 + difficulty);
      const result = sphereVolume(r);
      return {
        prompt: 'Find the volume of a sphere of radius ' + r + ' cm (π ≈ 3.1416).',
        promptBn: bn(r) + ' সেমি ব্যাসার্ধের একটি গোলকের আয়তন কত ঘন সেমি?',
        correctAnswer: formatNumber(result.value, 2),
        choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
        tolerance: 1,
        params: { solid, r },
        solutionSteps: result.steps.map((s) => step(s)),
        explanation: 'The 4/3 factor is what separates a sphere from a cylinder of the same radius.',
        explanationBn: '৪/৩ গুণকই গোলককে একই ব্যাসার্ধের সিলিন্ডার থেকে আলাদা করে।',
      };
    }
    const r = rng.int(2, 6 + difficulty);
    const h = rng.int(3, 9 + difficulty);
    const result = coneVolume(r, h);
    return {
      prompt: 'A cone has radius ' + r + ' cm and height ' + h + ' cm. Find its volume in cm³.',
      promptBn: 'একটি শঙ্কুর ব্যাসার্ধ ' + bn(r) + ' সেমি ও উচ্চতা ' + bn(h) + ' সেমি। আয়তন কত ঘন সেমি?',
      correctAnswer: formatNumber(result.value, 2),
      choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
      tolerance: 1,
      params: { solid, r, h },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'A cone holds exactly one third of the cylinder with the same base and height.',
      explanationBn: 'একই ভূমি ও উচ্চতার সিলিন্ডারের ঠিক এক-তৃতীয়াংশ ধরে শঙ্কু।',
    };
  },
);

const pythagoras = defineGenerator(
  {
    id: 'geo.pythagoras',
    name: 'Pythagoras',
    nameBn: 'পিথাগোরাস',
    topicId: 'triangles',
    skillIds: ['skill.pythagoras'],
    questionType: 'numeric',
    tags: ['geometry', 'pythagoras'],
    examIds: ['exam.ssc-math', 'exam.admission-math'],
    minDifficulty: 3,
    maxDifficulty: 7,
  },
  ({ rng, difficulty }) => {
    const triples = [
      [3, 4, 5],
      [6, 8, 10],
      [5, 12, 13],
      [8, 15, 17],
      [9, 12, 15],
      [7, 24, 25],
      [20, 21, 29],
    ];
    const triple = triples[rng.int(0, Math.min(triples.length - 1, 1 + Math.floor(difficulty / 1.5)))];
    const findHypotenuse = rng.bool(0.6);
    const result = findHypotenuse
      ? pythagorasHypotenuse(triple[0], triple[1])
      : pythagorasLeg(triple[2], triple[0]);
    const answer = result.value;

    return {
      prompt: findHypotenuse
        ? 'A right triangle has legs ' + triple[0] + ' cm and ' + triple[1] + ' cm. Find the hypotenuse.'
        : 'A right triangle has hypotenuse ' + triple[2] + ' cm and one leg ' + triple[0] + ' cm. Find the other leg.',
      promptBn: findHypotenuse
        ? 'একটি সমকোণী ত্রিভুজের দুই বাহু ' + bn(triple[0]) + ' সেমি ও ' + bn(triple[1]) + ' সেমি। অতিভুজ কত?'
        : 'একটি সমকোণী ত্রিভুজের অতিভুজ ' + bn(triple[2]) + ' সেমি ও এক বাহু ' + bn(triple[0]) + ' সেমি। অন্য বাহু কত?',
      correctAnswer: formatNumber(answer),
      choices: numericDistractors(answer, rng, 3, { min: 0 }),
      params: { triple: triple.join('-'), findHypotenuse: findHypotenuse ? 1 : 0 },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: 'In a right triangle the square on the hypotenuse equals the sum of the squares on the legs.',
      explanationBn: 'সমকোণী ত্রিভুজে অতিভুজের বর্গ = অপর দুই বাহুর বর্গের সমষ্টি।',
      hints: ['Square the known sides first.'],
      hintsBn: ['প্রথমে জানা বাহুগুলোর বর্গ করুন।'],
    };
  },
);

const angleRules = defineGenerator(
  {
    id: 'geo.angles',
    name: 'Angle Rules',
    nameBn: 'কোণের নিয়ম',
    topicId: 'angles',
    skillIds: ['skill.angle-rules'],
    questionType: 'numeric',
    tags: ['geometry', 'angles'],
    examIds: ['exam.ssc-math'],
    minDifficulty: 2,
    maxDifficulty: 6,
  },
  ({ rng, difficulty }) => {
    const kinds = ['triangle', 'straight', 'polygon', 'quadrilateral'] as const;
    const kind = kinds[rng.int(0, Math.min(kinds.length - 1, Math.floor(difficulty / 2)))];

    if (kind === 'triangle') {
      const a = rng.int(30, 80);
      const b = rng.int(20, 150 - a);
      const answer = 180 - a - b;
      return {
        prompt: 'Two angles of a triangle are ' + a + '° and ' + b + '°. Find the third angle.',
        promptBn: 'একটি ত্রিভুজের দুটি কোণ ' + bn(a) + '° ও ' + bn(b) + '°। তৃতীয় কোণ কত?',
        correctAnswer: String(answer),
        choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
        params: { kind, a, b },
        solutionSteps: [
          step('Angles in a triangle add to 180°.'),
          step('third = 180 - ' + a + ' - ' + b + ' = ' + answer + '°'),
        ],
        explanation: 'The three angles of any triangle always total 180°.',
        explanationBn: 'যেকোনো ত্রিভুজের তিন কোণের সমষ্টি সর্বদা ১৮০°।',
      };
    }
    if (kind === 'straight') {
      const a = rng.int(25, 155);
      const answer = 180 - a;
      return {
        prompt: 'Two angles on a straight line: one is ' + a + '°. Find the other.',
        promptBn: 'একটি সরলরেখায় দুটি কোণের একটি ' + bn(a) + '°। অন্যটি কত?',
        correctAnswer: String(answer),
        choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
        params: { kind, a },
        solutionSteps: [step('Angles on a straight line add to 180°.'), step('180 - ' + a + ' = ' + answer + '°')],
        explanation: 'A straight line is a 180° angle.',
        explanationBn: 'সরলরেখা মানে ১৮০° কোণ।',
      };
    }
    if (kind === 'quadrilateral') {
      const a = rng.int(60, 120);
      const b = rng.int(50, 110);
      const c = rng.int(40, 360 - a - b - 30);
      const answer = 360 - a - b - c;
      return {
        prompt: 'Three angles of a quadrilateral are ' + a + '°, ' + b + '° and ' + c + '°. Find the fourth.',
        promptBn: 'একটি চতুর্ভুজের তিনটি কোণ ' + bn(a) + '°, ' + bn(b) + '° ও ' + bn(c) + '°। চতুর্থ কোণ কত?',
        correctAnswer: String(answer),
        choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
        params: { kind, a, b, c },
        solutionSteps: [
          step('Angles in a quadrilateral add to 360°.'),
          step('fourth = 360 - ' + a + ' - ' + b + ' - ' + c + ' = ' + answer + '°'),
        ],
        explanation: 'A quadrilateral splits into two triangles, so 2 × 180° = 360°.',
        explanationBn: 'চতুর্ভুজকে দুটি ত্রিভুজে ভাগ করা যায়, তাই ২ × ১৮০° = ৩৬০°।',
      };
    }
    const sides = rng.int(5, 6 + difficulty);
    const answer = interiorAngleSum(sides);
    return {
      prompt: 'Find the sum of the interior angles of a polygon with ' + sides + ' sides.',
      promptBn: bn(sides) + ' বাহুর একটি বহুভুজের অন্তঃস্থ কোণগুলোর সমষ্টি কত?',
      correctAnswer: String(answer),
      choices: numericDistractors(answer, rng, 3, { integer: true, min: 0 }),
      params: { kind, sides },
      solutionSteps: [
        step('Sum = (n - 2) × 180°'),
        step('= (' + sides + ' - 2) × 180 = ' + answer + '°'),
      ],
      explanation: 'An n-sided polygon splits into (n - 2) triangles.',
      explanationBn: 'n বাহুর বহুভুজকে (n - ২) টি ত্রিভুজে ভাগ করা যায়।',
    };
  },
);

const coordinateGeometry = defineGenerator(
  {
    id: 'geo.coordinates',
    name: 'Coordinate Geometry',
    nameBn: 'স্থানাঙ্ক জ্যামিতি',
    topicId: 'coordinate-geometry',
    skillIds: ['skill.coordinate-distance'],
    questionType: 'numeric',
    tags: ['coordinate', 'geometry'],
    examIds: ['exam.hsc-math', 'exam.admission-math'],
    minDifficulty: 4,
    maxDifficulty: 8,
  },
  ({ rng, difficulty }) => {
    const mode = rng.int(0, 2);
    const legs = [
      [3, 4],
      [6, 8],
      [5, 12],
      [8, 15],
    ][rng.int(0, 3)];
    const p = { x: rng.int(-6, 6), y: rng.int(-6, 6) };
    const q = { x: p.x + legs[0], y: p.y + legs[1] };

    if (mode === 0) {
      const result = distance(p, q);
      return {
        prompt: 'Find the distance between (' + p.x + ', ' + p.y + ') and (' + q.x + ', ' + q.y + ').',
        promptBn: '(' + bn(p.x) + ', ' + bn(p.y) + ') ও (' + bn(q.x) + ', ' + bn(q.y) + ') বিন্দুর মধ্যে দূরত্ব কত?',
        correctAnswer: formatNumber(result.value),
        choices: numericDistractors(result.value, rng, 3, { min: 0 }),
        params: { px: p.x, py: p.y, qx: q.x, qy: q.y, mode },
        solutionSteps: result.steps.map((s) => step(s)),
        explanation: 'The distance formula is Pythagoras applied to coordinate differences.',
        explanationBn: 'দূরত্বের সূত্র হলো স্থানাঙ্কের পার্থক্যে পিথাগোরাস প্রয়োগ।',
      };
    }
    if (mode === 1) {
      const m = midpoint(p, q);
      const answer = '(' + formatNumber(m.x) + ', ' + formatNumber(m.y) + ')';
      return {
        prompt: 'Find the midpoint of (' + p.x + ', ' + p.y + ') and (' + q.x + ', ' + q.y + ').',
        promptBn: '(' + bn(p.x) + ', ' + bn(p.y) + ') ও (' + bn(q.x) + ', ' + bn(q.y) + ') এর মধ্যবিন্দু কত?',
        correctAnswer: answer,
        choices: [
          '(' + formatNumber(m.y) + ', ' + formatNumber(m.x) + ')',
          '(' + (q.x - p.x) + ', ' + (q.y - p.y) + ')',
          '(' + (p.x + q.x) + ', ' + (p.y + q.y) + ')',
        ],
        questionType: 'mcq',
        params: { px: p.x, py: p.y, qx: q.x, qy: q.y, mode },
        solutionSteps: [
          step('Midpoint = ((x₁+x₂)/2, (y₁+y₂)/2)'),
          step('= ((' + p.x + '+' + q.x + ')/2, (' + p.y + '+' + q.y + ')/2) = ' + answer),
        ],
        explanation: 'The midpoint averages the coordinates.',
        explanationBn: 'মধ্যবিন্দু হলো স্থানাঙ্কগুলোর গড়।',
      };
    }
    const slope = (q.y - p.y) / (q.x - p.x);
    return {
      prompt: 'Find the slope of the line through (' + p.x + ', ' + p.y + ') and (' + q.x + ', ' + q.y + ').',
      promptBn: '(' + bn(p.x) + ', ' + bn(p.y) + ') ও (' + bn(q.x) + ', ' + bn(q.y) + ') বিন্দুগামী সরলরেখার ঢাল কত?',
      correctAnswer: formatNumber(slope, 4),
      choices: numericDistractors(slope, rng, 3, { decimals: 4 }),
      tolerance: 0.01,
      params: { px: p.x, py: p.y, qx: q.x, qy: q.y, mode },
      solutionSteps: [
        step('slope m = (y₂ - y₁)/(x₂ - x₁)'),
        step('m = (' + q.y + ' - ' + p.y + ')/(' + q.x + ' - ' + p.x + ') = ' + formatNumber(slope, 4)),
      ],
      explanation: 'Slope measures rise over run.',
      explanationBn: 'ঢাল মানে উল্লম্ব পরিবর্তন ÷ অনুভূমিক পরিবর্তন।',
    };
  },
);

const heronArea = defineGenerator(
  {
    id: 'geo.heron',
    name: "Heron's Formula",
    nameBn: 'হেরনের সূত্র',
    topicId: 'mensuration',
    skillIds: ['skill.area-perimeter'],
    questionType: 'numeric',
    tags: ['mensuration', 'triangle'],
    examIds: ['exam.hsc-math'],
    minDifficulty: 5,
    maxDifficulty: 9,
  },
  ({ rng }) => {
    const triples = [
      [13, 14, 15],
      [5, 12, 13],
      [9, 10, 17],
      [7, 15, 20],
      [6, 25, 29],
      [10, 17, 21],
    ];
    const [a, b, c] = triples[rng.int(0, triples.length - 1)];
    const result = triangleAreaHeron(a, b, c);

    return {
      prompt: 'Find the area of a triangle with sides ' + a + ', ' + b + ' and ' + c + ' cm.',
      promptBn: bn(a) + ', ' + bn(b) + ' ও ' + bn(c) + ' সেমি বাহুবিশিষ্ট ত্রিভুজের ক্ষেত্রফল কত?',
      correctAnswer: formatNumber(result.value, 2),
      choices: numericDistractors(result.value, rng, 3, { min: 0, decimals: 2 }),
      tolerance: 0.5,
      params: { a, b, c },
      solutionSteps: result.steps.map((s) => step(s)),
      explanation: "Heron's formula needs only the three sides — no height required.",
      explanationBn: 'হেরনের সূত্রে উচ্চতা লাগে না, তিন বাহুই যথেষ্ট।',
      hints: ['Start with the semi-perimeter s.'],
      hintsBn: ['প্রথমে অর্ধপরিসীমা s বের করুন।'],
    };
  },
);

export const GEOMETRY_GENERATORS: QuestionGenerator[] = [
  areaPerimeter,
  volumeSurface,
  pythagoras,
  angleRules,
  coordinateGeometry,
  heronArea,
];
