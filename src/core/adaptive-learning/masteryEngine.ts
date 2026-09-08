import { clamp, mean } from '../utils/array';
import { daysBetween } from '../utils/date';
import { clampDifficulty } from '../constants/difficulty';
import { speedScore } from '../question-engine/difficultyEngine';
import type { QuestionAttempt, SkillProgress, TopicProgress } from '../../domain/models';

/**
 * Mastery is deliberately NOT accuracy (spec §17). It blends accuracy,
 * consistency, speed, the difficulty attempted, recent form and retention so
 * that a learner who guessed their way through easy questions does not appear
 * to have mastered a topic.
 */
export interface MasteryInputs {
  attempts: readonly QuestionAttempt[];
  /** Rolling window of `1`/`0` characters, oldest first. */
  recentOutcomes?: string;
  lastPracticedAt?: number | null;
  now?: number;
}

export interface MasteryBreakdownDetail {
  mastery: number;
  accuracy: number;
  consistency: number;
  speed: number;
  difficulty: number;
  recency: number;
  volume: number;
}

export const MASTERY_THRESHOLD = 0.8;
export const RECENT_WINDOW = 20;

const WEIGHTS = {
  accuracy: 0.34,
  consistency: 0.14,
  speed: 0.14,
  difficulty: 0.16,
  recency: 0.1,
  volume: 0.12,
};

export function computeMastery(inputs: MasteryInputs): MasteryBreakdownDetail {
  const now = inputs.now ?? Date.now();
  const attempts = inputs.attempts;

  if (attempts.length === 0) {
    return {
      mastery: 0,
      accuracy: 0,
      consistency: 0,
      speed: 0,
      difficulty: 0,
      recency: 0,
      volume: 0,
    };
  }

  const recent = attempts.slice(0, RECENT_WINDOW);
  const correctFlags = recent.map((a) => (a.isCorrect ? 1 : 0));
  const accuracy = mean(correctFlags);

  // Consistency: penalise a jagged pattern of right/wrong even at equal accuracy.
  let switches = 0;
  for (let i = 1; i < correctFlags.length; i++) {
    if (correctFlags[i] !== correctFlags[i - 1]) switches++;
  }
  const consistency = correctFlags.length < 2 ? accuracy : clamp(1 - switches / (correctFlags.length - 1), 0, 1);

  const speed = mean(recent.map((a) => speedScore(a.timeSpentMs, a.difficulty)));

  // Difficulty credit only counts questions answered correctly.
  const correctAttempts = recent.filter((a) => a.isCorrect);
  const difficulty = correctAttempts.length
    ? mean(correctAttempts.map((a) => clampDifficulty(a.difficulty) / 9))
    : 0;

  const lastAt = inputs.lastPracticedAt ?? recent[0]?.createdAt ?? now;
  const daysSince = Math.max(0, daysBetween(lastAt, now));
  // Retention decays with a 30-day half-life, floored so old work still counts.
  const recency = clamp(Math.pow(0.5, daysSince / 30), 0.25, 1);

  // Volume ramps to 1 over ~25 attempts; a handful of questions is not mastery.
  const volume = clamp(Math.log10(attempts.length + 1) / Math.log10(26), 0, 1);

  const mastery =
    WEIGHTS.accuracy * accuracy +
    WEIGHTS.consistency * consistency +
    WEIGHTS.speed * speed +
    WEIGHTS.difficulty * difficulty +
    WEIGHTS.recency * recency +
    WEIGHTS.volume * volume;

  return {
    mastery: round(clamp(mastery, 0, 1)),
    accuracy: round(accuracy),
    consistency: round(consistency),
    speed: round(speed),
    difficulty: round(difficulty),
    recency: round(recency),
    volume: round(volume),
  };
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

/** Appends an outcome to the rolling window string, keeping it bounded. */
export function pushOutcome(recentOutcomes: string, isCorrect: boolean): string {
  const next = recentOutcomes + (isCorrect ? '1' : '0');
  return next.length > RECENT_WINDOW ? next.slice(next.length - RECENT_WINDOW) : next;
}

export function outcomesToFlags(recentOutcomes: string): number[] {
  return recentOutcomes.split('').map((c) => (c === '1' ? 1 : 0));
}

export function isMastered(mastery: number): boolean {
  return mastery >= MASTERY_THRESHOLD;
}

export interface MasteryLabel {
  key: 'new' | 'learning' | 'practising' | 'strong' | 'mastered';
  en: string;
  bn: string;
}

export function masteryLabel(mastery: number, attempts: number): MasteryLabel {
  if (attempts === 0) return { key: 'new', en: 'Not started', bn: 'শুরু হয়নি' };
  if (mastery < 0.3) return { key: 'learning', en: 'Learning', bn: 'শিখছি' };
  if (mastery < 0.6) return { key: 'practising', en: 'Practising', bn: 'অভ্যাস চলছে' };
  if (mastery < MASTERY_THRESHOLD) return { key: 'strong', en: 'Strong', bn: 'ভালো' };
  return { key: 'mastered', en: 'Mastered', bn: 'দক্ষ' };
}

/** Roll-up used by the dashboard: weights child topics by attempts. */
export function overallMastery(progress: readonly TopicProgress[]): number {
  const active = progress.filter((p) => p.attempts > 0);
  if (active.length === 0) return 0;
  const totalWeight = active.reduce((acc, p) => acc + Math.min(p.attempts, 40), 0);
  const weighted = active.reduce((acc, p) => acc + p.mastery * Math.min(p.attempts, 40), 0);
  return round(totalWeight === 0 ? 0 : weighted / totalWeight);
}

export function weakestSkills(progress: readonly SkillProgress[], count = 5): SkillProgress[] {
  return progress
    .filter((p) => p.attempts >= 2)
    .slice()
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, count);
}

export function strongestSkills(progress: readonly SkillProgress[], count = 5): SkillProgress[] {
  return progress
    .filter((p) => p.attempts >= 2)
    .slice()
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, count);
}

/**
 * Exam readiness (spec §36): mastery of the topics an exam covers, discounted
 * when coverage is thin.
 */
export function examReadiness(
  examTopicIds: readonly string[],
  progress: readonly TopicProgress[],
): number {
  if (examTopicIds.length === 0) return 0;
  const byTopic = new Map(progress.map((p) => [p.topicId, p]));
  let total = 0;
  let covered = 0;
  for (const topicId of examTopicIds) {
    const entry = byTopic.get(topicId);
    if (entry && entry.attempts > 0) {
      covered++;
      total += entry.mastery;
    }
  }
  const coverage = covered / examTopicIds.length;
  const averageMastery = covered === 0 ? 0 : total / covered;
  return round(clamp(averageMastery * (0.4 + 0.6 * coverage), 0, 1));
}
