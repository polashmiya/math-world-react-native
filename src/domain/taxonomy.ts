import type { AcademicLevel } from '../core/constants/levels';
import type { TopicColorKey } from './models/topic';

/**
 * The mathematics skill tree (spec §31) and the single source of truth for
 * topic and skill IDs. These strings are stable content identifiers: they are
 * referenced by generators, content packs, exams and saved user progress, so
 * they must never be renamed once shipped (spec §9, §61.7).
 */
export interface TaxonomyTopic {
  id: string;
  parentId: string | null;
  name: string;
  nameBn: string;
  level: AcademicLevel;
  baseDifficulty: number;
  emoji: string;
  colorKey: TopicColorKey;
  description: string;
  descriptionBn: string;
  prerequisiteTopicIds: string[];
}

export interface TaxonomySkill {
  id: string;
  topicId: string;
  name: string;
  nameBn: string;
}

const t = (
  id: string,
  parentId: string | null,
  name: string,
  nameBn: string,
  level: AcademicLevel,
  baseDifficulty: number,
  emoji: string,
  colorKey: TopicColorKey,
  description: string,
  descriptionBn: string,
  prerequisiteTopicIds: string[] = [],
): TaxonomyTopic => ({
  id,
  parentId,
  name,
  nameBn,
  level,
  baseDifficulty,
  emoji,
  colorKey,
  description,
  descriptionBn,
  prerequisiteTopicIds,
});

/** Root branches of the tree. */
export const TOPIC_NUMBERS = 'numbers';
export const TOPIC_ALGEBRA = 'algebra';
export const TOPIC_GEOMETRY = 'geometry';
export const TOPIC_ANALYSIS = 'analysis';
export const TOPIC_PROBABILITY = 'probability';
export const TOPIC_STATISTICS = 'statistics';
export const TOPIC_LOGIC = 'logic';
export const TOPIC_COMBINATORICS = 'combinatorics';
export const TOPIC_GRAPH_THEORY = 'graph-theory';
export const TOPIC_APPLIED = 'applied-math';
export const TOPIC_REAL_LIFE = 'real-life';

export const TAXONOMY_TOPICS: TaxonomyTopic[] = [
  // ── Numbers ───────────────────────────────────────────────────────────────
  t(TOPIC_NUMBERS, null, 'Numbers', 'সংখ্যা', 'foundation', 1, '🔢', 'blue',
    'Counting, place value and the four operations.', 'গণনা, স্থানীয় মান ও চার প্রক্রিয়া।'),
  t('arithmetic', TOPIC_NUMBERS, 'Arithmetic', 'পাটিগণিত', 'primary', 1, '➕', 'blue',
    'Addition, subtraction, multiplication, division and order of operations.',
    'যোগ, বিয়োগ, গুণ, ভাগ ও ক্রম।'),
  t('place-value', 'arithmetic', 'Place Value', 'স্থানীয় মান', 'primary', 1, '🏷️', 'blue',
    'Reading and writing numbers by place value.', 'স্থানীয় মান অনুযায়ী সংখ্যা পড়া ও লেখা।'),
  t('order-of-operations', 'arithmetic', 'Order of Operations', 'প্রক্রিয়ার ক্রম', 'middle', 3, '🧮', 'blue',
    'BODMAS/BIDMAS applied to mixed expressions.', 'মিশ্র রাশিতে BODMAS প্রয়োগ।', ['arithmetic']),
  t('fractions', TOPIC_NUMBERS, 'Fractions', 'ভগ্নাংশ', 'primary', 2, '🍕', 'violet',
    'Parts of a whole, equivalent fractions and fraction arithmetic.',
    'ভগ্নাংশ, সমতুল ভগ্নাংশ ও ভগ্নাংশের প্রক্রিয়া।', ['arithmetic']),
  t('decimals', TOPIC_NUMBERS, 'Decimals', 'দশমিক', 'primary', 2, '🔟', 'violet',
    'Decimal place value, rounding and operations.', 'দশমিক স্থানীয় মান, নিকটবর্তীকরণ ও প্রক্রিয়া।', ['fractions']),
  t('percentage', TOPIC_NUMBERS, 'Percentage', 'শতকরা', 'middle', 3, '％', 'amber',
    'Percentages, increase, decrease and everyday money maths.',
    'শতকরা, বৃদ্ধি, হ্রাস ও দৈনন্দিন টাকার হিসাব।', ['fractions', 'decimals']),
  t('ratio-proportion', TOPIC_NUMBERS, 'Ratio & Proportion', 'অনুপাত ও সমানুপাত', 'middle', 3, '⚖️', 'amber',
    'Comparing quantities, sharing in a ratio and direct/inverse proportion.',
    'রাশির তুলনা, অনুপাতে ভাগ ও সরল/বিপরীত সমানুপাত।', ['fractions']),
  t('average', TOPIC_NUMBERS, 'Average', 'গড়', 'middle', 3, '📐', 'teal',
    'Simple, weighted and combined averages.', 'সরল, ভারযুক্ত ও সম্মিলিত গড়।', ['arithmetic']),
  t('number-theory', TOPIC_NUMBERS, 'Number Theory', 'সংখ্যাতত্ত্ব', 'secondary', 4, '🔍', 'indigo',
    'Divisibility, primes, HCF/LCM and digit problems.',
    'বিভাজ্যতা, মৌলিক সংখ্যা, গসাগু/লসাগু ও অঙ্কের সমস্যা।', ['arithmetic']),
  t('advanced-number-theory', 'number-theory', 'Advanced Number Theory', 'উচ্চতর সংখ্যাতত্ত্ব', 'undergraduate', 7, '🧠', 'indigo',
    'Modular arithmetic, congruences and Diophantine thinking.',
    'মডুলার গণিত, সর্বসমতা ও ডায়োফ্যান্টাইন চিন্তা।', ['number-theory']),

  // ── Algebra ───────────────────────────────────────────────────────────────
  t(TOPIC_ALGEBRA, null, 'Algebra', 'বীজগণিত', 'middle', 3, '🅧', 'green',
    'Working with unknowns, expressions and equations.', 'অজানা রাশি, রাশিমালা ও সমীকরণ।'),
  t('elementary-algebra', TOPIC_ALGEBRA, 'Elementary Algebra', 'প্রাথমিক বীজগণিত', 'middle', 3, '✏️', 'green',
    'Simplifying, expanding and substituting into expressions.',
    'রাশিমালা সরলীকরণ, বিস্তার ও মান নির্ণয়।', ['arithmetic']),
  t('linear-equations', TOPIC_ALGEBRA, 'Linear Equations', 'সরল সমীকরণ', 'middle', 3, '📏', 'green',
    'One-variable equations and simple word problems.',
    'একচলক সমীকরণ ও শব্দ সমস্যা।', ['elementary-algebra']),
  t('simultaneous-equations', TOPIC_ALGEBRA, 'Simultaneous Equations', 'যুগপৎ সমীকরণ', 'secondary', 4, '🔗', 'green',
    'Two and three variable systems.', 'দুই ও তিন চলকের সমীকরণজোট।', ['linear-equations']),
  t('quadratic-equations', TOPIC_ALGEBRA, 'Quadratic Equations', 'দ্বিঘাত সমীকরণ', 'secondary', 5, '⤴️', 'green',
    'Factorisation, the formula and the discriminant.',
    'উৎপাদক, সূত্র ও নিশ্চায়ক।', ['linear-equations']),
  t('polynomials', TOPIC_ALGEBRA, 'Polynomials', 'বহুপদী', 'higher_secondary', 5, '🧾', 'green',
    'Degree, roots, factor theorem and division.', 'মাত্রা, বীজ, উৎপাদক উপপাদ্য ও ভাগ।', ['quadratic-equations']),
  t('indices-logarithms', TOPIC_ALGEBRA, 'Indices & Logarithms', 'সূচক ও লগারিদম', 'higher_secondary', 5, '⏫', 'green',
    'Laws of indices and logarithms.', 'সূচক ও লগারিদমের সূত্র।', ['elementary-algebra']),
  t('sequences-series', TOPIC_ALGEBRA, 'Sequences & Series', 'ধারা ও অনুক্রম', 'secondary', 4, '🪜', 'teal',
    'Arithmetic and geometric progressions, sums and patterns.',
    'সমান্তর ও গুণোত্তর ধারা, যোগফল ও প্যাটার্ন।', ['elementary-algebra']),
  t('linear-algebra', TOPIC_ALGEBRA, 'Linear Algebra', 'রৈখিক বীজগণিত', 'undergraduate', 6, '🔲', 'indigo',
    'Matrices, determinants, vectors and linear systems.',
    'ম্যাট্রিক্স, নির্ণায়ক, ভেক্টর ও রৈখিক সমীকরণজোট।', ['simultaneous-equations']),
  t('abstract-algebra', TOPIC_ALGEBRA, 'Abstract Algebra', 'বিমূর্ত বীজগণিত', 'graduate', 8, '🧿', 'indigo',
    'Groups, rings and fields.', 'গ্রুপ, রিং ও ফিল্ড।', ['linear-algebra']),

  // ── Geometry ──────────────────────────────────────────────────────────────
  t(TOPIC_GEOMETRY, null, 'Geometry', 'জ্যামিতি', 'primary', 2, '📐', 'rose',
    'Shape, size, position and space.', 'আকার, আয়তন, অবস্থান ও স্থান।'),
  t('euclidean-geometry', TOPIC_GEOMETRY, 'Euclidean Geometry', 'ইউক্লিডীয় জ্যামিতি', 'secondary', 4, '🔺', 'rose',
    'Lines, angles, triangles, circles and proofs.',
    'রেখা, কোণ, ত্রিভুজ, বৃত্ত ও প্রমাণ।'),
  t('angles', 'euclidean-geometry', 'Angles', 'কোণ', 'middle', 2, '📏', 'rose',
    'Angle types, parallel lines and angle sums.', 'কোণের প্রকার, সমান্তরাল রেখা ও কোণের সমষ্টি।'),
  t('triangles', 'euclidean-geometry', 'Triangles', 'ত্রিভুজ', 'secondary', 3, '🔻', 'rose',
    'Congruence, similarity and Pythagoras.', 'সর্বসমতা, সদৃশতা ও পিথাগোরাস।', ['angles']),
  t('circles', 'euclidean-geometry', 'Circles', 'বৃত্ত', 'secondary', 4, '⭕', 'rose',
    'Chords, tangents, arcs and circle theorems.', 'জ্যা, স্পর্শক, চাপ ও বৃত্তের উপপাদ্য।', ['angles']),
  t('mensuration', TOPIC_GEOMETRY, 'Mensuration', 'পরিমিতি', 'secondary', 3, '📦', 'orange',
    'Perimeter, area, surface area and volume.', 'পরিসীমা, ক্ষেত্রফল, পৃষ্ঠতল ও আয়তন।', ['triangles']),
  t('coordinate-geometry', TOPIC_GEOMETRY, 'Coordinate Geometry', 'স্থানাঙ্ক জ্যামিতি', 'higher_secondary', 5, '🗺️', 'rose',
    'Points, distance, slope, lines and circles on the plane.',
    'বিন্দু, দূরত্ব, ঢাল, সরলরেখা ও বৃত্ত।', ['linear-equations']),
  t('trigonometry', TOPIC_GEOMETRY, 'Trigonometry', 'ত্রিকোণমিতি', 'higher_secondary', 5, '📡', 'orange',
    'Ratios, identities, heights and distances.', 'ত্রিকোণমিতিক অনুপাত, অভেদ, উচ্চতা ও দূরত্ব।', ['triangles']),
  t('topology', TOPIC_GEOMETRY, 'Topology', 'টপোলজি', 'graduate', 8, '🌀', 'indigo',
    'Continuity, open sets and invariants.', 'ধারাবাহিকতা, মুক্ত সেট ও অপরিবর্তক।', ['euclidean-geometry']),

  // ── Analysis ──────────────────────────────────────────────────────────────
  t(TOPIC_ANALYSIS, null, 'Analysis', 'বিশ্লেষণ', 'higher_secondary', 6, '📈', 'teal',
    'Limits, change and accumulation.', 'সীমা, পরিবর্তন ও সঞ্চয়ন।'),
  t('calculus', TOPIC_ANALYSIS, 'Calculus', 'ক্যালকুলাস', 'higher_secondary', 6, '∫', 'teal',
    'Limits, derivatives and integrals.', 'সীমা, অন্তরজ ও সমাকলন।', ['polynomials']),
  t('differentiation', 'calculus', 'Differentiation', 'অন্তরীকরণ', 'higher_secondary', 6, '📉', 'teal',
    'Rates of change and the rules of differentiation.', 'পরিবর্তনের হার ও অন্তরীকরণের সূত্র।', ['calculus']),
  t('integration', 'calculus', 'Integration', 'সমাকলন', 'higher_secondary', 6, '🧊', 'teal',
    'Antiderivatives, definite integrals and area.', 'বিপরীত অন্তরজ, নির্দিষ্ট সমাকলন ও ক্ষেত্রফল।', ['differentiation']),
  t('real-analysis', TOPIC_ANALYSIS, 'Real Analysis', 'বাস্তব বিশ্লেষণ', 'undergraduate', 8, '🪞', 'indigo',
    'Sequences, series, continuity and rigour.', 'অনুক্রম, ধারা, ধারাবাহিকতা ও কঠোরতা।', ['calculus']),
  t('complex-analysis', TOPIC_ANALYSIS, 'Complex Analysis', 'জটিল বিশ্লেষণ', 'graduate', 8, '🌐', 'indigo',
    'Complex numbers and analytic functions.', 'জটিল সংখ্যা ও বিশ্লেষণী ফাংশন।', ['real-analysis']),

  // ── Probability & Statistics ─────────────────────────────────────────────
  t(TOPIC_PROBABILITY, null, 'Probability', 'সম্ভাব্যতা', 'secondary', 4, '🎲', 'amber',
    'Chance, expectation and randomness.', 'সম্ভাবনা, প্রত্যাশা ও দৈবতা।'),
  t('basic-probability', TOPIC_PROBABILITY, 'Basic Probability', 'প্রাথমিক সম্ভাব্যতা', 'secondary', 4, '🪙', 'amber',
    'Equally likely outcomes, complements and unions.', 'সমসম্ভাব্য ফল, পূরক ও সংযোগ।', ['fractions']),
  t('conditional-probability', TOPIC_PROBABILITY, 'Conditional Probability', 'শর্তাধীন সম্ভাব্যতা', 'higher_secondary', 6, '🔀', 'amber',
    'Dependence, trees and Bayes.', 'নির্ভরতা, ট্রি ও বেইজ।', ['basic-probability']),
  t(TOPIC_STATISTICS, null, 'Statistics', 'পরিসংখ্যান', 'secondary', 4, '📊', 'blue',
    'Collecting, summarising and interpreting data.', 'তথ্য সংগ্রহ, সংক্ষেপ ও বিশ্লেষণ।'),
  t('descriptive-statistics', TOPIC_STATISTICS, 'Descriptive Statistics', 'বর্ণনামূলক পরিসংখ্যান', 'secondary', 4, '🧾', 'blue',
    'Mean, median, mode, spread and charts.', 'গড়, মধ্যক, প্রচুরক, বিস্তার ও লেখচিত্র।', ['average']),
  t('data-interpretation', TOPIC_STATISTICS, 'Data Interpretation', 'তথ্য বিশ্লেষণ', 'secondary', 4, '📉', 'blue',
    'Reading tables, bar charts and pie charts under time pressure.',
    'সারণি, স্তম্ভলেখ ও পাইচিত্র দ্রুত পড়া।', ['percentage']),

  // ── Logic, combinatorics, graphs ─────────────────────────────────────────
  t(TOPIC_LOGIC, null, 'Logic', 'যুক্তি', 'middle', 3, '🧩', 'violet',
    'Reasoning, statements and puzzles.', 'যুক্তি, উক্তি ও ধাঁধা।'),
  t('logical-reasoning', TOPIC_LOGIC, 'Logical Reasoning', 'যৌক্তিক বিচার', 'middle', 3, '🕵️', 'violet',
    'Sequences of deduction, arrangements and truth puzzles.',
    'অনুমান, সাজানো ও সত্য-মিথ্যা ধাঁধা।'),
  t('set-theory', TOPIC_LOGIC, 'Set Theory', 'সেট', 'secondary', 4, '🫧', 'violet',
    'Sets, Venn diagrams and counting with sets.', 'সেট, ভেনচিত্র ও সেট গণনা।'),
  t(TOPIC_COMBINATORICS, null, 'Combinatorics', 'বিন্যাস ও সমাবেশ', 'higher_secondary', 5, '🎯', 'orange',
    'Counting arrangements and selections.', 'বিন্যাস ও সমাবেশ গণনা।', ['number-theory']),
  t(TOPIC_GRAPH_THEORY, null, 'Graph Theory', 'গ্রাফ তত্ত্ব', 'undergraduate', 7, '🕸️', 'indigo',
    'Vertices, edges, paths and networks.', 'শীর্ষ, প্রান্ত, পথ ও নেটওয়ার্ক।', [TOPIC_COMBINATORICS]),

  // ── Applied & real life ──────────────────────────────────────────────────
  t(TOPIC_APPLIED, null, 'Applied Mathematics', 'প্রয়োগিক গণিত', 'undergraduate', 6, '⚙️', 'orange',
    'Mathematics used in engineering and science.', 'ইঞ্জিনিয়ারিং ও বিজ্ঞানে ব্যবহৃত গণিত।', ['calculus']),
  t('engineering-math', TOPIC_APPLIED, 'Engineering Mathematics', 'ইঞ্জিনিয়ারিং গণিত', 'undergraduate', 7, '🏗️', 'orange',
    'Vectors, differential equations and numerical methods.',
    'ভেক্টর, ডিফারেনশিয়াল সমীকরণ ও সংখ্যাগত পদ্ধতি।', [TOPIC_APPLIED]),
  t('financial-math', TOPIC_APPLIED, 'Financial Mathematics', 'আর্থিক গণিত', 'secondary', 4, '💹', 'amber',
    'Interest, instalments, profit and investment arithmetic.',
    'সুদ, কিস্তি, লাভ ও বিনিয়োগের হিসাব।', ['percentage']),
  t(TOPIC_REAL_LIFE, null, 'Real Life Mathematics', 'বাস্তব জীবনের গণিত', 'foundation', 2, '🛒', 'green',
    'Shopping, budget, travel, cooking and measurement.',
    'বাজার, বাজেট, ভ্রমণ, রান্না ও পরিমাপ।'),
  t('money-shopping', TOPIC_REAL_LIFE, 'Money & Shopping', 'টাকা ও বাজার', 'primary', 2, '🧾', 'green',
    'Prices, change, discounts and VAT.', 'দাম, ফেরত, ছাড় ও ভ্যাট।', ['percentage']),
  t('time-speed-distance', TOPIC_REAL_LIFE, 'Time, Speed & Distance', 'সময়, গতি ও দূরত্ব', 'middle', 3, '🚌', 'teal',
    'Journeys, average speed and relative motion.', 'যাত্রা, গড় গতি ও আপেক্ষিক গতি।', ['ratio-proportion']),
  t('work-time', TOPIC_REAL_LIFE, 'Time & Work', 'সময় ও কাজ', 'middle', 4, '👷', 'teal',
    'Rates of work and combined effort.', 'কাজের হার ও সম্মিলিত কাজ।', ['ratio-proportion']),
  t('measurement', TOPIC_REAL_LIFE, 'Measurement & Units', 'পরিমাপ ও একক', 'primary', 2, '📏', 'orange',
    'Length, weight, volume, unit conversion and estimation.',
    'দৈর্ঘ্য, ওজন, আয়তন, একক রূপান্তর ও আন্দাজ।'),
  t('estimation', TOPIC_REAL_LIFE, 'Estimation', 'আন্দাজ', 'foundation', 2, '🎯', 'amber',
    'Sensible approximation before exact calculation.', 'সঠিক হিসাবের আগে যুক্তিসঙ্গত আন্দাজ।'),
  t('mental-math', TOPIC_REAL_LIFE, 'Mental Math', 'মানসিক গণিত', 'foundation', 2, '⚡', 'blue',
    'Fast strategies for calculating without paper.', 'কাগজ ছাড়াই দ্রুত হিসাবের কৌশল।', ['arithmetic']),
];

const s = (id: string, topicId: string, name: string, nameBn: string): TaxonomySkill => ({
  id,
  topicId,
  name,
  nameBn,
});

export const TAXONOMY_SKILLS: TaxonomySkill[] = [
  s('skill.add-subtract', 'arithmetic', 'Addition & Subtraction', 'যোগ ও বিয়োগ'),
  s('skill.multiply-divide', 'arithmetic', 'Multiplication & Division', 'গুণ ও ভাগ'),
  s('skill.bodmas', 'order-of-operations', 'Order of Operations', 'প্রক্রিয়ার ক্রম'),
  s('skill.place-value', 'place-value', 'Place Value', 'স্থানীয় মান'),
  s('skill.rounding', 'decimals', 'Rounding', 'নিকটবর্তীকরণ'),
  s('skill.fraction-arithmetic', 'fractions', 'Fraction Arithmetic', 'ভগ্নাংশের প্রক্রিয়া'),
  s('skill.fraction-compare', 'fractions', 'Comparing Fractions', 'ভগ্নাংশের তুলনা'),
  s('skill.decimal-arithmetic', 'decimals', 'Decimal Arithmetic', 'দশমিকের প্রক্রিয়া'),
  s('skill.percent-of', 'percentage', 'Percent of a Quantity', 'শতকরা নির্ণয়'),
  s('skill.percent-change', 'percentage', 'Percentage Change', 'শতকরা পরিবর্তন'),
  s('skill.discount-vat', 'money-shopping', 'Discount & VAT', 'ছাড় ও ভ্যাট'),
  s('skill.profit-loss', 'financial-math', 'Profit & Loss', 'লাভ ও ক্ষতি'),
  s('skill.interest', 'financial-math', 'Simple & Compound Interest', 'সরল ও চক্রবৃদ্ধি সুদ'),
  s('skill.ratio-share', 'ratio-proportion', 'Sharing in a Ratio', 'অনুপাতে ভাগ'),
  s('skill.proportion', 'ratio-proportion', 'Direct & Inverse Proportion', 'সরল ও বিপরীত সমানুপাত'),
  s('skill.average', 'average', 'Averages', 'গড়'),
  s('skill.mixture', 'ratio-proportion', 'Mixtures & Alligation', 'মিশ্রণ ও মিশ্রণ বিধি'),
  s('skill.hcf-lcm', 'number-theory', 'HCF & LCM', 'গসাগু ও লসাগু'),
  s('skill.primes', 'number-theory', 'Primes & Factors', 'মৌলিক সংখ্যা ও উৎপাদক'),
  s('skill.divisibility', 'number-theory', 'Divisibility Rules', 'বিভাজ্যতার নিয়ম'),
  s('skill.digits', 'number-theory', 'Digit Problems', 'অঙ্কের সমস্যা'),
  s('skill.modular', 'advanced-number-theory', 'Modular Arithmetic', 'মডুলার গণিত'),
  s('skill.simplify-expression', 'elementary-algebra', 'Simplifying Expressions', 'রাশিমালা সরলীকরণ'),
  s('skill.expand-factorise', 'elementary-algebra', 'Expanding & Factorising', 'বিস্তার ও উৎপাদক'),
  s('skill.substitution', 'elementary-algebra', 'Substitution', 'মান নির্ণয়'),
  s('skill.solve-linear', 'linear-equations', 'Solving Linear Equations', 'সরল সমীকরণ সমাধান'),
  s('skill.word-equation', 'linear-equations', 'Equation Word Problems', 'সমীকরণের শব্দ সমস্যা'),
  s('skill.solve-simultaneous', 'simultaneous-equations', 'Solving Systems', 'সমীকরণজোট সমাধান'),
  s('skill.solve-quadratic', 'quadratic-equations', 'Solving Quadratics', 'দ্বিঘাত সমাধান'),
  s('skill.discriminant', 'quadratic-equations', 'Discriminant', 'নিশ্চায়ক'),
  s('skill.polynomial-roots', 'polynomials', 'Roots & Factor Theorem', 'বীজ ও উৎপাদক উপপাদ্য'),
  s('skill.indices', 'indices-logarithms', 'Laws of Indices', 'সূচকের সূত্র'),
  s('skill.logarithms', 'indices-logarithms', 'Logarithms', 'লগারিদম'),
  s('skill.ap', 'sequences-series', 'Arithmetic Progression', 'সমান্তর ধারা'),
  s('skill.gp', 'sequences-series', 'Geometric Progression', 'গুণোত্তর ধারা'),
  s('skill.pattern', 'sequences-series', 'Number Patterns', 'সংখ্যা প্যাটার্ন'),
  s('skill.matrix-ops', 'linear-algebra', 'Matrix Operations', 'ম্যাট্রিক্স প্রক্রিয়া'),
  s('skill.determinant', 'linear-algebra', 'Determinants', 'নির্ণায়ক'),
  s('skill.angle-rules', 'angles', 'Angle Rules', 'কোণের নিয়ম'),
  s('skill.triangle-properties', 'triangles', 'Triangle Properties', 'ত্রিভুজের বৈশিষ্ট্য'),
  s('skill.pythagoras', 'triangles', 'Pythagoras', 'পিথাগোরাস'),
  s('skill.circle-theorems', 'circles', 'Circle Theorems', 'বৃত্তের উপপাদ্য'),
  s('skill.area-perimeter', 'mensuration', 'Area & Perimeter', 'ক্ষেত্রফল ও পরিসীমা'),
  s('skill.volume-surface', 'mensuration', 'Volume & Surface Area', 'আয়তন ও পৃষ্ঠতল'),
  s('skill.coordinate-distance', 'coordinate-geometry', 'Distance & Midpoint', 'দূরত্ব ও মধ্যবিন্দু'),
  s('skill.straight-line', 'coordinate-geometry', 'Straight Line', 'সরলরেখা'),
  s('skill.trig-ratios', 'trigonometry', 'Trigonometric Ratios', 'ত্রিকোণমিতিক অনুপাত'),
  s('skill.trig-identities', 'trigonometry', 'Trigonometric Identities', 'ত্রিকোণমিতিক অভেদ'),
  s('skill.heights-distances', 'trigonometry', 'Heights & Distances', 'উচ্চতা ও দূরত্ব'),
  s('skill.limits', 'calculus', 'Limits', 'সীমা'),
  s('skill.derivative', 'differentiation', 'Derivatives', 'অন্তরজ'),
  s('skill.integral', 'integration', 'Integrals', 'সমাকলন'),
  s('skill.probability-basic', 'basic-probability', 'Simple Probability', 'সরল সম্ভাব্যতা'),
  s('skill.probability-compound', 'conditional-probability', 'Compound Probability', 'যৌগিক সম্ভাব্যতা'),
  s('skill.permutation', TOPIC_COMBINATORICS, 'Permutations', 'বিন্যাস'),
  s('skill.combination', TOPIC_COMBINATORICS, 'Combinations', 'সমাবেশ'),
  s('skill.central-tendency', 'descriptive-statistics', 'Mean, Median, Mode', 'গড়, মধ্যক, প্রচুরক'),
  s('skill.spread', 'descriptive-statistics', 'Range & Deviation', 'বিস্তার ও বিচ্যুতি'),
  s('skill.chart-reading', 'data-interpretation', 'Reading Charts', 'লেখচিত্র পাঠ'),
  s('skill.deduction', 'logical-reasoning', 'Deduction', 'অনুমান'),
  s('skill.arrangement', 'logical-reasoning', 'Arrangement Puzzles', 'সাজানোর ধাঁধা'),
  s('skill.sets', 'set-theory', 'Sets & Venn Diagrams', 'সেট ও ভেনচিত্র'),
  s('skill.graph-basics', TOPIC_GRAPH_THEORY, 'Graphs & Degrees', 'গ্রাফ ও মাত্রা'),
  s('skill.unit-conversion', 'measurement', 'Unit Conversion', 'একক রূপান্তর'),
  s('skill.estimate', 'estimation', 'Estimation Strategy', 'আন্দাজের কৌশল'),
  s('skill.mental-strategy', 'mental-math', 'Mental Strategies', 'মানসিক কৌশল'),
  s('skill.speed-distance', 'time-speed-distance', 'Speed, Time & Distance', 'গতি, সময় ও দূরত্ব'),
  s('skill.work-rate', 'work-time', 'Work Rate', 'কাজের হার'),
  s('skill.age-problems', 'linear-equations', 'Age Problems', 'বয়সের সমস্যা'),
  s('skill.money-sense', 'money-shopping', 'Money Sense', 'টাকার হিসাব'),
  s('skill.budget', 'money-shopping', 'Budgeting', 'বাজেট'),
];

const TOPIC_BY_ID = new Map(TAXONOMY_TOPICS.map((topic) => [topic.id, topic]));
const SKILL_BY_ID = new Map(TAXONOMY_SKILLS.map((skill) => [skill.id, skill]));

export function taxonomyTopic(id: string): TaxonomyTopic | undefined {
  return TOPIC_BY_ID.get(id);
}

export function taxonomySkill(id: string): TaxonomySkill | undefined {
  return SKILL_BY_ID.get(id);
}

export function topicExists(id: string): boolean {
  return TOPIC_BY_ID.has(id);
}

export function skillExists(id: string): boolean {
  return SKILL_BY_ID.has(id);
}

/** Root-to-leaf path, used for breadcrumbs and mastery roll-up. */
export function topicPath(id: string): TaxonomyTopic[] {
  const out: TaxonomyTopic[] = [];
  let current = TOPIC_BY_ID.get(id);
  while (current) {
    out.unshift(current);
    current = current.parentId ? TOPIC_BY_ID.get(current.parentId) : undefined;
  }
  return out;
}

export function childTopicIds(parentId: string | null): string[] {
  return TAXONOMY_TOPICS.filter((topic) => topic.parentId === parentId).map((topic) => topic.id);
}

export function descendantTopicIds(rootId: string): string[] {
  const out: string[] = [rootId];
  for (const child of childTopicIds(rootId)) out.push(...descendantTopicIds(child));
  return out;
}

export function skillsForTopic(topicId: string): TaxonomySkill[] {
  return TAXONOMY_SKILLS.filter((skill) => skill.topicId === topicId);
}
