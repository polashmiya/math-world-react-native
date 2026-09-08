import type { Migration } from './index';

/** Progress, mastery, streaks and gamification state. */
export const migration003: Migration = {
  version: 3,
  name: 'progress',
  statements: [
    `CREATE TABLE IF NOT EXISTS user_progress (
      user_id TEXT PRIMARY KEY,
      xp INTEGER NOT NULL DEFAULT 0,
      coins INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      questions_solved INTEGER NOT NULL DEFAULT 0,
      questions_correct INTEGER NOT NULL DEFAULT 0,
      total_time_ms INTEGER NOT NULL DEFAULT 0,
      lessons_completed INTEGER NOT NULL DEFAULT 0,
      exams_taken INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_active_day TEXT,
      overall_mastery REAL NOT NULL DEFAULT 0,
      thinking_score INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'bronze',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,

    `CREATE TABLE IF NOT EXISTS topic_progress (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL UNIQUE,
      attempts INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      total_time_ms INTEGER NOT NULL DEFAULT 0,
      mastery REAL NOT NULL DEFAULT 0,
      best_difficulty INTEGER NOT NULL DEFAULT 1,
      last_practiced_at INTEGER,
      boss_defeated_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE INDEX IF NOT EXISTS idx_topic_progress_mastery ON topic_progress (mastery)`,

    `CREATE TABLE IF NOT EXISTS skill_progress (
      id TEXT PRIMARY KEY,
      skill_id TEXT NOT NULL UNIQUE,
      topic_id TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      total_time_ms INTEGER NOT NULL DEFAULT 0,
      mastery REAL NOT NULL DEFAULT 0,
      recent_outcomes TEXT NOT NULL DEFAULT '',
      last_practiced_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE INDEX IF NOT EXISTS idx_skill_progress_topic ON skill_progress (topic_id)`,
    `CREATE INDEX IF NOT EXISTS idx_skill_progress_mastery ON skill_progress (mastery)`,

    `CREATE TABLE IF NOT EXISTS completed_lessons (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL UNIQUE,
      topic_id TEXT NOT NULL,
      completed_at INTEGER NOT NULL,
      mastery_score REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,

    `CREATE TABLE IF NOT EXISTS daily_activity (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL UNIQUE,
      questions_answered INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      minutes_studied INTEGER NOT NULL DEFAULT 0,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      brain_score INTEGER NOT NULL DEFAULT 0,
      goal_met INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE INDEX IF NOT EXISTS idx_daily_activity_day ON daily_activity (day DESC)`,

    `CREATE TABLE IF NOT EXISTS streaks (
      id TEXT PRIMARY KEY,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_active_day TEXT,
      freezes_available INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,

    `CREATE TABLE IF NOT EXISTS unlocked_achievements (
      id TEXT PRIMARY KEY,
      achievement_code TEXT NOT NULL UNIQUE,
      unlocked_at INTEGER NOT NULL,
      seen INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,

    `CREATE TABLE IF NOT EXISTS brain_progress (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL UNIQUE,
      attempts INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      mastery REAL NOT NULL DEFAULT 0,
      last_practiced_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,
  ],
};
