import { BRAIN_CATEGORIES, THINKING_DIMENSIONS, tierForXp } from '../../../core/constants/categories';
import { dayKey } from '../../../core/utils/date';
import { uuid } from '../../../core/utils/id';
import {
  DEFAULT_SETTINGS,
  LOCAL_USER_ID,
  newSyncMeta,
  type AttemptFilter,
  type Bookmark,
  type BookmarkItemType,
  type BrainCategoryProgress,
  type DailyActivity,
  type ID,
  type Mistake,
  type PageRequest,
  type QuestionAttempt,
  type ReviewItem,
  type SkillProgress,
  type StreakState,
  type StudyGoal,
  type StudySession,
  type ThinkingScoreState,
  type TopicProgress,
  type UnlockedAchievement,
  type UserProfile,
  type UserProgress,
  type UserSettings,
} from '../../../domain/models';
import type { Achievement } from '../../../domain/models/progress';
import type {
  AchievementRepository,
  AttemptRepository,
  BookmarkRepository,
  MistakeRepository,
  ProgressRepository,
  ReviewRepository,
  UserRepository,
} from '../../../domain/repositories';
import { ACHIEVEMENTS } from '../../content/achievements';
import { placeholders, WhereBuilder, type SqlDatabase } from '../../database/sqlite/adapter';
import {
  attemptToRow,
  bookmarkToRow,
  brainProgressToRow,
  dailyActivityToRow,
  goalToRow,
  mistakeToRow,
  profileToRow,
  reviewItemToRow,
  rowToAttempt,
  rowToBookmark,
  rowToBrainProgress,
  rowToDailyActivity,
  rowToGoal,
  rowToMistake,
  rowToProfile,
  rowToReviewItem,
  rowToSettings,
  rowToSkillProgress,
  rowToStreak,
  rowToStudySession,
  rowToThinkingScore,
  rowToTopicProgress,
  rowToUnlockedAchievement,
  rowToUserProgress,
  settingsToRow,
  skillProgressToRow,
  streakToRow,
  studySessionToRow,
  thinkingScoreToRow,
  topicProgressToRow,
  unlockedAchievementToRow,
  userProgressToRow,
  type Row,
} from './mappers';

function insertOrReplace(table: string, row: Row): { sql: string; params: (string | number | null)[] } {
  const columns = Object.keys(row);
  return {
    sql:
      'INSERT OR REPLACE INTO ' +
      table +
      ' (' +
      columns.join(', ') +
      ') VALUES (' +
      placeholders(columns.length) +
      ')',
    params: columns.map((c) => row[c]),
  };
}

const SINGLETON_ID = 'local';

export class LocalUserRepository implements UserRepository {
  constructor(private readonly db: SqlDatabase) {}

  /** Creates the local profile on first run; there is no login (spec §41). */
  async getProfile(): Promise<UserProfile> {
    const row = await this.db.selectOne<Row>('SELECT * FROM user_profile WHERE id = ?', [LOCAL_USER_ID]);
    if (row) return rowToProfile(row);
    const profile: UserProfile = {
      ...newSyncMeta(),
      id: LOCAL_USER_ID,
      name: '',
      avatarEmoji: '🧑‍🎓',
      learningGoal: 'school',
      language: 'bn',
      dailyGoalQuestions: 20,
      dailyGoalMinutes: 20,
      difficultyPreference: 'adaptive',
      remoteUserId: null,
    };
    await this.updateProfile(profile);
    return profile;
  }

  async updateProfile(profile: UserProfile): Promise<void> {
    const statement = insertOrReplace('user_profile', profileToRow(profile));
    await this.db.execute(statement.sql, statement.params);
  }

  async getSettings(): Promise<UserSettings> {
    const row = await this.db.selectOne<Row>('SELECT * FROM user_settings WHERE id = ?', [SINGLETON_ID]);
    if (row) return rowToSettings(row);
    const settings: UserSettings = { ...newSyncMeta(), id: SINGLETON_ID, ...DEFAULT_SETTINGS };
    await this.updateSettings(settings);
    return settings;
  }

  async updateSettings(settings: UserSettings): Promise<void> {
    const statement = insertOrReplace('user_settings', settingsToRow(settings));
    await this.db.execute(statement.sql, statement.params);
  }
}

export class LocalAttemptRepository implements AttemptRepository {
  constructor(private readonly db: SqlDatabase) {}

  async saveAttempt(attempt: QuestionAttempt): Promise<void> {
    await this.saveAttempts([attempt]);
  }

  async saveAttempts(attempts: QuestionAttempt[]): Promise<void> {
    if (attempts.length === 0) return;
    await this.db.transaction(async (tx) => {
      for (const attempt of attempts) {
        const statement = insertOrReplace('question_attempts', attemptToRow(attempt));
        await tx.execute(statement.sql, statement.params);
        for (const skillId of attempt.skillIds) {
          await tx.execute(
            'INSERT OR REPLACE INTO attempt_skills (attempt_id, skill_id, created_at) VALUES (?, ?, ?)',
            [attempt.id, skillId, attempt.createdAt],
          );
        }
      }
    });
  }

  async getAttempts(filter: AttemptFilter): Promise<QuestionAttempt[]> {
    const built = this.buildWhere(filter);
    const rows = await this.db.select<Row>(
      'SELECT a.* FROM question_attempts a' + built.sql + ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?',
      [...built.params, Math.min(500, filter.limit ?? 50), filter.offset ?? 0],
    );
    return rows.map(rowToAttempt);
  }

  async countAttempts(filter: AttemptFilter): Promise<number> {
    const built = this.buildWhere(filter);
    const row = await this.db.selectOne<{ total: number }>(
      'SELECT COUNT(*) AS total FROM question_attempts a' + built.sql,
      built.params,
    );
    return row?.total ?? 0;
  }

  async getSolvedQuestionIds(topicIds?: ID[]): Promise<ID[]> {
    const where = new WhereBuilder().raw('is_correct = 1');
    where.in('topic_id', topicIds);
    const built = where.build();
    const rows = await this.db.select<{ question_id: string }>(
      'SELECT DISTINCT question_id FROM question_attempts' + built.sql,
      built.params,
    );
    return rows.map((r) => r.question_id);
  }

  async saveSession(session: StudySession): Promise<void> {
    const statement = insertOrReplace('study_sessions', studySessionToRow(session));
    await this.db.execute(statement.sql, statement.params);
  }

  async getSessions(page?: PageRequest): Promise<StudySession[]> {
    const rows = await this.db.select<Row>(
      'SELECT * FROM study_sessions ORDER BY started_at DESC LIMIT ? OFFSET ?',
      [page?.limit ?? 30, page?.offset ?? 0],
    );
    return rows.map(rowToStudySession);
  }

  private buildWhere(filter: AttemptFilter) {
    const where = new WhereBuilder();
    where.in('a.question_id', filter.questionIds);
    where.in('a.topic_id', filter.topicIds);
    where.in('a.mode', filter.modes);
    where.gte('a.created_at', filter.fromTimestamp);
    where.lte('a.created_at', filter.toTimestamp);
    if (filter.isCorrect !== undefined) where.eq('a.is_correct', filter.isCorrect ? 1 : 0);
    if (filter.skillIds?.length) {
      where.raw(
        'EXISTS (SELECT 1 FROM attempt_skills s WHERE s.attempt_id = a.id AND s.skill_id IN (' +
          placeholders(filter.skillIds.length) +
          '))',
        filter.skillIds,
      );
    }
    return where.build();
  }
}

export class LocalMistakeRepository implements MistakeRepository {
  constructor(private readonly db: SqlDatabase) {}

  /** Increments the count when the same question is missed again (spec §18). */
  async recordMistake(mistake: Mistake): Promise<void> {
    const existing = await this.getMistakeByQuestionId(mistake.questionId);
    if (!existing) {
      const statement = insertOrReplace('mistakes', mistakeToRow(mistake));
      await this.db.execute(statement.sql, statement.params);
      return;
    }
    const merged: Mistake = {
      ...existing,
      mistakeCount: existing.mistakeCount + 1,
      lastMistakeAt: mistake.lastMistakeAt,
      correctStreak: 0,
      resolved: false,
      difficulty: mistake.difficulty,
      questionSnapshot: mistake.questionSnapshot || existing.questionSnapshot,
      reason: mistake.reason ?? existing.reason,
      updatedAt: mistake.updatedAt,
      version: existing.version + 1,
      syncStatus: 'pending',
    };
    await this.updateMistake(merged);
  }

  async getMistakes(
    options: { topicId?: ID; includeResolved?: boolean } & PageRequest = {},
  ): Promise<Mistake[]> {
    const where = new WhereBuilder().eq('topic_id', options.topicId);
    if (!options.includeResolved) where.eq('resolved', 0);
    const built = where.build();
    const rows = await this.db.select<Row>(
      'SELECT * FROM mistakes' + built.sql + ' ORDER BY mistake_count DESC, last_mistake_at DESC LIMIT ? OFFSET ?',
      [...built.params, options.limit ?? 100, options.offset ?? 0],
    );
    return rows.map(rowToMistake);
  }

  async getMistakeByQuestionId(questionId: ID): Promise<Mistake | null> {
    const row = await this.db.selectOne<Row>('SELECT * FROM mistakes WHERE question_id = ?', [questionId]);
    return row ? rowToMistake(row) : null;
  }

  async updateMistake(mistake: Mistake): Promise<void> {
    const statement = insertOrReplace('mistakes', mistakeToRow(mistake));
    await this.db.execute(statement.sql, statement.params);
  }

  async removeMistake(id: ID): Promise<void> {
    await this.db.execute('DELETE FROM mistakes WHERE id = ?', [id]);
  }

  async countByTopic(): Promise<{ topicId: ID; count: number }[]> {
    const rows = await this.db.select<{ topic_id: string; total: number }>(
      'SELECT topic_id, COUNT(*) AS total FROM mistakes WHERE resolved = 0 GROUP BY topic_id ORDER BY total DESC',
    );
    return rows.map((r) => ({ topicId: r.topic_id, count: r.total }));
  }
}

export class LocalProgressRepository implements ProgressRepository {
  constructor(private readonly db: SqlDatabase) {}

  async getProgress(userId: ID): Promise<UserProgress> {
    const row = await this.db.selectOne<Row>('SELECT * FROM user_progress WHERE user_id = ?', [userId]);
    if (row) return rowToUserProgress(row);
    const progress: UserProgress = {
      ...newSyncMeta(),
      userId,
      xp: 0,
      coins: 0,
      level: 1,
      questionsSolved: 0,
      questionsCorrect: 0,
      totalTimeMs: 0,
      lessonsCompleted: 0,
      examsTaken: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDay: null,
      overallMastery: 0,
      thinkingScore: 0,
      tier: tierForXp(0),
    };
    await this.updateProgress(progress);
    return progress;
  }

  async updateProgress(progress: UserProgress): Promise<void> {
    const statement = insertOrReplace('user_progress', userProgressToRow(progress));
    await this.db.execute(statement.sql, statement.params);
  }

  async getTopicProgress(topicId?: ID): Promise<TopicProgress[]> {
    const where = new WhereBuilder().eq('topic_id', topicId).build();
    const rows = await this.db.select<Row>('SELECT * FROM topic_progress' + where.sql, where.params);
    return rows.map(rowToTopicProgress);
  }

  async upsertTopicProgress(progress: TopicProgress): Promise<void> {
    const statement = insertOrReplace('topic_progress', topicProgressToRow(progress));
    await this.db.execute(statement.sql, statement.params);
  }

  async getSkillProgress(skillIds?: ID[]): Promise<SkillProgress[]> {
    const where = new WhereBuilder().in('skill_id', skillIds).build();
    const rows = await this.db.select<Row>('SELECT * FROM skill_progress' + where.sql, where.params);
    return rows.map(rowToSkillProgress);
  }

  async upsertSkillProgress(progress: SkillProgress): Promise<void> {
    const statement = insertOrReplace('skill_progress', skillProgressToRow(progress));
    await this.db.execute(statement.sql, statement.params);
  }

  async getDailyActivity(days: number): Promise<DailyActivity[]> {
    const rows = await this.db.select<Row>('SELECT * FROM daily_activity ORDER BY day DESC LIMIT ?', [
      Math.max(1, Math.min(400, days)),
    ]);
    return rows.map(rowToDailyActivity);
  }

  async getDailyActivityForDay(day: string): Promise<DailyActivity | null> {
    const row = await this.db.selectOne<Row>('SELECT * FROM daily_activity WHERE day = ?', [day]);
    return row ? rowToDailyActivity(row) : null;
  }

  async upsertDailyActivity(activity: DailyActivity): Promise<void> {
    const statement = insertOrReplace('daily_activity', dailyActivityToRow(activity));
    await this.db.execute(statement.sql, statement.params);
  }

  async getStreak(): Promise<StreakState> {
    const row = await this.db.selectOne<Row>('SELECT * FROM streaks WHERE id = ?', [SINGLETON_ID]);
    if (row) return rowToStreak(row);
    const streak: StreakState = {
      ...newSyncMeta(),
      id: SINGLETON_ID,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDay: null,
      freezesAvailable: 0,
    };
    await this.updateStreak(streak);
    return streak;
  }

  async updateStreak(streak: StreakState): Promise<void> {
    const statement = insertOrReplace('streaks', streakToRow(streak));
    await this.db.execute(statement.sql, statement.params);
  }

  async getBrainProgress(): Promise<BrainCategoryProgress[]> {
    const rows = await this.db.select<Row>('SELECT * FROM brain_progress');
    const existing = rows.map(rowToBrainProgress);
    const known = new Set(existing.map((e) => e.category));
    // Report every category so the Daily Brain screen can show all of them.
    const missing = BRAIN_CATEGORIES.filter((c) => !known.has(c)).map((category) => ({
      ...newSyncMeta(),
      id: 'brain-' + category,
      category,
      attempts: 0,
      correct: 0,
      mastery: 0,
      lastPracticedAt: null,
    }));
    return [...existing, ...missing];
  }

  async upsertBrainProgress(progress: BrainCategoryProgress): Promise<void> {
    const statement = insertOrReplace('brain_progress', brainProgressToRow(progress));
    await this.db.execute(statement.sql, statement.params);
  }

  async getThinkingScore(): Promise<ThinkingScoreState> {
    const row = await this.db.selectOne<Row>('SELECT * FROM thinking_score WHERE id = ?', [SINGLETON_ID]);
    if (row) return rowToThinkingScore(row);
    const dimensions = {} as ThinkingScoreState['dimensions'];
    for (const d of THINKING_DIMENSIONS) dimensions[d] = 0;
    const state: ThinkingScoreState = {
      ...newSyncMeta(),
      id: SINGLETON_ID,
      score: 0,
      dimensions,
      updatedDay: dayKey(),
    };
    await this.updateThinkingScore(state);
    return state;
  }

  async updateThinkingScore(state: ThinkingScoreState): Promise<void> {
    const statement = insertOrReplace('thinking_score', thinkingScoreToRow(state));
    await this.db.execute(statement.sql, statement.params);
    await this.db.execute(
      'INSERT OR REPLACE INTO thinking_score_history (day, score, dimensions_json, created_at) VALUES (?, ?, ?, ?)',
      [state.updatedDay, state.score, JSON.stringify(state.dimensions), Date.now()],
    );
  }

  async getGoals(): Promise<StudyGoal[]> {
    const rows = await this.db.select<Row>('SELECT * FROM study_goals ORDER BY kind');
    return rows.map(rowToGoal);
  }

  async upsertGoal(goal: StudyGoal): Promise<void> {
    const statement = insertOrReplace('study_goals', goalToRow(goal));
    await this.db.execute(statement.sql, statement.params);
  }

  async removeGoal(id: ID): Promise<void> {
    await this.db.execute('DELETE FROM study_goals WHERE id = ?', [id]);
  }

  /** Score history for the progress chart. */
  async getThinkingHistory(days = 30): Promise<{ day: string; score: number }[]> {
    return this.db.select<{ day: string; score: number }>(
      'SELECT day, score FROM thinking_score_history ORDER BY day DESC LIMIT ?',
      [days],
    );
  }
}

export class LocalReviewRepository implements ReviewRepository {
  constructor(private readonly db: SqlDatabase) {}

  async upsertReviewItem(item: ReviewItem): Promise<void> {
    const existing = await this.getReviewItem(item.itemType, item.itemId);
    const row = reviewItemToRow(existing ? { ...item, id: existing.id } : item);
    const statement = insertOrReplace('review_items', row);
    await this.db.execute(statement.sql, statement.params);
  }

  async getDueItems(now: number, limit = 50): Promise<ReviewItem[]> {
    const rows = await this.db.select<Row>(
      'SELECT * FROM review_items WHERE due_at <= ? ORDER BY lapses DESC, due_at ASC LIMIT ?',
      [now, limit],
    );
    return rows.map(rowToReviewItem);
  }

  async getReviewItem(itemType: ReviewItem['itemType'], itemId: ID): Promise<ReviewItem | null> {
    const row = await this.db.selectOne<Row>(
      'SELECT * FROM review_items WHERE item_type = ? AND item_id = ?',
      [itemType, itemId],
    );
    return row ? rowToReviewItem(row) : null;
  }

  async countDue(now: number): Promise<number> {
    const row = await this.db.selectOne<{ total: number }>(
      'SELECT COUNT(*) AS total FROM review_items WHERE due_at <= ?',
      [now],
    );
    return row?.total ?? 0;
  }

  async removeReviewItem(id: ID): Promise<void> {
    await this.db.execute('DELETE FROM review_items WHERE id = ?', [id]);
  }
}

export class LocalBookmarkRepository implements BookmarkRepository {
  constructor(private readonly db: SqlDatabase) {}

  async addBookmark(bookmark: Bookmark): Promise<void> {
    const statement = insertOrReplace('bookmarks', bookmarkToRow(bookmark));
    await this.db.execute(statement.sql, statement.params);
  }

  async removeBookmark(itemType: BookmarkItemType, itemId: ID): Promise<void> {
    await this.db.execute('DELETE FROM bookmarks WHERE item_type = ? AND item_id = ?', [itemType, itemId]);
  }

  async getBookmarks(itemType?: BookmarkItemType): Promise<Bookmark[]> {
    const where = new WhereBuilder().eq('item_type', itemType).build();
    const rows = await this.db.select<Row>(
      'SELECT * FROM bookmarks' + where.sql + ' ORDER BY created_at DESC LIMIT 300',
      where.params,
    );
    return rows.map(rowToBookmark);
  }

  async isBookmarked(itemType: BookmarkItemType, itemId: ID): Promise<boolean> {
    const row = await this.db.selectOne<{ total: number }>(
      'SELECT COUNT(*) AS total FROM bookmarks WHERE item_type = ? AND item_id = ?',
      [itemType, itemId],
    );
    return (row?.total ?? 0) > 0;
  }
}

export class LocalAchievementRepository implements AchievementRepository {
  constructor(private readonly db: SqlDatabase) {}

  /** The catalogue is static content shipped with the app. */
  async getCatalog(): Promise<Achievement[]> {
    return ACHIEVEMENTS;
  }

  async getUnlocked(): Promise<UnlockedAchievement[]> {
    const rows = await this.db.select<Row>('SELECT * FROM unlocked_achievements ORDER BY unlocked_at DESC');
    return rows.map(rowToUnlockedAchievement);
  }

  async unlock(unlocked: UnlockedAchievement): Promise<void> {
    const row = unlockedAchievementToRow({ ...unlocked, id: unlocked.id || uuid() });
    const columns = Object.keys(row);
    await this.db.execute(
      'INSERT OR IGNORE INTO unlocked_achievements (' +
        columns.join(', ') +
        ') VALUES (' +
        placeholders(columns.length) +
        ')',
      columns.map((c) => row[c]),
    );
  }

  async markSeen(codes: string[]): Promise<void> {
    if (codes.length === 0) return;
    await this.db.execute(
      'UPDATE unlocked_achievements SET seen = 1 WHERE achievement_code IN (' + placeholders(codes.length) + ')',
      codes,
    );
  }
}
