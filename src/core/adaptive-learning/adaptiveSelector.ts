import type { BrainCategory } from '../constants/categories';
import { clampDifficulty } from '../constants/difficulty';
import { generateQuestions, type GenerateRequest } from '../question-engine/registry';
import { nextDifficulty } from '../question-engine/difficultyEngine';
import { prioritiseQueue } from '../spaced-repetition/scheduler';
import { unique } from '../utils/array';
import type {
  ID,
  Mistake,
  Question,
  QuestionAttempt,
  ReviewItem,
  SkillProgress,
  TopicProgress,
} from '../../domain/models';

/**
 * Turns performance history into the next set of questions (spec §16).
 *
 *   previous performance + mistakes + speed + skill gaps + difficulty +
 *   spaced repetition  →  next questions
 */
export interface AdaptivePlanInput {
  count: number;
  topicIds?: ID[];
  skillIds?: ID[];
  examIds?: ID[];
  brainCategories?: BrainCategory[];
  recentAttempts: readonly QuestionAttempt[];
  topicProgress: readonly TopicProgress[];
  skillProgress: readonly SkillProgress[];
  openMistakes: readonly Mistake[];
  dueReviews: readonly ReviewItem[];
  /** Difficulty the learner is currently working at. */
  currentDifficulty: number;
  seed?: string | number;
  excludeIds?: ID[];
  now?: number;
}

export interface AdaptivePlanSlot {
  kind: 'review' | 'mistake' | 'weak_skill' | 'fresh';
  /** Present for review/mistake slots so the caller can restore the question. */
  itemId?: ID;
  snapshot?: string | null;
  question?: Question;
  difficulty: number;
}

export interface AdaptivePlan {
  slots: AdaptivePlanSlot[];
  targetDifficulty: number;
  weakSkillIds: ID[];
  reason: string;
}

const MISTAKE_SHARE = 0.25;
const REVIEW_SHARE = 0.25;

/**
 * Builds the plan without generating fresh questions, so callers can hydrate
 * review and mistake slots from storage first.
 */
export function planAdaptiveSet(input: AdaptivePlanInput): AdaptivePlan {
  const now = input.now ?? Date.now();
  const decision = nextDifficulty({
    attempts: input.recentAttempts,
    currentDifficulty: input.currentDifficulty,
  });
  const targetDifficulty = decision.nextDifficulty;

  const reviewSlots = Math.min(
    Math.round(input.count * REVIEW_SHARE),
    prioritiseQueue(input.dueReviews, now).length,
  );
  const mistakeSlots = Math.min(
    Math.round(input.count * MISTAKE_SHARE),
    input.openMistakes.filter((m) => !m.resolved).length,
  );

  const slots: AdaptivePlanSlot[] = [];
  const queue = prioritiseQueue(input.dueReviews, now);
  for (let i = 0; i < reviewSlots; i++) {
    slots.push({
      kind: 'review',
      itemId: queue[i].itemId,
      snapshot: queue[i].snapshot,
      difficulty: targetDifficulty,
    });
  }

  const mistakes = input.openMistakes
    .filter((m) => !m.resolved)
    .slice()
    .sort((a, b) => b.mistakeCount - a.mistakeCount || a.lastMistakeAt - b.lastMistakeAt);
  for (let i = 0; i < mistakeSlots; i++) {
    slots.push({
      kind: 'mistake',
      itemId: mistakes[i].questionId,
      snapshot: mistakes[i].questionSnapshot,
      difficulty: mistakes[i].difficulty,
    });
  }

  const weakSkillIds = weakSkills(input.skillProgress, input.skillIds);
  const remaining = Math.max(0, input.count - slots.length);
  for (let i = 0; i < remaining; i++) {
    // Alternate weak-skill drilling with fresh practice so a session never
    // feels like punishment for being bad at one thing.
    const useWeakSkill = weakSkillIds.length > 0 && i % 3 !== 2;
    slots.push({
      kind: useWeakSkill ? 'weak_skill' : 'fresh',
      difficulty: useWeakSkill ? clampDifficulty(targetDifficulty - 1) : targetDifficulty,
    });
  }

  return {
    slots,
    targetDifficulty,
    weakSkillIds,
    reason: decision.reason,
  };
}

/** Fills the `fresh` and `weak_skill` slots with generated questions. */
export function fillPlan(plan: AdaptivePlan, input: AdaptivePlanInput): AdaptivePlanSlot[] {
  const excludeIds = new Set(input.excludeIds ?? []);
  for (const slot of plan.slots) {
    if (slot.itemId) excludeIds.add(slot.itemId);
  }

  const out: AdaptivePlanSlot[] = [];
  const needsGeneration = plan.slots.filter((s) => !s.question && !s.itemId);
  const generated = new Map<string, Question[]>();

  for (const slot of needsGeneration) {
    const key = slot.kind + ':' + slot.difficulty;
    if (generated.has(key)) continue;
    const request: GenerateRequest = {
      count: needsGeneration.filter((s) => s.kind === slot.kind && s.difficulty === slot.difficulty).length,
      difficulty: slot.difficulty,
      topicIds: input.topicIds,
      skillIds: slot.kind === 'weak_skill' && plan.weakSkillIds.length > 0 ? plan.weakSkillIds : input.skillIds,
      examIds: input.examIds,
      brainCategories: input.brainCategories,
      seed: String(input.seed ?? Date.now()) + ':' + key,
      excludeIds: Array.from(excludeIds),
    };
    try {
      generated.set(key, generateQuestions(request));
    } catch {
      generated.set(key, []);
    }
  }

  const cursors = new Map<string, number>();
  for (const slot of plan.slots) {
    if (slot.question || slot.itemId) {
      out.push(slot);
      continue;
    }
    const key = slot.kind + ':' + slot.difficulty;
    const pool = generated.get(key) ?? [];
    const cursor = cursors.get(key) ?? 0;
    const question = pool[cursor];
    cursors.set(key, cursor + 1);
    if (question) {
      excludeIds.add(question.id);
      out.push({ ...slot, question });
    } else {
      out.push(slot);
    }
  }
  return out;
}

function weakSkills(progress: readonly SkillProgress[], restrictTo?: ID[]): ID[] {
  const pool = restrictTo?.length
    ? progress.filter((p) => restrictTo.includes(p.skillId))
    : progress.slice();
  return unique(
    pool
      .filter((p) => p.attempts >= 2 && p.mastery < 0.6)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 4)
      .map((p) => p.skillId),
  );
}

/** Topics the learner should revisit, weakest first (spec §36). */
export function weakTopicIds(progress: readonly TopicProgress[], count = 5): ID[] {
  return progress
    .filter((p) => p.attempts >= 3 && p.mastery < 0.6)
    .slice()
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, count)
    .map((p) => p.topicId);
}

export function strongTopicIds(progress: readonly TopicProgress[], count = 5): ID[] {
  return progress
    .filter((p) => p.attempts >= 3)
    .slice()
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, count)
    .map((p) => p.topicId);
}
