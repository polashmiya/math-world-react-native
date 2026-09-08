/** Academic level is separate from difficulty (spec §11). */
export type AcademicLevel =
  | 'foundation'
  | 'primary'
  | 'middle'
  | 'secondary'
  | 'higher_secondary'
  | 'undergraduate'
  | 'graduate'
  | 'advanced'
  | 'expert';

export const ACADEMIC_LEVELS: readonly AcademicLevel[] = [
  'foundation',
  'primary',
  'middle',
  'secondary',
  'higher_secondary',
  'undergraduate',
  'graduate',
  'advanced',
  'expert',
];

export const ACADEMIC_LEVEL_LABELS: Record<AcademicLevel, { en: string; bn: string }> = {
  foundation: { en: 'Foundation', bn: 'ভিত্তি' },
  primary: { en: 'Primary', bn: 'প্রাথমিক' },
  middle: { en: 'Middle School', bn: 'মাধ্যমিক পূর্ব' },
  secondary: { en: 'Secondary', bn: 'মাধ্যমিক' },
  higher_secondary: { en: 'Higher Secondary', bn: 'উচ্চ মাধ্যমিক' },
  undergraduate: { en: 'Undergraduate', bn: 'স্নাতক' },
  graduate: { en: 'Graduate', bn: 'স্নাতকোত্তর' },
  advanced: { en: 'Advanced', bn: 'উন্নত' },
  expert: { en: 'Expert', bn: 'বিশেষজ্ঞ' },
};

export type CurriculumCode = 'bangladesh' | 'cambridge' | 'ib' | 'international' | 'custom';

export const CURRICULUM_CODES: readonly CurriculumCode[] = [
  'bangladesh',
  'cambridge',
  'ib',
  'international',
  'custom',
];

/** Exam families the Competitive Exam Hub ships with (spec §23). */
export type ExamFamily =
  | 'school'
  | 'admission'
  | 'bcs'
  | 'bank'
  | 'ntrca'
  | 'govt'
  | 'olympiad'
  | 'custom';

export const EXAM_FAMILIES: readonly ExamFamily[] = [
  'school',
  'admission',
  'bcs',
  'bank',
  'ntrca',
  'govt',
  'olympiad',
  'custom',
];

/** Language codes; Bangla is the primary language (spec §45). */
export type Language = 'bn' | 'en';
export const LANGUAGES: readonly Language[] = ['bn', 'en'];
export const DEFAULT_LANGUAGE: Language = 'bn';
