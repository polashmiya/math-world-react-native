import { ALL_GENERATORS } from '../../core/question-engine/registry';
import { FORMULA_CATEGORY_LABELS } from '../../core/constants/categories';
import type { Language } from '../../core/constants/levels';
import { uuid } from '../../core/utils/id';
import { newSyncMeta } from '../models';
import type { Bookmark, BookmarkItemType, ID } from '../models';
import type { RepositoryRegistry } from '../repositories';

export type SearchResultKind =
  | 'topic'
  | 'lesson'
  | 'question'
  | 'formula'
  | 'exam'
  | 'game'
  | 'skill'
  | 'challenge';

export interface SearchResult {
  kind: SearchResultKind;
  id: ID;
  title: string;
  subtitle: string;
  emoji: string;
  /** Higher is better; used for ordering across kinds. */
  score: number;
}

export interface SearchResults {
  query: string;
  total: number;
  byKind: Record<SearchResultKind, SearchResult[]>;
  top: SearchResult[];
}

const EMPTY_BY_KIND = (): Record<SearchResultKind, SearchResult[]> => ({
  topic: [],
  lesson: [],
  question: [],
  formula: [],
  exam: [],
  game: [],
  skill: [],
  challenge: [],
});

/** Offline global search (spec §37) and bookmarks (spec §38). */
export class SearchService {
  constructor(private readonly repos: RepositoryRegistry) {}

  async search(query: string, language: Language = 'bn'): Promise<SearchResults> {
    const term = query.trim();
    const byKind = EMPTY_BY_KIND();
    if (term.length < 2) return { query: term, total: 0, byKind, top: [] };

    const lower = term.toLowerCase();
    const [topics, lessons, questions, formulas, exams, games, skills, challenges] = await Promise.all([
      this.repos.topics.searchTopics(term),
      this.repos.lessons.searchLessons(term),
      this.repos.questions.searchQuestions(term, { limit: 20 }),
      this.repos.formulas.searchFormulas(term),
      this.repos.exams.getExams(),
      this.repos.games.getGames(),
      this.repos.topics.getSkills(),
      this.repos.challenges.getChallenges(),
    ]);

    const pick = (en: string, bn: string): string => (language === 'bn' ? bn || en : en);
    const relevance = (haystack: string): number => {
      const text = haystack.toLowerCase();
      if (text === lower) return 100;
      if (text.startsWith(lower)) return 80;
      if (text.includes(lower)) return 60;
      return 0;
    };

    for (const topic of topics) {
      byKind.topic.push({
        kind: 'topic',
        id: topic.id,
        title: pick(topic.name, topic.nameBn),
        subtitle: pick(topic.description ?? '', topic.descriptionBn ?? ''),
        emoji: topic.emoji,
        score: Math.max(relevance(topic.name), relevance(topic.nameBn), 40),
      });
    }

    for (const lesson of lessons) {
      byKind.lesson.push({
        kind: 'lesson',
        id: lesson.id,
        title: pick(lesson.title, lesson.titleBn),
        subtitle: pick(lesson.summary, lesson.summaryBn),
        emoji: '📖',
        score: Math.max(relevance(lesson.title), relevance(lesson.titleBn), 38),
      });
    }

    for (const question of questions) {
      byKind.question.push({
        kind: 'question',
        id: question.id,
        title: pick(question.prompt, question.promptBn ?? question.prompt).slice(0, 90),
        subtitle: 'Difficulty ' + question.difficulty + ' · ' + question.questionType,
        emoji: '❓',
        score: 30,
      });
    }

    for (const formula of formulas) {
      byKind.formula.push({
        kind: 'formula',
        id: formula.id,
        title: pick(formula.name, formula.nameBn),
        subtitle: formula.expression,
        emoji: '🧾',
        score: Math.max(relevance(formula.name), relevance(formula.nameBn), 45),
      });
    }

    for (const exam of exams) {
      const score = Math.max(relevance(exam.name), relevance(exam.nameBn), relevance(exam.code));
      if (score === 0) continue;
      byKind.exam.push({
        kind: 'exam',
        id: exam.id,
        title: pick(exam.name, exam.nameBn),
        subtitle: exam.totalQuestions + ' questions · ' + Math.round(exam.durationSeconds / 60) + ' min',
        emoji: exam.emoji,
        score,
      });
    }

    for (const game of games) {
      const score = Math.max(relevance(game.name), relevance(game.nameBn));
      if (score === 0) continue;
      byKind.game.push({
        kind: 'game',
        id: game.id,
        title: pick(game.name, game.nameBn),
        subtitle: pick(game.description, game.descriptionBn),
        emoji: game.emoji,
        score,
      });
    }

    for (const skill of skills) {
      const score = Math.max(relevance(skill.name), relevance(skill.nameBn));
      if (score === 0) continue;
      byKind.skill.push({
        kind: 'skill',
        id: skill.id,
        title: pick(skill.name, skill.nameBn),
        subtitle: skill.topicId,
        emoji: '🎯',
        score,
      });
    }

    for (const challenge of challenges) {
      const score = Math.max(relevance(challenge.name), relevance(challenge.nameBn));
      if (score === 0) continue;
      byKind.challenge.push({
        kind: 'challenge',
        id: challenge.id,
        title: pick(challenge.name, challenge.nameBn),
        subtitle: pick(challenge.description, challenge.descriptionBn),
        emoji: challenge.emoji,
        score,
      });
    }

    const all = Object.values(byKind).flat();
    return {
      query: term,
      total: all.length,
      byKind,
      top: all.slice().sort((a, b) => b.score - a.score).slice(0, 20),
    };
  }

  /** Generator search powers the "practice this skill" shortcuts. */
  searchGenerators(query: string): { id: string; name: string; nameBn: string; topicId: ID }[] {
    const lower = query.trim().toLowerCase();
    if (lower.length < 2) return [];
    return ALL_GENERATORS.filter(
      (g) =>
        g.id.toLowerCase().includes(lower) ||
        g.name.toLowerCase().includes(lower) ||
        g.nameBn.includes(query.trim()),
    ).map((g) => ({ id: g.id, name: g.name, nameBn: g.nameBn, topicId: g.topicId }));
  }

  /* ── bookmarks (spec §38) ─────────────────────────────────────────────── */

  async toggleBookmark(
    itemType: BookmarkItemType,
    itemId: ID,
    label: string,
    snapshot?: string | null,
    now = Date.now(),
  ): Promise<boolean> {
    const exists = await this.repos.bookmarks.isBookmarked(itemType, itemId);
    if (exists) {
      await this.repos.bookmarks.removeBookmark(itemType, itemId);
      return false;
    }
    const bookmark: Bookmark = {
      ...newSyncMeta(now),
      id: uuid(),
      itemType,
      itemId,
      label,
      note: null,
      snapshot: snapshot ?? null,
    };
    await this.repos.bookmarks.addBookmark(bookmark);
    return true;
  }

  async getBookmarks(itemType?: BookmarkItemType): Promise<Bookmark[]> {
    return this.repos.bookmarks.getBookmarks(itemType);
  }

  async isBookmarked(itemType: BookmarkItemType, itemId: ID): Promise<boolean> {
    return this.repos.bookmarks.isBookmarked(itemType, itemId);
  }

  /** Formula library browsing, grouped by category (spec §27). */
  async getFormulaLibrary(language: Language = 'bn') {
    const formulas = await this.repos.formulas.getFormulas({ limit: 200 });
    const grouped = new Map<string, typeof formulas>();
    for (const formula of formulas) {
      const list = grouped.get(formula.category) ?? [];
      list.push(formula);
      grouped.set(formula.category, list);
    }
    return Array.from(grouped.entries()).map(([category, items]) => ({
      category,
      label:
        language === 'bn'
          ? FORMULA_CATEGORY_LABELS[category as keyof typeof FORMULA_CATEGORY_LABELS]?.bn ?? category
          : FORMULA_CATEGORY_LABELS[category as keyof typeof FORMULA_CATEGORY_LABELS]?.en ?? category,
      formulas: items,
    }));
  }
}
