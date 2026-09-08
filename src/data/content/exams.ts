import { CURRENT_CONTENT_VERSION } from '../../domain/models/common';
import type { Exam, ExamSection } from '../../domain/models';
import type { ExamFamily } from '../../core/constants/levels';

interface SectionSeed {
  id: string;
  name: string;
  nameBn: string;
  count: number;
  topics: string[];
  difficulty: [number, number];
  generators: string[];
}

interface ExamSeed {
  id: string;
  code: string;
  family: ExamFamily;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  emoji: string;
  durationSeconds: number;
  markPerQuestion: number;
  negative: number;
  years: number[];
  sections: SectionSeed[];
}

/**
 * Exam blueprints (spec §25). New exams are pure content — the exam engine
 * never needs to change to support one (spec §23).
 */
const SEEDS: ExamSeed[] = [
  {
    id: 'exam.bcs-math',
    code: 'BCS-MATH',
    family: 'bcs',
    name: 'BCS Mathematics',
    nameBn: 'বিসিএস গণিত',
    description: '50 questions in 30 minutes with negative marking, matching the BCS preliminary pattern.',
    descriptionBn: '৩০ মিনিটে ৫০টি প্রশ্ন, নেগেটিভ মার্কিংসহ — বিসিএস প্রিলিমিনারির ধাঁচে।',
    emoji: '🏛️',
    durationSeconds: 1800,
    markPerQuestion: 1,
    negative: 0.5,
    years: [2019, 2020, 2021, 2022, 2023, 2024],
    sections: [
      {
        id: 'arithmetic',
        name: 'Arithmetic',
        nameBn: 'পাটিগণিত',
        count: 18,
        topics: ['percentage', 'ratio-proportion', 'average', 'financial-math'],
        difficulty: [4, 7],
        generators: ['pct.of-quantity', 'pct.profit-loss', 'pct.simple-interest', 'ratio.share', 'ratio.average', 'ratio.mixture'],
      },
      {
        id: 'algebra',
        name: 'Algebra',
        nameBn: 'বীজগণিত',
        count: 12,
        topics: ['linear-equations', 'quadratic-equations', 'sequences-series', 'elementary-algebra'],
        difficulty: [4, 7],
        generators: ['alg.solve-linear', 'alg.solve-quadratic', 'alg.ap', 'alg.expand'],
      },
      {
        id: 'geometry',
        name: 'Geometry & Mensuration',
        nameBn: 'জ্যামিতি ও পরিমিতি',
        count: 10,
        topics: ['mensuration', 'triangles', 'angles'],
        difficulty: [4, 7],
        generators: ['geo.area-perimeter', 'geo.pythagoras', 'geo.angles', 'geo.volume'],
      },
      {
        id: 'reasoning',
        name: 'Number Theory & Reasoning',
        nameBn: 'সংখ্যাতত্ত্ব ও যুক্তি',
        count: 10,
        topics: ['number-theory', 'logical-reasoning', 'set-theory', 'basic-probability'],
        difficulty: [4, 8],
        generators: ['nt.hcf-lcm', 'nt.divisibility', 'logic.sets', 'logic.arrangement', 'prob.dice-coin'],
      },
    ],
  },
  {
    id: 'exam.bank-math',
    code: 'BANK-MATH',
    family: 'bank',
    name: 'Bank Job Mathematics',
    nameBn: 'ব্যাংক নিয়োগ গণিত',
    description: '40 questions in 25 minutes, weighted towards arithmetic and data interpretation.',
    descriptionBn: '২৫ মিনিটে ৪০টি প্রশ্ন, পাটিগণিত ও তথ্য বিশ্লেষণে বেশি জোর।',
    emoji: '🏦',
    durationSeconds: 1500,
    markPerQuestion: 1,
    negative: 0.25,
    years: [2021, 2022, 2023, 2024],
    sections: [
      {
        id: 'arithmetic',
        name: 'Arithmetic',
        nameBn: 'পাটিগণিত',
        count: 16,
        topics: ['percentage', 'financial-math', 'ratio-proportion'],
        difficulty: [4, 7],
        generators: ['pct.of-quantity', 'pct.compound-interest', 'pct.profit-loss', 'ratio.share'],
      },
      {
        id: 'data',
        name: 'Data Interpretation',
        nameBn: 'তথ্য বিশ্লেষণ',
        count: 10,
        topics: ['data-interpretation', 'descriptive-statistics'],
        difficulty: [3, 7],
        generators: ['stat.chart', 'stat.central-tendency', 'pct.change'],
      },
      {
        id: 'speed',
        name: 'Time, Speed & Work',
        nameBn: 'সময়, গতি ও কাজ',
        count: 8,
        topics: ['time-speed-distance', 'work-time'],
        difficulty: [5, 8],
        generators: ['rate.speed-distance', 'rate.work-together', 'rate.train-crossing'],
      },
      {
        id: 'algebra',
        name: 'Algebra',
        nameBn: 'বীজগণিত',
        count: 6,
        topics: ['linear-equations', 'sequences-series'],
        difficulty: [4, 7],
        generators: ['alg.solve-linear', 'alg.pattern'],
      },
    ],
  },
  {
    id: 'exam.ntrca-math',
    code: 'NTRCA-MATH',
    family: 'ntrca',
    name: 'NTRCA Mathematics',
    nameBn: 'এনটিআরসিএ গণিত',
    description: '30 questions in 20 minutes covering school-level mathematics.',
    descriptionBn: '২০ মিনিটে ৩০টি প্রশ্ন, স্কুল পর্যায়ের গণিত জুড়ে।',
    emoji: '👩‍🏫',
    durationSeconds: 1200,
    markPerQuestion: 1,
    negative: 0.25,
    years: [2022, 2023, 2024],
    sections: [
      {
        id: 'core',
        name: 'Arithmetic & Algebra',
        nameBn: 'পাটিগণিত ও বীজগণিত',
        count: 18,
        topics: ['percentage', 'average', 'fractions', 'linear-equations'],
        difficulty: [3, 6],
        generators: ['pct.of-quantity', 'ratio.average', 'frac.arithmetic', 'alg.solve-linear'],
      },
      {
        id: 'geometry',
        name: 'Geometry',
        nameBn: 'জ্যামিতি',
        count: 8,
        topics: ['mensuration', 'angles', 'triangles'],
        difficulty: [3, 6],
        generators: ['geo.area-perimeter', 'geo.angles', 'geo.pythagoras'],
      },
      {
        id: 'number',
        name: 'Number Theory',
        nameBn: 'সংখ্যাতত্ত্ব',
        count: 4,
        topics: ['number-theory'],
        difficulty: [3, 6],
        generators: ['nt.hcf-lcm', 'nt.prime'],
      },
    ],
  },
  {
    id: 'exam.ssc-math',
    code: 'SSC-MATH',
    family: 'school',
    name: 'SSC Mathematics',
    nameBn: 'এসএসসি গণিত',
    description: '25 questions in 30 minutes across the secondary syllabus.',
    descriptionBn: '৩০ মিনিটে ২৫টি প্রশ্ন, মাধ্যমিক সিলেবাস জুড়ে।',
    emoji: '🎒',
    durationSeconds: 1800,
    markPerQuestion: 1,
    negative: 0,
    years: [2022, 2023, 2024],
    sections: [
      {
        id: 'algebra',
        name: 'Algebra',
        nameBn: 'বীজগণিত',
        count: 10,
        topics: ['elementary-algebra', 'linear-equations', 'quadratic-equations', 'sequences-series'],
        difficulty: [3, 6],
        generators: ['alg.solve-linear', 'alg.solve-quadratic', 'alg.expand', 'alg.ap'],
      },
      {
        id: 'geometry',
        name: 'Geometry',
        nameBn: 'জ্যামিতি',
        count: 9,
        topics: ['angles', 'triangles', 'mensuration'],
        difficulty: [3, 6],
        generators: ['geo.angles', 'geo.pythagoras', 'geo.area-perimeter'],
      },
      {
        id: 'stats',
        name: 'Statistics & Probability',
        nameBn: 'পরিসংখ্যান ও সম্ভাব্যতা',
        count: 6,
        topics: ['descriptive-statistics', 'basic-probability'],
        difficulty: [3, 6],
        generators: ['stat.central-tendency', 'prob.dice-coin'],
      },
    ],
  },
  {
    id: 'exam.hsc-math',
    code: 'HSC-MATH',
    family: 'school',
    name: 'HSC Mathematics',
    nameBn: 'এইচএসসি গণিত',
    description: '25 questions in 35 minutes across higher secondary mathematics.',
    descriptionBn: '৩৫ মিনিটে ২৫টি প্রশ্ন, উচ্চ মাধ্যমিক গণিত জুড়ে।',
    emoji: '📐',
    durationSeconds: 2100,
    markPerQuestion: 1,
    negative: 0,
    years: [2022, 2023, 2024],
    sections: [
      {
        id: 'calculus',
        name: 'Calculus',
        nameBn: 'ক্যালকুলাস',
        count: 8,
        topics: ['differentiation', 'integration', 'calculus'],
        difficulty: [5, 8],
        generators: ['calc.derivative', 'calc.integral', 'calc.limit'],
      },
      {
        id: 'trig',
        name: 'Trigonometry',
        nameBn: 'ত্রিকোণমিতি',
        count: 7,
        topics: ['trigonometry'],
        difficulty: [5, 8],
        generators: ['trig.ratios', 'trig.identity', 'trig.heights', 'trig.cosine-rule'],
      },
      {
        id: 'algebra',
        name: 'Algebra & Matrices',
        nameBn: 'বীজগণিত ও ম্যাট্রিক্স',
        count: 6,
        topics: ['indices-logarithms', 'polynomials', 'linear-algebra'],
        difficulty: [5, 8],
        generators: ['alg.indices', 'alg.logarithm', 'la.matrix'],
      },
      {
        id: 'probability',
        name: 'Probability',
        nameBn: 'সম্ভাব্যতা',
        count: 4,
        topics: ['conditional-probability', 'combinatorics'],
        difficulty: [5, 8],
        generators: ['prob.conditional', 'prob.counting'],
      },
    ],
  },
  {
    id: 'exam.admission-math',
    code: 'ADMISSION-MATH',
    family: 'admission',
    name: 'University Admission Mathematics',
    nameBn: 'বিশ্ববিদ্যালয় ভর্তি গণিত',
    description: '30 hard questions in 30 minutes with negative marking.',
    descriptionBn: '৩০ মিনিটে ৩০টি কঠিন প্রশ্ন, নেগেটিভ মার্কিংসহ।',
    emoji: '🎓',
    durationSeconds: 1800,
    markPerQuestion: 1,
    negative: 0.25,
    years: [2022, 2023, 2024],
    sections: [
      {
        id: 'algebra',
        name: 'Algebra',
        nameBn: 'বীজগণিত',
        count: 10,
        topics: ['quadratic-equations', 'indices-logarithms', 'sequences-series', 'simultaneous-equations'],
        difficulty: [6, 9],
        generators: ['alg.solve-quadratic', 'alg.discriminant', 'alg.indices', 'alg.gp', 'alg.simultaneous'],
      },
      {
        id: 'calculus',
        name: 'Calculus',
        nameBn: 'ক্যালকুলাস',
        count: 8,
        topics: ['differentiation', 'integration', 'calculus'],
        difficulty: [6, 9],
        generators: ['calc.derivative', 'calc.integral', 'calc.limit'],
      },
      {
        id: 'geometry',
        name: 'Geometry & Trigonometry',
        nameBn: 'জ্যামিতি ও ত্রিকোণমিতি',
        count: 8,
        topics: ['coordinate-geometry', 'trigonometry', 'mensuration'],
        difficulty: [6, 9],
        generators: ['geo.coordinates', 'trig.heights', 'trig.cosine-rule', 'geo.heron'],
      },
      {
        id: 'counting',
        name: 'Counting & Probability',
        nameBn: 'গণনা ও সম্ভাব্যতা',
        count: 4,
        topics: ['combinatorics', 'conditional-probability'],
        difficulty: [6, 9],
        generators: ['prob.counting', 'prob.conditional'],
      },
    ],
  },
  {
    id: 'exam.primary-teacher',
    code: 'PRIMARY-MATH',
    family: 'govt',
    name: 'Primary Teacher Recruitment',
    nameBn: 'প্রাথমিক শিক্ষক নিয়োগ',
    description: '20 questions in 15 minutes at primary and middle-school level.',
    descriptionBn: '১৫ মিনিটে ২০টি প্রশ্ন, প্রাথমিক ও নিম্ন মাধ্যমিক স্তরে।',
    emoji: '🏫',
    durationSeconds: 900,
    markPerQuestion: 1,
    negative: 0.25,
    years: [2023, 2024],
    sections: [
      {
        id: 'core',
        name: 'Arithmetic',
        nameBn: 'পাটিগণিত',
        count: 12,
        topics: ['arithmetic', 'fractions', 'percentage', 'average'],
        difficulty: [2, 5],
        generators: ['arith.bodmas', 'frac.arithmetic', 'pct.of-quantity', 'ratio.average'],
      },
      {
        id: 'geometry',
        name: 'Geometry',
        nameBn: 'জ্যামিতি',
        count: 4,
        topics: ['mensuration', 'angles'],
        difficulty: [2, 5],
        generators: ['geo.area-perimeter', 'geo.angles'],
      },
      {
        id: 'reasoning',
        name: 'Reasoning',
        nameBn: 'যুক্তি',
        count: 4,
        topics: ['logical-reasoning', 'number-theory'],
        difficulty: [2, 5],
        generators: ['logic.arrangement', 'nt.hcf-lcm'],
      },
    ],
  },
  {
    id: 'exam.railway-police',
    code: 'GOVT-MATH',
    family: 'govt',
    name: 'Railway & Police Recruitment',
    nameBn: 'রেলওয়ে ও পুলিশ নিয়োগ',
    description: '25 questions in 20 minutes across general recruitment mathematics.',
    descriptionBn: '২০ মিনিটে ২৫টি প্রশ্ন, সাধারণ নিয়োগ গণিত জুড়ে।',
    emoji: '🚉',
    durationSeconds: 1200,
    markPerQuestion: 1,
    negative: 0.25,
    years: [2023, 2024],
    sections: [
      {
        id: 'arithmetic',
        name: 'Arithmetic',
        nameBn: 'পাটিগণিত',
        count: 14,
        topics: ['percentage', 'ratio-proportion', 'average', 'time-speed-distance'],
        difficulty: [3, 6],
        generators: ['pct.of-quantity', 'ratio.share', 'ratio.average', 'rate.speed-distance'],
      },
      {
        id: 'algebra',
        name: 'Algebra & Reasoning',
        nameBn: 'বীজগণিত ও যুক্তি',
        count: 7,
        topics: ['linear-equations', 'logical-reasoning', 'sequences-series'],
        difficulty: [3, 6],
        generators: ['alg.solve-linear', 'alg.pattern', 'logic.arrangement'],
      },
      {
        id: 'geometry',
        name: 'Mensuration',
        nameBn: 'পরিমিতি',
        count: 4,
        topics: ['mensuration'],
        difficulty: [3, 6],
        generators: ['geo.area-perimeter', 'geo.volume'],
      },
    ],
  },
  {
    id: 'exam.olympiad-math',
    code: 'OLYMPIAD-MATH',
    family: 'olympiad',
    name: 'Mathematics Olympiad',
    nameBn: 'গণিত অলিম্পিয়াড',
    description: '15 hard problems in 45 minutes. No negative marking — think, do not rush.',
    descriptionBn: '৪৫ মিনিটে ১৫টি কঠিন সমস্যা। নেগেটিভ মার্কিং নেই — ভাবুন, তাড়াহুড়ো নয়।',
    emoji: '🥇',
    durationSeconds: 2700,
    markPerQuestion: 2,
    negative: 0,
    years: [2022, 2023, 2024],
    sections: [
      {
        id: 'number-theory',
        name: 'Number Theory',
        nameBn: 'সংখ্যাতত্ত্ব',
        count: 5,
        topics: ['number-theory', 'advanced-number-theory'],
        difficulty: [7, 9],
        generators: ['nt.modular', 'nt.divisor-count', 'nt.digits'],
      },
      {
        id: 'combinatorics',
        name: 'Combinatorics',
        nameBn: 'বিন্যাস ও সমাবেশ',
        count: 4,
        topics: ['combinatorics', 'graph-theory'],
        difficulty: [7, 9],
        generators: ['prob.counting', 'discrete.graph'],
      },
      {
        id: 'algebra',
        name: 'Algebra',
        nameBn: 'বীজগণিত',
        count: 3,
        topics: ['quadratic-equations', 'sequences-series'],
        difficulty: [7, 9],
        generators: ['alg.solve-quadratic', 'alg.gp'],
      },
      {
        id: 'geometry',
        name: 'Geometry',
        nameBn: 'জ্যামিতি',
        count: 3,
        topics: ['euclidean-geometry', 'coordinate-geometry', 'trigonometry'],
        difficulty: [7, 9],
        generators: ['geo.heron', 'geo.coordinates', 'trig.cosine-rule'],
      },
    ],
  },
  {
    id: 'exam.quick-10',
    code: 'QUICK-10',
    family: 'custom',
    name: 'Quick 10',
    nameBn: 'দ্রুত ১০',
    description: '10 adaptive questions in 5 minutes — a fast readiness check.',
    descriptionBn: '৫ মিনিটে ১০টি অ্যাডাপটিভ প্রশ্ন — দ্রুত প্রস্তুতি যাচাই।',
    emoji: '⚡',
    durationSeconds: 300,
    markPerQuestion: 1,
    negative: 0,
    years: [],
    sections: [
      {
        id: 'mixed',
        name: 'Mixed',
        nameBn: 'মিশ্র',
        count: 10,
        topics: [],
        difficulty: [2, 7],
        generators: [],
      },
    ],
  },
];

function toSection(seed: SectionSeed): ExamSection {
  return {
    id: seed.id,
    name: seed.name,
    nameBn: seed.nameBn,
    questionCount: seed.count,
    topicIds: seed.topics,
    skillIds: [],
    difficultyMin: seed.difficulty[0],
    difficultyMax: seed.difficulty[1],
    examTag: null,
    generatorIds: seed.generators,
  };
}

export const EXAMS: Exam[] = SEEDS.map((seed) => {
  const sections = seed.sections.map(toSection);
  return {
    id: seed.id,
    code: seed.code,
    family: seed.family,
    name: seed.name,
    nameBn: seed.nameBn,
    description: seed.description,
    descriptionBn: seed.descriptionBn,
    emoji: seed.emoji,
    totalQuestions: sections.reduce((acc, s) => acc + s.questionCount, 0),
    durationSeconds: seed.durationSeconds,
    markPerQuestion: seed.markPerQuestion,
    negativeMarkPerWrong: seed.negative,
    shuffleQuestions: true,
    shuffleOptions: true,
    sections,
    years: seed.years,
    contentVersion: CURRENT_CONTENT_VERSION,
  };
});

/** Topic ids an exam draws from — used for exam-readiness scoring. */
export function examTopicIds(examId: string): string[] {
  const exam = EXAMS.find((e) => e.id === examId);
  if (!exam) return [];
  return Array.from(new Set(exam.sections.flatMap((s) => s.topicIds)));
}
