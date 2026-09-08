import { hashString } from '../../../core/utils/id';
import { makePage, type ID, type Page, type PageRequest, type Question, type QuestionFilter } from '../../../domain/models';
import type { QuestionRepository } from '../../../domain/repositories';
import { placeholders, WhereBuilder, type SqlDatabase, type SqlValue } from '../../database/sqlite/adapter';
import { questionToRow, rowToQuestion, type Row } from './mappers';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

/**
 * SQLite-backed question repository.
 *
 * Every query is paginated and index-friendly: the bank is designed to grow to
 * hundreds of thousands of rows, so nothing here ever loads the whole table
 * (spec §8, §61.10).
 */
export class LocalQuestionRepository implements QuestionRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getQuestionById(id: ID): Promise<Question | null> {
    const row = await this.db.selectOne<Row>('SELECT * FROM questions WHERE id = ?', [id]);
    return row ? rowToQuestion(row) : null;
  }

  async getQuestions(filter: QuestionFilter): Promise<Question[]> {
    const { sql, params } = this.buildQuery(filter);
    const rows = await this.db.select<Row>(sql, params);
    return rows.map(rowToQuestion);
  }

  async getQuestionsPage(filter: QuestionFilter): Promise<Page<Question>> {
    const limit = clampLimit(filter.limit);
    const offset = Math.max(0, filter.offset ?? 0);
    const [items, total] = await Promise.all([
      this.getQuestions({ ...filter, limit, offset }),
      this.countQuestions(filter),
    ]);
    return makePage(items, total, limit, offset);
  }

  async getRandomQuestions(filter: QuestionFilter): Promise<Question[]> {
    return this.getQuestions({ ...filter, orderBy: 'random' });
  }

  async searchQuestions(query: string, page?: PageRequest): Promise<Question[]> {
    return this.getQuestions({
      search: query,
      limit: page?.limit ?? DEFAULT_LIMIT,
      offset: page?.offset ?? 0,
    });
  }

  async countQuestions(filter: QuestionFilter): Promise<number> {
    const { sql, params } = this.buildQuery(filter, true);
    const row = await this.db.selectOne<{ total: number }>(sql, params);
    return row?.total ?? 0;
  }

  /**
   * Persists generated questions so an attempt, mistake or bookmark can always
   * resolve back to the exact question the learner saw.
   */
  async upsertQuestions(questions: Question[]): Promise<void> {
    if (questions.length === 0) return;
    await this.db.transaction(async (tx) => {
      for (const question of questions) {
        const row = questionToRow(question);
        const columns = Object.keys(row);
        await tx.execute(
          'INSERT OR REPLACE INTO questions (' +
            columns.join(', ') +
            ') VALUES (' +
            placeholders(columns.length) +
            ')',
          columns.map((c) => row[c]),
        );
        await tx.execute('DELETE FROM question_skills WHERE question_id = ?', [question.id]);
        await tx.execute('DELETE FROM question_exams WHERE question_id = ?', [question.id]);
        await tx.execute('DELETE FROM question_tags WHERE question_id = ?', [question.id]);
        for (const skillId of question.skillIds) {
          await tx.execute('INSERT OR IGNORE INTO question_skills (question_id, skill_id) VALUES (?, ?)', [
            question.id,
            skillId,
          ]);
        }
        for (const examId of question.examIds) {
          await tx.execute('INSERT OR IGNORE INTO question_exams (question_id, exam_id) VALUES (?, ?)', [
            question.id,
            examId,
          ]);
        }
        for (const tag of question.tags) {
          await tx.execute('INSERT OR IGNORE INTO question_tags (question_id, tag) VALUES (?, ?)', [
            question.id,
            tag,
          ]);
        }
      }
    });
  }

  private buildQuery(filter: QuestionFilter, count = false): { sql: string; params: SqlValue[] } {
    const where = new WhereBuilder();
    where.in('q.topic_id', filter.topicIds);
    where.in('q.subtopic_id', filter.subtopicIds);
    where.in('q.question_type', filter.questionTypes);
    where.in('q.brain_category', filter.brainCategories);
    where.gte('q.difficulty', filter.difficultyMin);
    where.lte('q.difficulty', filter.difficultyMax);
    where.in('q.year', filter.years);
    where.notIn('q.id', filter.excludeQuestionIds);
    where.like(['q.search_text'], filter.search);

    if (filter.skillIds?.length) {
      where.raw(
        'EXISTS (SELECT 1 FROM question_skills qs WHERE qs.question_id = q.id AND qs.skill_id IN (' +
          placeholders(filter.skillIds.length) +
          '))',
        filter.skillIds,
      );
    }
    if (filter.examIds?.length) {
      where.raw(
        'EXISTS (SELECT 1 FROM question_exams qe WHERE qe.question_id = q.id AND qe.exam_id IN (' +
          placeholders(filter.examIds.length) +
          '))',
        filter.examIds,
      );
    }
    if (filter.tags?.length) {
      where.raw(
        'EXISTS (SELECT 1 FROM question_tags qt WHERE qt.question_id = q.id AND qt.tag IN (' +
          placeholders(filter.tags.length) +
          '))',
        filter.tags,
      );
    }
    if (filter.curriculumIds?.length) {
      where.raw(
        '(' + filter.curriculumIds.map(() => 'q.curriculum_ids LIKE ?').join(' OR ') + ')',
        filter.curriculumIds.map((c) => '%"' + c + '"%'),
      );
    }
    if (filter.solved !== undefined) {
      const clause =
        'EXISTS (SELECT 1 FROM question_attempts a WHERE a.question_id = q.id AND a.is_correct = 1)';
      where.raw(filter.solved ? clause : 'NOT ' + clause);
    }

    const built = where.build();
    if (count) {
      return { sql: 'SELECT COUNT(*) AS total FROM questions q' + built.sql, params: built.params };
    }

    const limit = clampLimit(filter.limit);
    const offset = Math.max(0, filter.offset ?? 0);
    const order = orderClause(filter);
    return {
      sql: 'SELECT q.* FROM questions q' + built.sql + order + ' LIMIT ? OFFSET ?',
      params: [...built.params, limit, offset],
    };
  }
}

function clampLimit(limit?: number): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}

/** Prime modulus for the seeded shuffle below. */
const SHUFFLE_MODULUS = 104729;

/**
 * `random` ordering is reproducible when a seed is supplied: SQLite has no
 * seedable RANDOM(), so rows are ordered by `(rowid × seedFactor) mod p`, which
 * is a stable permutation for a given seed.
 */
function orderClause(filter: QuestionFilter): string {
  switch (filter.orderBy) {
    case 'difficulty':
      return ' ORDER BY q.difficulty ASC, q.id ASC';
    case 'random': {
      if (filter.seed === undefined) return ' ORDER BY RANDOM()';
      const factor = 1 + (hashString(String(filter.seed)) % (SHUFFLE_MODULUS - 1));
      return ' ORDER BY ((q.rowid * ' + factor + ') % ' + SHUFFLE_MODULUS + '), q.id';
    }
    default:
      return ' ORDER BY q.difficulty ASC, q.id ASC';
  }
}
