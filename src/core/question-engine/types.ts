import type { BrainCategory } from '../constants/categories';
import type { CurriculumCode } from '../constants/levels';
import type {
  ID,
  Question,
  QuestionOption,
  QuestionType,
  SolutionStep,
} from '../../domain/models';
import { clampDifficulty, estimatedSecondsForDifficulty, pointsForDifficulty } from '../constants/difficulty';
import { CURRENT_CONTENT_VERSION } from '../../domain/models/common';
import { QuestionGenerationError } from '../errors';
import { deterministicId } from '../utils/id';
import { createRng, type Rng } from '../utils/random';

export interface GenerationContext {
  rng: Rng;
  /** 1..9 target difficulty. */
  difficulty: number;
  /** Stable seed component so the same request replays identically. */
  seed: string;
}

/**
 * What a generator author writes. The registry turns it into a full `Question`
 * so every generator produces consistent metadata (spec §14).
 */
export interface QuestionDraft {
  prompt: string;
  promptBn: string;
  correctAnswer: string;
  /** Distractors for choice questions; the helper shuffles and labels them. */
  choices?: string[];
  options?: QuestionOption[];
  acceptedAnswers?: string[];
  tolerance?: number;
  solutionSteps: SolutionStep[];
  explanation?: string;
  explanationBn?: string;
  hints?: string[];
  hintsBn?: string[];
  /**
   * Values that uniquely identify this instance; used for the stable id.
   * `undefined` entries are dropped, so branchy generators can share one shape.
   */
  params: Record<string, number | string | undefined>;
  questionType?: QuestionType;
  tags?: string[];
}

export interface GeneratorConfig {
  id: string;
  topicId: ID;
  subtopicId?: ID;
  skillIds: ID[];
  questionType: QuestionType;
  brainCategory?: BrainCategory;
  tags?: string[];
  examIds?: ID[];
  curriculumIds?: CurriculumCode[];
  minDifficulty: number;
  maxDifficulty: number;
  /** Short label shown in generator pickers and analytics. */
  name: string;
  nameBn: string;
}

export interface QuestionGenerator extends GeneratorConfig {
  generate(context: GenerationContext): Question;
}

export type DraftBuilder = (context: GenerationContext) => QuestionDraft;

function buildSteps(steps: (SolutionStep | string)[]): SolutionStep[] {
  return steps.map((s, index) =>
    typeof s === 'string' ? { order: index + 1, detail: s } : { ...s, order: index + 1 },
  );
}

export function step(detail: string, title?: string, expression?: string): SolutionStep {
  return { order: 0, detail, title, expression };
}

/**
 * Wraps a draft builder into a generator that emits fully-formed questions
 * with stable, deterministic ids.
 */
export function defineGenerator(config: GeneratorConfig, build: DraftBuilder): QuestionGenerator {
  return {
    ...config,
    tags: config.tags ?? [],
    examIds: config.examIds ?? [],
    curriculumIds: config.curriculumIds ?? ['bangladesh', 'international'],
    generate(context: GenerationContext): Question {
      const difficulty = clampDifficulty(context.difficulty);
      let draft: QuestionDraft;
      try {
        draft = build({ ...context, difficulty });
      } catch (error) {
        throw new QuestionGenerationError(
          'Generator ' + config.id + ' failed: ' + (error instanceof Error ? error.message : String(error)),
          { generatorId: config.id, difficulty },
        );
      }

      const params: Record<string, number | string> = {};
      for (const key of Object.keys(draft.params).sort()) {
        const value = draft.params[key];
        if (value !== undefined) params[key] = value;
      }
      const paramParts = Object.keys(params).map((key) => key + '-' + params[key]);
      const id = deterministicId('gen', config.id, difficulty, ...paramParts);

      const questionType = draft.questionType ?? config.questionType;
      const options = buildOptions(draft, questionType, context.rng);
      const correctAnswer = resolveCorrectAnswer(draft, options);

      return {
        id,
        topicId: config.topicId,
        subtopicId: config.subtopicId ?? null,
        skillIds: config.skillIds,
        difficulty,
        questionType,
        curriculumIds: config.curriculumIds ?? ['bangladesh', 'international'],
        examIds: config.examIds ?? [],
        tags: [...(config.tags ?? []), ...(draft.tags ?? [])],
        brainCategory: config.brainCategory ?? null,
        prompt: draft.prompt,
        promptBn: draft.promptBn,
        options,
        correctAnswer,
        acceptedAnswers: draft.acceptedAnswers,
        tolerance: draft.tolerance,
        solutionSteps: buildSteps(draft.solutionSteps),
        explanation: draft.explanation,
        explanationBn: draft.explanationBn,
        hints: draft.hints,
        hintsBn: draft.hintsBn,
        estimatedTimeSeconds: estimatedSecondsForDifficulty(difficulty),
        points: pointsForDifficulty(difficulty),
        source: 'generated',
        generatorId: config.id,
        generatorParams: params,
        year: null,
        questionVersion: 1,
        contentVersion: CURRENT_CONTENT_VERSION,
      };
    },
  };
}

function buildOptions(
  draft: QuestionDraft,
  questionType: QuestionType,
  rng: Rng,
): QuestionOption[] | undefined {
  if (draft.options) return draft.options;
  if (questionType === 'true_false') {
    return [
      { id: 'true', text: 'True', textBn: 'সত্য' },
      { id: 'false', text: 'False', textBn: 'মিথ্যা' },
    ];
  }
  if (!draft.choices || draft.choices.length === 0) return undefined;

  const unique: string[] = [];
  for (const choice of [draft.correctAnswer, ...draft.choices]) {
    if (!unique.includes(choice)) unique.push(choice);
  }
  if (unique.length < 2) {
    throw new QuestionGenerationError('A choice question needs at least two distinct options');
  }
  return rng.shuffle(unique).map((text, index) => ({ id: 'opt' + index, text }));
}

function resolveCorrectAnswer(draft: QuestionDraft, options?: QuestionOption[]): string {
  if (!options) return draft.correctAnswer;
  const match = options.find((o) => o.text === draft.correctAnswer);
  if (match) return match.id;
  // true/false questions answer with the literal option id
  if (options.some((o) => o.id === draft.correctAnswer)) return draft.correctAnswer;
  throw new QuestionGenerationError('The correct answer is missing from the option list', {
    correctAnswer: draft.correctAnswer,
  });
}

export function contextFor(seed: string, difficulty: number): GenerationContext {
  return { rng: createRng(seed), difficulty: clampDifficulty(difficulty), seed };
}
