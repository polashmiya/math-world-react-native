import type { Migration } from './index';

/** Study goals, the thinking-score profile, and search-oriented indexes. */
export const migration006: Migration = {
  version: 6,
  name: 'goals_indexes',
  statements: [
    `CREATE TABLE IF NOT EXISTS study_goals (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      target INTEGER NOT NULL DEFAULT 0,
      progress INTEGER NOT NULL DEFAULT 0,
      period_key TEXT,
      topic_id TEXT,
      exam_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE INDEX IF NOT EXISTS idx_goals_active ON study_goals (active, kind)`,

    `CREATE TABLE IF NOT EXISTS thinking_score (
      id TEXT PRIMARY KEY,
      score INTEGER NOT NULL DEFAULT 0,
      dimensions_json TEXT NOT NULL DEFAULT '{}',
      updated_day TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,

    `CREATE TABLE IF NOT EXISTS thinking_score_history (
      day TEXT PRIMARY KEY,
      score INTEGER NOT NULL DEFAULT 0,
      dimensions_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    )`,

    // Search support: a pre-lowercased column keeps global search cheap.
    `ALTER TABLE questions ADD COLUMN search_text TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_questions_search ON questions (search_text)`,
    `ALTER TABLE lessons ADD COLUMN search_text TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_lessons_search ON lessons (search_text)`,
    `ALTER TABLE formulas ADD COLUMN search_text TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_formulas_search ON formulas (search_text)`,
    `ALTER TABLE topics ADD COLUMN search_text TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_topics_search ON topics (search_text)`,
  ],
};
