import { addDays, MS_PER_DAY, startOfDay } from '../utils/date';
import { clamp } from '../utils/array';
import type { ReviewItem } from '../../domain/models';

/**
 * Configurable spaced repetition (spec §19). The default ladder is the one the
 * spec names; a mistake drops the item back down the ladder so it returns
 * sooner.
 */
export const REVIEW_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30] as const;

export const REVIEW_STAGE_LABELS: { en: string; bn: string }[] = [
  { en: 'Today', bn: 'আজ' },
  { en: 'Tomorrow', bn: 'আগামীকাল' },
  { en: '3 days', bn: '৩ দিন' },
  { en: '7 days', bn: '৭ দিন' },
  { en: '14 days', bn: '১৪ দিন' },
  { en: '30 days', bn: '৩০ দিন' },
];

export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;
export const DEFAULT_EASE = 2.2;

export interface ScheduleInput {
  item: Pick<ReviewItem, 'stage' | 'repetitions' | 'lapses' | 'ease'>;
  isCorrect: boolean;
  /** 0..1 speed score; fast recall earns a longer interval. */
  speed?: number;
  hintsUsed?: number;
  now?: number;
}

export interface ScheduleResult {
  stage: number;
  dueAt: number;
  ease: number;
  repetitions: number;
  lapses: number;
  intervalDays: number;
}

export function scheduleReview(input: ScheduleInput): ScheduleResult {
  const now = input.now ?? Date.now();
  const { item, isCorrect } = input;
  const speed = clamp(input.speed ?? 0.5, 0, 1);
  const hintsUsed = input.hintsUsed ?? 0;

  let stage = item.stage;
  let ease = item.ease || DEFAULT_EASE;
  let repetitions = item.repetitions;
  let lapses = item.lapses;

  if (isCorrect) {
    repetitions += 1;
    // A confident, unaided answer moves two rungs; a slow or hinted one moves one.
    const jump = speed > 0.7 && hintsUsed === 0 ? 2 : 1;
    stage = Math.min(REVIEW_INTERVALS_DAYS.length - 1, stage + jump);
    ease = clamp(ease + (hintsUsed > 0 ? 0.02 : 0.1) * speed, MIN_EASE, MAX_EASE);
  } else {
    lapses += 1;
    // Wrong answers come back today or tomorrow, never in a month.
    stage = Math.max(0, Math.min(stage - 2, 1));
    ease = clamp(ease - 0.25, MIN_EASE, MAX_EASE);
  }

  const baseDays = REVIEW_INTERVALS_DAYS[stage];
  const intervalDays = stage <= 1 ? baseDays : Math.max(1, Math.round(baseDays * (ease / DEFAULT_EASE)));
  const dueAt = stage === 0 ? now + 10 * 60 * 1000 : startOfDay(addDays(now, intervalDays));

  return { stage, dueAt, ease: Number(ease.toFixed(3)), repetitions, lapses, intervalDays };
}

export function isDue(item: Pick<ReviewItem, 'dueAt'>, now = Date.now()): boolean {
  return item.dueAt <= now;
}

export function daysUntilDue(item: Pick<ReviewItem, 'dueAt'>, now = Date.now()): number {
  return Math.max(0, Math.ceil((item.dueAt - now) / MS_PER_DAY));
}

/** Human label for the next review, used on the revision screen. */
export function dueLabel(item: Pick<ReviewItem, 'dueAt'>, now = Date.now()): { en: string; bn: string } {
  if (isDue(item, now)) return { en: 'Due now', bn: 'এখনই' };
  const days = daysUntilDue(item, now);
  if (days <= 1) return { en: 'Tomorrow', bn: 'আগামীকাল' };
  return { en: 'In ' + days + ' days', bn: days + ' দিনে' };
}

/** Orders a review queue: most overdue and most-lapsed items come first. */
export function prioritiseQueue(items: readonly ReviewItem[], now = Date.now()): ReviewItem[] {
  return items
    .filter((item) => isDue(item, now))
    .slice()
    .sort((a, b) => {
      const overdueA = now - a.dueAt;
      const overdueB = now - b.dueAt;
      if (a.lapses !== b.lapses) return b.lapses - a.lapses;
      return overdueB - overdueA;
    });
}
