/** Daily Brain Math categories (spec §20). Not exam preparation. */
export type BrainCategory =
  | 'mental_math'
  | 'money_math'
  | 'estimation'
  | 'time'
  | 'speed'
  | 'measurement'
  | 'logic'
  | 'probability'
  | 'pattern'
  | 'number_sense'
  | 'visual_math'
  | 'data_interpretation'
  | 'strategy'
  | 'critical_thinking';

export const BRAIN_CATEGORIES: readonly BrainCategory[] = [
  'mental_math',
  'money_math',
  'estimation',
  'time',
  'speed',
  'measurement',
  'logic',
  'probability',
  'pattern',
  'number_sense',
  'visual_math',
  'data_interpretation',
  'strategy',
  'critical_thinking',
];

export const BRAIN_CATEGORY_META: Record<
  BrainCategory,
  { en: string; bn: string; emoji: string; dailyTarget: number }
> = {
  mental_math: { en: 'Mental Math', bn: 'মানসিক গণিত', emoji: '⚡', dailyTarget: 5 },
  money_math: { en: 'Money Math', bn: 'টাকার গণিত', emoji: '💰', dailyTarget: 5 },
  estimation: { en: 'Estimation', bn: 'আন্দাজ', emoji: '🎯', dailyTarget: 3 },
  time: { en: 'Time', bn: 'সময়', emoji: '⏰', dailyTarget: 2 },
  speed: { en: 'Speed', bn: 'গতি', emoji: '🏃', dailyTarget: 2 },
  measurement: { en: 'Measurement', bn: 'পরিমাপ', emoji: '📏', dailyTarget: 2 },
  logic: { en: 'Logic', bn: 'যুক্তি', emoji: '🧩', dailyTarget: 4 },
  probability: { en: 'Probability', bn: 'সম্ভাব্যতা', emoji: '🎲', dailyTarget: 2 },
  pattern: { en: 'Pattern', bn: 'প্যাটার্ন', emoji: '🔷', dailyTarget: 3 },
  number_sense: { en: 'Number Sense', bn: 'সংখ্যাজ্ঞান', emoji: '🔢', dailyTarget: 3 },
  visual_math: { en: 'Visual Math', bn: 'দৃশ্য গণিত', emoji: '👁️', dailyTarget: 3 },
  data_interpretation: {
    en: 'Data Interpretation',
    bn: 'তথ্য বিশ্লেষণ',
    emoji: '📊',
    dailyTarget: 2,
  },
  strategy: { en: 'Strategy', bn: 'কৌশল', emoji: '♟️', dailyTarget: 2 },
  critical_thinking: { en: 'Critical Thinking', bn: 'সমালোচনামূলক চিন্তা', emoji: '🤔', dailyTarget: 2 },
};

/** Mathematical Thinking Score dimensions (spec §30). Never called IQ. */
export type ThinkingDimension =
  | 'calculation'
  | 'estimation'
  | 'logic'
  | 'pattern_recognition'
  | 'spatial_thinking'
  | 'probability'
  | 'problem_solving'
  | 'mathematical_reasoning';

export const THINKING_DIMENSIONS: readonly ThinkingDimension[] = [
  'calculation',
  'estimation',
  'logic',
  'pattern_recognition',
  'spatial_thinking',
  'probability',
  'problem_solving',
  'mathematical_reasoning',
];

export const THINKING_DIMENSION_LABELS: Record<ThinkingDimension, { en: string; bn: string }> = {
  calculation: { en: 'Calculation', bn: 'গণনা' },
  estimation: { en: 'Estimation', bn: 'আন্দাজ' },
  logic: { en: 'Logic', bn: 'যুক্তি' },
  pattern_recognition: { en: 'Pattern Recognition', bn: 'প্যাটার্ন চিনা' },
  spatial_thinking: { en: 'Spatial Thinking', bn: 'স্থানিক চিন্তা' },
  probability: { en: 'Probability', bn: 'সম্ভাব্যতা' },
  problem_solving: { en: 'Problem Solving', bn: 'সমস্যা সমাধান' },
  mathematical_reasoning: { en: 'Mathematical Reasoning', bn: 'গাণিতিক যুক্তি' },
};

/** Maps a brain category onto the thinking dimension it exercises. */
export const CATEGORY_TO_DIMENSION: Record<BrainCategory, ThinkingDimension> = {
  mental_math: 'calculation',
  money_math: 'problem_solving',
  estimation: 'estimation',
  time: 'problem_solving',
  speed: 'problem_solving',
  measurement: 'spatial_thinking',
  logic: 'logic',
  probability: 'probability',
  pattern: 'pattern_recognition',
  number_sense: 'calculation',
  visual_math: 'spatial_thinking',
  data_interpretation: 'mathematical_reasoning',
  strategy: 'mathematical_reasoning',
  critical_thinking: 'logic',
};

/** Formula library categories (spec §27). */
export const FORMULA_CATEGORIES = [
  'arithmetic',
  'algebra',
  'geometry',
  'mensuration',
  'trigonometry',
  'coordinate_geometry',
  'probability',
  'statistics',
  'calculus',
  'linear_algebra',
  'discrete_math',
  'physics_math',
  'financial_math',
] as const;

export type FormulaCategory = (typeof FORMULA_CATEGORIES)[number];

export const FORMULA_CATEGORY_LABELS: Record<FormulaCategory, { en: string; bn: string }> = {
  arithmetic: { en: 'Arithmetic', bn: 'পাটিগণিত' },
  algebra: { en: 'Algebra', bn: 'বীজগণিত' },
  geometry: { en: 'Geometry', bn: 'জ্যামিতি' },
  mensuration: { en: 'Mensuration', bn: 'পরিমিতি' },
  trigonometry: { en: 'Trigonometry', bn: 'ত্রিকোণমিতি' },
  coordinate_geometry: { en: 'Coordinate Geometry', bn: 'স্থানাঙ্ক জ্যামিতি' },
  probability: { en: 'Probability', bn: 'সম্ভাব্যতা' },
  statistics: { en: 'Statistics', bn: 'পরিসংখ্যান' },
  calculus: { en: 'Calculus', bn: 'ক্যালকুলাস' },
  linear_algebra: { en: 'Linear Algebra', bn: 'রৈখিক বীজগণিত' },
  discrete_math: { en: 'Discrete Mathematics', bn: 'বিচ্ছিন্ন গণিত' },
  physics_math: { en: 'Physics Mathematics', bn: 'পদার্থ গণিত' },
  financial_math: { en: 'Financial Mathematics', bn: 'আর্থিক গণিত' },
};

/** Offline tournament tiers (spec §35). */
export const TOURNAMENT_TIERS = ['bronze', 'silver', 'gold', 'diamond', 'master'] as const;
export type TournamentTier = (typeof TOURNAMENT_TIERS)[number];

export const TIER_THRESHOLDS: Record<TournamentTier, number> = {
  bronze: 0,
  silver: 2500,
  gold: 8000,
  diamond: 20000,
  master: 50000,
};

export function tierForXp(xp: number): TournamentTier {
  let tier: TournamentTier = 'bronze';
  for (const t of TOURNAMENT_TIERS) {
    if (xp >= TIER_THRESHOLDS[t]) tier = t;
  }
  return tier;
}
