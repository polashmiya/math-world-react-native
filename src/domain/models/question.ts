import type { BrainCategory } from '../../core/constants/categories';
import type { CurriculumCode } from '../../core/constants/levels';
import type { ID } from './common';

/** Every question shape the platform is designed to carry (spec §13). */
export type QuestionType =
  | 'mcq'
  | 'multi_select'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'numeric'
  | 'equation'
  | 'expression'
  | 'matching'
  | 'ordering'
  | 'drag_drop'
  | 'find_error'
  | 'missing_number'
  | 'proof'
  | 'word_problem'
  | 'graph_interpretation'
  | 'geometry_construction'
  | 'logic_puzzle'
  | 'pattern'
  | 'estimation'
  | 'mental_math';

export const QUESTION_TYPES: readonly QuestionType[] = [
  'mcq',
  'multi_select',
  'true_false',
  'fill_blank',
  'short_answer',
  'numeric',
  'equation',
  'expression',
  'matching',
  'ordering',
  'drag_drop',
  'find_error',
  'missing_number',
  'proof',
  'word_problem',
  'graph_interpretation',
  'geometry_construction',
  'logic_puzzle',
  'pattern',
  'estimation',
  'mental_math',
];

/** Types answered by picking from a fixed option list. */
export const CHOICE_QUESTION_TYPES: readonly QuestionType[] = [
  'mcq',
  'multi_select',
  'true_false',
  'find_error',
  'matching',
  'ordering',
  'drag_drop',
  'graph_interpretation',
  'logic_puzzle',
];

export interface QuestionOption {
  id: string;
  text: string;
  textBn?: string;
}

export interface SolutionStep {
  order: number;
  title?: string;
  titleBn?: string;
  detail: string;
  detailBn?: string;
  /** Optional standalone maths expression rendered in monospace. */
  expression?: string;
}

export type QuestionSource = 'static' | 'generated';

/**
 * Question metadata (spec §15). Heavy shared text (explanations, solution
 * templates) is referenced by skill/generator id rather than duplicated across
 * thousands of rows (spec §44).
 */
export interface Question {
  id: ID;
  topicId: ID;
  subtopicId?: ID | null;
  skillIds: ID[];
  /** 1..9, independent of academic level. */
  difficulty: number;
  questionType: QuestionType;
  curriculumIds: CurriculumCode[];
  examIds: ID[];
  tags: string[];
  brainCategory?: BrainCategory | null;
  prompt: string;
  promptBn?: string;
  options?: QuestionOption[];
  /** Canonical answer. For multi_select, a comma-joined sorted option id list. */
  correctAnswer: string;
  /** Extra spellings/forms accepted by the validator. */
  acceptedAnswers?: string[];
  /** Numeric tolerance for numeric/estimation answers. */
  tolerance?: number;
  solutionSteps: SolutionStep[];
  explanation?: string;
  explanationBn?: string;
  hints?: string[];
  hintsBn?: string[];
  estimatedTimeSeconds?: number;
  points?: number;
  source: QuestionSource;
  generatorId?: string | null;
  /** Parameters that produced a generated question, for deterministic replay. */
  generatorParams?: Record<string, number | string> | null;
  year?: number | null;
  questionVersion: number;
  contentVersion: number;
}

export interface QuestionFilter {
  topicIds?: ID[];
  subtopicIds?: ID[];
  skillIds?: ID[];
  questionTypes?: QuestionType[];
  curriculumIds?: CurriculumCode[];
  examIds?: ID[];
  tags?: string[];
  brainCategories?: BrainCategory[];
  difficultyMin?: number;
  difficultyMax?: number;
  years?: number[];
  /** `true` = only questions the user already answered correctly at least once. */
  solved?: boolean;
  excludeQuestionIds?: ID[];
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'difficulty' | 'random' | 'natural';
  /** Makes `orderBy: 'random'` reproducible. */
  seed?: number | string;
}

export function optionLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

export function isChoiceQuestion(question: Question): boolean {
  return CHOICE_QUESTION_TYPES.includes(question.questionType) && !!question.options?.length;
}
