import type { Migration } from './index';

/**
 * User data. Every table carries the sync columns from day one (spec §57), so
 * adding a backend later needs no schema change to the meaning of a row.
 */
export const migration002: Migration = {
  version: 2,
  name: 'user_data',
  statements: [
    `CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      avatar_emoji TEXT NOT NULL DEFAULT '🧑‍🎓',
      learning_goal TEXT NOT NULL DEFAULT 'school',
      language TEXT NOT NULL DEFAULT 'bn',
      daily_goal_questions INTEGER NOT NULL DEFAULT 20,
      daily_goal_minutes INTEGER NOT NULL DEFAULT 20,
      difficulty_preference TEXT NOT NULL DEFAULT 'adaptive',
      remote_user_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,

    `CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      language TEXT NOT NULL DEFAULT 'bn',
      theme_mode TEXT NOT NULL DEFAULT 'system',
      reduce_animations INTEGER NOT NULL DEFAULT 0,
      large_text INTEGER NOT NULL DEFAULT 0,
      high_contrast INTEGER NOT NULL DEFAULT 0,
      sound_enabled INTEGER NOT NULL DEFAULT 1,
      haptics_enabled INTEGER NOT NULL DEFAULT 1,
      show_bangla_digits INTEGER NOT NULL DEFAULT 1,
      think_first_enabled INTEGER NOT NULL DEFAULT 1,
      adaptive_difficulty_enabled INTEGER NOT NULL DEFAULT 1,
      spaced_repetition_enabled INTEGER NOT NULL DEFAULT 1,
      enabled_pack_ids TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,

    `CREATE TABLE IF NOT EXISTS question_attempts (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      skill_ids TEXT NOT NULL DEFAULT '[]',
      session_id TEXT,
      mode TEXT NOT NULL,
      difficulty INTEGER NOT NULL,
      is_correct INTEGER NOT NULL,
      given_answer TEXT NOT NULL DEFAULT '',
      correct_answer TEXT NOT NULL DEFAULT '',
      time_spent_ms INTEGER NOT NULL DEFAULT 0,
      hints_used INTEGER NOT NULL DEFAULT 0,
      estimate_value REAL,
      estimate_accuracy REAL,
      strategy TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE INDEX IF NOT EXISTS idx_attempts_created ON question_attempts (created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_attempts_topic ON question_attempts (topic_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_attempts_question ON question_attempts (question_id)`,
    `CREATE INDEX IF NOT EXISTS idx_attempts_mode ON question_attempts (mode, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_attempts_correct ON question_attempts (is_correct, created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS attempt_skills (
      attempt_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (attempt_id, skill_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_attempt_skills_skill ON attempt_skills (skill_id, created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS mistakes (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL UNIQUE,
      topic_id TEXT NOT NULL,
      skill_ids TEXT NOT NULL DEFAULT '[]',
      difficulty INTEGER NOT NULL DEFAULT 1,
      mistake_count INTEGER NOT NULL DEFAULT 1,
      last_mistake_at INTEGER NOT NULL,
      correct_streak INTEGER NOT NULL DEFAULT 0,
      resolved INTEGER NOT NULL DEFAULT 0,
      question_snapshot TEXT NOT NULL DEFAULT '',
      reason TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mistakes_topic ON mistakes (topic_id, resolved)`,
    `CREATE INDEX IF NOT EXISTS idx_mistakes_resolved ON mistakes (resolved, last_mistake_at DESC)`,

    `CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      questions_answered INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      topic_id TEXT,
      meta TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_started ON study_sessions (started_at DESC)`,
  ],
};
