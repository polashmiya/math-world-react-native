import type { ID } from './common';

/** Lesson flow required by spec §32. */
export type LessonSectionKind =
  | 'concept'
  | 'visual'
  | 'simple_example'
  | 'worked_example'
  | 'practice'
  | 'challenge'
  | 'mastery_test';

export const LESSON_SECTION_ORDER: readonly LessonSectionKind[] = [
  'concept',
  'visual',
  'simple_example',
  'worked_example',
  'practice',
  'challenge',
  'mastery_test',
];

export const LESSON_SECTION_LABELS: Record<LessonSectionKind, { en: string; bn: string; emoji: string }> = {
  concept: { en: 'Concept', bn: 'ধারণা', emoji: '💡' },
  visual: { en: 'Visual Explanation', bn: 'চিত্রে ব্যাখ্যা', emoji: '🖼️' },
  simple_example: { en: 'Simple Example', bn: 'সহজ উদাহরণ', emoji: '🌱' },
  worked_example: { en: 'Worked Example', bn: 'সমাধানসহ উদাহরণ', emoji: '📝' },
  practice: { en: 'Practice', bn: 'অভ্যাস', emoji: '🏋️' },
  challenge: { en: 'Challenge', bn: 'চ্যালেঞ্জ', emoji: '🔥' },
  mastery_test: { en: 'Mastery Test', bn: 'দক্ষতা যাচাই', emoji: '🏅' },
};

export interface LessonSection {
  kind: LessonSectionKind;
  title: string;
  titleBn: string;
  body: string;
  bodyBn: string;
  /** Optional display expression, e.g. `a² - b² = (a+b)(a-b)`. */
  expression?: string;
  /** Optional simple bar/point diagram data for the visual section. */
  visual?: LessonVisual;
}

export interface LessonVisual {
  kind: 'bars' | 'fraction' | 'numberline' | 'shape';
  /** Values interpreted by the renderer for the given kind. */
  values: number[];
  labels?: string[];
  caption?: string;
  captionBn?: string;
}

export interface Lesson {
  id: ID;
  topicId: ID;
  skillIds: ID[];
  title: string;
  titleBn: string;
  summary: string;
  summaryBn: string;
  orderIndex: number;
  estimatedMinutes: number;
  sections: LessonSection[];
  /** Questions used for the in-lesson practice/mastery blocks. */
  practiceGeneratorIds: string[];
  contentVersion: number;
}

export interface Example {
  id: ID;
  lessonId?: ID | null;
  topicId: ID;
  prompt: string;
  promptBn: string;
  steps: string[];
  stepsBn: string[];
  answer: string;
  contentVersion: number;
}
