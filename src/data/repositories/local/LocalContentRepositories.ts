import type {
  Challenge,
  ChallengeAttempt,
  CompletedLesson,
  ContentStats,
  Curriculum,
  Exam,
  ExamAttempt,
  Formula,
  FormulaFilter,
  GameDefinition,
  GameHighScore,
  GameScore,
  ID,
  InstalledPack,
  Lesson,
  MissionState,
  PageRequest,
  Skill,
  Subject,
  Topic,
} from '../../../domain/models';
import type {
  ChallengeRepository,
  ContentPackRepository,
  ExamRepository,
  FormulaRepository,
  GameRepository,
  LessonRepository,
  TopicRepository,
} from '../../../domain/repositories';
import { WhereBuilder, placeholders, type SqlDatabase } from '../../database/sqlite/adapter';
import {
  challengeAttemptToRow,
  completedLessonToRow,
  examAttemptToRow,
  gameScoreToRow,
  missionToRow,
  rowToChallenge,
  rowToChallengeAttempt,
  rowToCompletedLesson,
  rowToCurriculum,
  rowToExam,
  rowToExamAttempt,
  rowToFormula,
  rowToGame,
  rowToGameScore,
  rowToInstalledPack,
  rowToLesson,
  rowToMission,
  rowToSkill,
  rowToSubject,
  rowToTopic,
  type Row,
} from './mappers';

function insertOrReplace(table: string, row: Row): { sql: string; params: (string | number | null)[] } {
  const columns = Object.keys(row);
  return {
    sql: 'INSERT OR REPLACE INTO ' + table + ' (' + columns.join(', ') + ') VALUES (' + placeholders(columns.length) + ')',
    params: columns.map((c) => row[c]),
  };
}

export class LocalTopicRepository implements TopicRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getCurriculums(): Promise<Curriculum[]> {
    const rows = await this.db.select<Row>('SELECT * FROM curriculums ORDER BY name');
    return rows.map(rowToCurriculum);
  }

  async getSubjects(curriculumId?: ID): Promise<Subject[]> {
    const where = new WhereBuilder().eq('curriculum_id', curriculumId).build();
    const rows = await this.db.select<Row>('SELECT * FROM subjects' + where.sql + ' ORDER BY order_index', where.params);
    return rows.map(rowToSubject);
  }

  async getTopics(): Promise<Topic[]> {
    const rows = await this.db.select<Row>('SELECT * FROM topics ORDER BY order_index, name');
    return rows.map(rowToTopic);
  }

  async getTopicById(id: ID): Promise<Topic | null> {
    const row = await this.db.selectOne<Row>('SELECT * FROM topics WHERE id = ?', [id]);
    return row ? rowToTopic(row) : null;
  }

  async getChildTopics(parentId: ID | null): Promise<Topic[]> {
    const rows =
      parentId === null
        ? await this.db.select<Row>('SELECT * FROM topics WHERE parent_id IS NULL ORDER BY order_index')
        : await this.db.select<Row>('SELECT * FROM topics WHERE parent_id = ? ORDER BY order_index', [parentId]);
    return rows.map(rowToTopic);
  }

  async getSkills(topicId?: ID): Promise<Skill[]> {
    const where = new WhereBuilder().eq('topic_id', topicId).build();
    const rows = await this.db.select<Row>('SELECT * FROM skills' + where.sql + ' ORDER BY order_index', where.params);
    return rows.map(rowToSkill);
  }

  async getSkillById(id: ID): Promise<Skill | null> {
    const row = await this.db.selectOne<Row>('SELECT * FROM skills WHERE id = ?', [id]);
    return row ? rowToSkill(row) : null;
  }

  async searchTopics(query: string): Promise<Topic[]> {
    const where = new WhereBuilder().like(['search_text'], query).build();
    if (where.params.length === 0) return [];
    const rows = await this.db.select<Row>('SELECT * FROM topics' + where.sql + ' ORDER BY order_index LIMIT 40', where.params);
    return rows.map(rowToTopic);
  }
}

export class LocalLessonRepository implements LessonRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getLessons(topicId?: ID): Promise<Lesson[]> {
    const where = new WhereBuilder().eq('topic_id', topicId).build();
    const rows = await this.db.select<Row>(
      'SELECT * FROM lessons' + where.sql + ' ORDER BY order_index',
      where.params,
    );
    return rows.map(rowToLesson);
  }

  async getLessonById(id: ID): Promise<Lesson | null> {
    const row = await this.db.selectOne<Row>('SELECT * FROM lessons WHERE id = ?', [id]);
    return row ? rowToLesson(row) : null;
  }

  async searchLessons(query: string): Promise<Lesson[]> {
    const where = new WhereBuilder().like(['search_text'], query).build();
    if (where.params.length === 0) return [];
    const rows = await this.db.select<Row>('SELECT * FROM lessons' + where.sql + ' LIMIT 40', where.params);
    return rows.map(rowToLesson);
  }

  async getCompletedLessons(): Promise<CompletedLesson[]> {
    const rows = await this.db.select<Row>('SELECT * FROM completed_lessons ORDER BY completed_at DESC');
    return rows.map(rowToCompletedLesson);
  }

  async markLessonCompleted(lesson: CompletedLesson): Promise<void> {
    const statement = insertOrReplace('completed_lessons', completedLessonToRow(lesson));
    await this.db.execute(statement.sql, statement.params);
  }
}

export class LocalFormulaRepository implements FormulaRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getFormulas(filter: FormulaFilter = {}): Promise<Formula[]> {
    const where = new WhereBuilder();
    where.in('category', filter.categories);
    where.like(['search_text'], filter.search);
    if (filter.tags?.length) {
      where.raw(
        '(' + filter.tags.map(() => 'tags LIKE ?').join(' OR ') + ')',
        filter.tags.map((t) => '%"' + t + '"%'),
      );
    }
    const built = where.build();
    const limit = Math.max(1, Math.min(200, filter.limit ?? 100));
    const offset = Math.max(0, filter.offset ?? 0);
    const rows = await this.db.select<Row>(
      'SELECT * FROM formulas' + built.sql + ' ORDER BY category, name LIMIT ? OFFSET ?',
      [...built.params, limit, offset],
    );
    return rows.map(rowToFormula);
  }

  async getFormulaById(id: ID): Promise<Formula | null> {
    const row = await this.db.selectOne<Row>('SELECT * FROM formulas WHERE id = ?', [id]);
    return row ? rowToFormula(row) : null;
  }

  async searchFormulas(query: string): Promise<Formula[]> {
    return this.getFormulas({ search: query, limit: 40 });
  }
}

export class LocalExamRepository implements ExamRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getExams(): Promise<Exam[]> {
    const rows = await this.db.select<Row>('SELECT * FROM exams ORDER BY family, name');
    return rows.map(rowToExam);
  }

  async getExamById(id: ID): Promise<Exam | null> {
    const row = await this.db.selectOne<Row>('SELECT * FROM exams WHERE id = ?', [id]);
    return row ? rowToExam(row) : null;
  }

  async saveExamAttempt(attempt: ExamAttempt): Promise<void> {
    const statement = insertOrReplace('exam_attempts', examAttemptToRow(attempt));
    await this.db.execute(statement.sql, statement.params);
  }

  async getExamAttempts(examId?: ID, page?: PageRequest): Promise<ExamAttempt[]> {
    const where = new WhereBuilder().eq('exam_id', examId).build();
    const rows = await this.db.select<Row>(
      'SELECT * FROM exam_attempts' + where.sql + ' ORDER BY started_at DESC LIMIT ? OFFSET ?',
      [...where.params, page?.limit ?? 50, page?.offset ?? 0],
    );
    return rows.map(rowToExamAttempt);
  }

  async getExamAttemptById(id: ID): Promise<ExamAttempt | null> {
    const row = await this.db.selectOne<Row>('SELECT * FROM exam_attempts WHERE id = ?', [id]);
    return row ? rowToExamAttempt(row) : null;
  }
}

export class LocalGameRepository implements GameRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getGames(): Promise<GameDefinition[]> {
    const rows = await this.db.select<Row>('SELECT * FROM games ORDER BY name');
    return rows.map(rowToGame);
  }

  async getGameByKind(kind: GameDefinition['kind']): Promise<GameDefinition | null> {
    const row = await this.db.selectOne<Row>('SELECT * FROM games WHERE kind = ?', [kind]);
    return row ? rowToGame(row) : null;
  }

  async saveScore(score: GameScore): Promise<void> {
    const statement = insertOrReplace('game_scores', gameScoreToRow(score));
    await this.db.execute(statement.sql, statement.params);
  }

  async getHighScores(): Promise<GameHighScore[]> {
    const rows = await this.db.select<{
      game_kind: string;
      best: number;
      plays: number;
      last_played: number | null;
    }>(
      'SELECT game_kind, MAX(score) AS best, COUNT(*) AS plays, MAX(played_at) AS last_played ' +
        'FROM game_scores GROUP BY game_kind',
    );
    return rows.map((row) => ({
      gameKind: row.game_kind as GameDefinition['kind'],
      bestScore: row.best ?? 0,
      playCount: row.plays ?? 0,
      lastPlayedAt: row.last_played ?? null,
    }));
  }

  async getScores(kind?: GameDefinition['kind'], page?: PageRequest): Promise<GameScore[]> {
    const where = new WhereBuilder().eq('game_kind', kind).build();
    const rows = await this.db.select<Row>(
      'SELECT * FROM game_scores' + where.sql + ' ORDER BY score DESC, played_at DESC LIMIT ? OFFSET ?',
      [...where.params, page?.limit ?? 20, page?.offset ?? 0],
    );
    return rows.map(rowToGameScore);
  }
}

export class LocalChallengeRepository implements ChallengeRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getChallenges(): Promise<Challenge[]> {
    const rows = await this.db.select<Row>('SELECT * FROM challenges ORDER BY kind, name');
    return rows.map(rowToChallenge);
  }

  async getChallengeById(id: ID): Promise<Challenge | null> {
    const row = await this.db.selectOne<Row>('SELECT * FROM challenges WHERE id = ?', [id]);
    return row ? rowToChallenge(row) : null;
  }

  async saveChallengeAttempt(attempt: ChallengeAttempt): Promise<void> {
    const statement = insertOrReplace('challenge_attempts', challengeAttemptToRow(attempt));
    await this.db.execute(statement.sql, statement.params);
  }

  async getChallengeAttempts(challengeId?: ID): Promise<ChallengeAttempt[]> {
    const where = new WhereBuilder().eq('challenge_id', challengeId).build();
    const rows = await this.db.select<Row>(
      'SELECT * FROM challenge_attempts' + where.sql + ' ORDER BY started_at DESC LIMIT 100',
      where.params,
    );
    return rows.map(rowToChallengeAttempt);
  }

  async getMissions(periodKey?: string): Promise<MissionState[]> {
    const where = new WhereBuilder().eq('period_key', periodKey).build();
    const rows = await this.db.select<Row>('SELECT * FROM missions' + where.sql + ' ORDER BY code', where.params);
    return rows.map(rowToMission);
  }

  async upsertMission(mission: MissionState): Promise<void> {
    const statement = insertOrReplace('missions', missionToRow(mission));
    await this.db.execute(statement.sql, statement.params);
  }
}

export class LocalContentPackRepository implements ContentPackRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getInstalledPacks(): Promise<InstalledPack[]> {
    const rows = await this.db.select<Row>('SELECT * FROM content_packs ORDER BY core DESC, name');
    return rows.map(rowToInstalledPack);
  }

  async setPackEnabled(packId: string, enabled: boolean): Promise<void> {
    await this.db.execute('UPDATE content_packs SET enabled = ? WHERE id = ? AND core = 0', [
      enabled ? 1 : 0,
      packId,
    ]);
  }

  async getContentStats(): Promise<ContentStats> {
    const counts = await Promise.all(
      ['topics', 'lessons', 'questions', 'formulas', 'exams', 'games', 'challenges', 'skills'].map(
        async (table) => {
          const row = await this.db.selectOne<{ total: number }>('SELECT COUNT(*) AS total FROM ' + table);
          return [table, row?.total ?? 0] as const;
        },
      ),
    );
    const map = Object.fromEntries(counts) as Record<string, number>;
    return {
      topics: map.topics ?? 0,
      lessons: map.lessons ?? 0,
      questions: map.questions ?? 0,
      formulas: map.formulas ?? 0,
      exams: map.exams ?? 0,
      games: map.games ?? 0,
      challenges: map.challenges ?? 0,
      skills: map.skills ?? 0,
    };
  }
}
