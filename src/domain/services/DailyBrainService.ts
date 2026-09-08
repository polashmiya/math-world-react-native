import {
  BRAIN_CATEGORIES,
  BRAIN_CATEGORY_META,
  type BrainCategory,
} from '../../core/constants/categories';
import { generateQuestions, generatorsForBrainCategory } from '../../core/question-engine/registry';
import { categoriesForWeakDimensions } from '../../core/adaptive-learning/thinkingScore';
import { dayKey } from '../../core/utils/date';
import { hashString } from '../../core/utils/id';
import type { BrainCategoryProgress, Question } from '../models';
import type { RepositoryRegistry } from '../repositories';

export interface DailyBrainBlock {
  category: BrainCategory;
  label: { en: string; bn: string };
  emoji: string;
  target: number;
  questions: Question[];
  /** True when this block was added because the dimension is weak. */
  focused: boolean;
  mastery: number;
}

export interface DailySet {
  day: string;
  blocks: DailyBrainBlock[];
  totalQuestions: number;
  completedToday: number;
  /** 0..1 across the whole day's set. */
  progress: number;
  brainScore: number;
}

/**
 * Daily Brain Math (spec §20). Not exam preparation: it trains everyday
 * mathematical thinking, and the mix is personalised from the user's weakest
 * thinking dimensions.
 */
export class DailyBrainService {
  constructor(private readonly repos: RepositoryRegistry) {}

  async getTodaySet(now = Date.now()): Promise<DailySet> {
    const day = dayKey(now);
    const [thinking, brainProgress, activity] = await Promise.all([
      this.repos.progress.getThinkingScore(),
      this.repos.progress.getBrainProgress(),
      this.repos.progress.getDailyActivityForDay(day),
    ]);

    const focusCategories = new Set(categoriesForWeakDimensions(thinking.dimensions, 4));
    const masteryByCategory = new Map(brainProgress.map((b) => [b.category, b.mastery]));

    // The day's mix is deterministic per day, so reopening the app shows the
    // same set rather than reshuffling.
    const seed = hashString('daily:' + day);
    const categories = this.pickCategories(focusCategories, brainProgress, day);

    const blocks: DailyBrainBlock[] = [];
    for (const category of categories) {
      const meta = BRAIN_CATEGORY_META[category];
      const focused = focusCategories.has(category);
      const target = focused ? meta.dailyTarget + 1 : meta.dailyTarget;
      if (generatorsForBrainCategory(category).length === 0) continue;

      let questions: Question[] = [];
      try {
        questions = generateQuestions({
          count: target,
          difficulty: this.difficultyFor(masteryByCategory.get(category) ?? 0),
          brainCategories: [category],
          seed: seed + ':' + category,
        });
      } catch {
        questions = [];
      }
      if (questions.length === 0) continue;

      blocks.push({
        category,
        label: { en: meta.en, bn: meta.bn },
        emoji: meta.emoji,
        target: questions.length,
        questions,
        focused,
        mastery: masteryByCategory.get(category) ?? 0,
      });
    }

    const totalQuestions = blocks.reduce((acc, b) => acc + b.questions.length, 0);
    const answeredToday = activity?.questionsAnswered ?? 0;
    const completedToday = Math.min(totalQuestions, answeredToday);

    return {
      day,
      blocks,
      totalQuestions,
      completedToday,
      progress: totalQuestions === 0 ? 0 : Number((completedToday / totalQuestions).toFixed(4)),
      brainScore: activity?.brainScore ?? 0,
    };
  }

  /** Persists the generated set so attempts can reference the questions. */
  async prepareBlock(block: DailyBrainBlock): Promise<Question[]> {
    await this.repos.questions.upsertQuestions(block.questions);
    return block.questions;
  }

  async getCategoryProgress(): Promise<BrainCategoryProgress[]> {
    const progress = await this.repos.progress.getBrainProgress();
    return progress.slice().sort((a, b) => a.mastery - b.mastery);
  }

  /**
   * Six to eight categories a day: weak ones always appear, the rest rotate on
   * a day-of-year cycle so nothing is neglected for long.
   */
  private pickCategories(
    focus: ReadonlySet<BrainCategory>,
    progress: readonly BrainCategoryProgress[],
    day: string,
  ): BrainCategory[] {
    const leastPractised = progress
      .slice()
      .sort((a, b) => (a.lastPracticedAt ?? 0) - (b.lastPracticedAt ?? 0))
      .map((p) => p.category);

    const picked: BrainCategory[] = [];
    for (const category of focus) {
      if (!picked.includes(category)) picked.push(category);
    }
    for (const category of leastPractised) {
      if (picked.length >= 7) break;
      if (!picked.includes(category)) picked.push(category);
    }
    // Rotation guarantees coverage even if the lists above are short.
    const offset = hashString(day) % BRAIN_CATEGORIES.length;
    for (let i = 0; i < BRAIN_CATEGORIES.length && picked.length < 7; i++) {
      const category = BRAIN_CATEGORIES[(offset + i) % BRAIN_CATEGORIES.length];
      if (!picked.includes(category)) picked.push(category);
    }
    return picked;
  }

  private difficultyFor(mastery: number): number {
    if (mastery <= 0) return 2;
    return Math.max(1, Math.min(9, Math.round(2 + mastery * 6)));
  }
}
