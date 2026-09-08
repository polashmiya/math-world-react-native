import type { BrainCategory } from '../constants/categories';
import { clampDifficulty } from '../constants/difficulty';
import { QuestionGenerationError } from '../errors';
import { createRng, type Rng } from '../utils/random';
import type { ID, Question } from '../../domain/models';
import { ALGEBRA_GENERATORS } from './generators/algebra';
import { ARITHMETIC_GENERATORS } from './generators/arithmetic';
import { BRAIN_GENERATORS } from './generators/brain';
import { DATA_CHANCE_GENERATORS } from './generators/dataChance';
import { FRACTION_GENERATORS } from './generators/fractions';
import { GEOMETRY_GENERATORS } from './generators/geometry';
import { LOGIC_DISCRETE_GENERATORS } from './generators/logicDiscrete';
import { NUMBER_THEORY_GENERATORS } from './generators/numberTheory';
import { PERCENTAGE_GENERATORS } from './generators/percentage';
import { RATE_TIME_GENERATORS } from './generators/rateTime';
import { RATIO_GENERATORS } from './generators/ratio';
import { TRIG_CALCULUS_GENERATORS } from './generators/trigCalculus';
import { contextFor, type QuestionGenerator } from './types';

/** Every generator the app ships with (spec §14). */
export const ALL_GENERATORS: QuestionGenerator[] = [
  ...ARITHMETIC_GENERATORS,
  ...FRACTION_GENERATORS,
  ...PERCENTAGE_GENERATORS,
  ...RATIO_GENERATORS,
  ...RATE_TIME_GENERATORS,
  ...ALGEBRA_GENERATORS,
  ...GEOMETRY_GENERATORS,
  ...TRIG_CALCULUS_GENERATORS,
  ...NUMBER_THEORY_GENERATORS,
  ...DATA_CHANCE_GENERATORS,
  ...LOGIC_DISCRETE_GENERATORS,
  ...BRAIN_GENERATORS,
];

const BY_ID = new Map<string, QuestionGenerator>();
const BY_TOPIC = new Map<ID, QuestionGenerator[]>();
const BY_SKILL = new Map<ID, QuestionGenerator[]>();
const BY_EXAM = new Map<ID, QuestionGenerator[]>();
const BY_BRAIN = new Map<BrainCategory, QuestionGenerator[]>();

function index(): void {
  for (const generator of ALL_GENERATORS) {
    if (BY_ID.has(generator.id)) {
      throw new QuestionGenerationError('Duplicate generator id: ' + generator.id);
    }
    BY_ID.set(generator.id, generator);
    push(BY_TOPIC, generator.topicId, generator);
    if (generator.subtopicId) push(BY_TOPIC, generator.subtopicId, generator);
    for (const skill of generator.skillIds) push(BY_SKILL, skill, generator);
    for (const exam of generator.examIds ?? []) push(BY_EXAM, exam, generator);
    if (generator.brainCategory) push(BY_BRAIN, generator.brainCategory, generator);
  }
}

function push<K>(map: Map<K, QuestionGenerator[]>, key: K, generator: QuestionGenerator): void {
  const list = map.get(key) ?? [];
  list.push(generator);
  map.set(key, list);
}

index();

export function getGenerator(id: string): QuestionGenerator | undefined {
  return BY_ID.get(id);
}

export function generatorsForTopic(topicId: ID): QuestionGenerator[] {
  return BY_TOPIC.get(topicId) ?? [];
}

export function generatorsForSkill(skillId: ID): QuestionGenerator[] {
  return BY_SKILL.get(skillId) ?? [];
}

export function generatorsForExam(examId: ID): QuestionGenerator[] {
  return BY_EXAM.get(examId) ?? [];
}

export function generatorsForBrainCategory(category: BrainCategory): QuestionGenerator[] {
  return BY_BRAIN.get(category) ?? [];
}

export interface GenerateRequest {
  count: number;
  difficulty: number;
  topicIds?: ID[];
  skillIds?: ID[];
  examIds?: ID[];
  brainCategories?: BrainCategory[];
  generatorIds?: string[];
  /** Deterministic seed; the same seed always produces the same set. */
  seed?: string | number;
  /** Ids already used in this session, avoided where possible. */
  excludeIds?: ID[];
  /** Spread difficulty across the batch (used by boss battles and challenges). */
  difficultyRamp?: { from: number; to: number };
}

/** Candidate generators for a request, honouring difficulty bounds. */
export function candidateGenerators(request: GenerateRequest): QuestionGenerator[] {
  const pools: QuestionGenerator[][] = [];
  if (request.generatorIds?.length) {
    pools.push(request.generatorIds.map((id) => BY_ID.get(id)).filter((g): g is QuestionGenerator => !!g));
  }
  if (request.topicIds?.length) {
    pools.push(request.topicIds.flatMap((id) => generatorsForTopic(id)));
  }
  if (request.skillIds?.length) {
    pools.push(request.skillIds.flatMap((id) => generatorsForSkill(id)));
  }
  if (request.examIds?.length) {
    pools.push(request.examIds.flatMap((id) => generatorsForExam(id)));
  }
  if (request.brainCategories?.length) {
    pools.push(request.brainCategories.flatMap((c) => generatorsForBrainCategory(c)));
  }

  const merged = pools.length === 0 ? ALL_GENERATORS.slice() : pools.flat();
  const unique = Array.from(new Map(merged.map((g) => [g.id, g])).values());

  const target = clampDifficulty(request.difficulty);
  const inRange = unique.filter((g) => target >= g.minDifficulty && target <= g.maxDifficulty);
  if (inRange.length > 0) return inRange;
  // Fall back to the generators whose range is closest to the request.
  return unique
    .slice()
    .sort(
      (a, b) =>
        distanceToRange(target, a.minDifficulty, a.maxDifficulty) -
        distanceToRange(target, b.minDifficulty, b.maxDifficulty),
    )
    .slice(0, Math.max(1, Math.min(unique.length, 8)));
}

function distanceToRange(value: number, min: number, max: number): number {
  if (value < min) return min - value;
  if (value > max) return value - max;
  return 0;
}

/**
 * Generates a batch of unique questions. Deterministic for a given seed, and
 * resilient: a failing generator is skipped rather than failing the whole set
 * (spec §54 — a bad question must never crash the app).
 */
export function generateQuestions(request: GenerateRequest): Question[] {
  const pool = candidateGenerators(request);
  if (pool.length === 0) {
    throw new QuestionGenerationError('No generator matches this request', { request });
  }

  const seed = request.seed ?? Date.now();
  const rng: Rng = createRng(typeof seed === 'number' ? seed : seed);
  const out: Question[] = [];
  const seen = new Set<ID>(request.excludeIds ?? []);
  const failures = new Map<string, number>();

  const attempts = Math.max(request.count * 12, 48);
  for (let i = 0; i < attempts && out.length < request.count; i++) {
    const generator = pool[rng.int(0, pool.length - 1)];
    const difficulty = difficultyForIndex(request, out.length);
    const context = contextFor(String(seed) + ':' + generator.id + ':' + i, difficulty);
    let question: Question;
    try {
      question = generator.generate(context);
    } catch {
      failures.set(generator.id, (failures.get(generator.id) ?? 0) + 1);
      continue;
    }
    if (seen.has(question.id)) continue;
    seen.add(question.id);
    out.push(question);
  }

  if (out.length === 0) {
    throw new QuestionGenerationError('Every generator failed for this request', {
      request,
      failures: Object.fromEntries(failures),
    });
  }
  return out;
}

function difficultyForIndex(request: GenerateRequest, index: number): number {
  if (!request.difficultyRamp) return request.difficulty;
  const { from, to } = request.difficultyRamp;
  const span = Math.max(1, request.count - 1);
  return clampDifficulty(from + ((to - from) * index) / span);
}

/** Regenerates a question exactly, so a saved attempt can be replayed. */
export function regenerate(generatorId: string, difficulty: number, seed: string): Question | null {
  const generator = BY_ID.get(generatorId);
  if (!generator) return null;
  try {
    return generator.generate(contextFor(seed, difficulty));
  } catch {
    return null;
  }
}

export function generatorCount(): number {
  return ALL_GENERATORS.length;
}

export function generatorSummary(): { id: string; topicId: ID; range: string }[] {
  return ALL_GENERATORS.map((g) => ({
    id: g.id,
    topicId: g.topicId,
    range: g.minDifficulty + '-' + g.maxDifficulty,
  }));
}
