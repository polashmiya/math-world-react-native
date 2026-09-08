import type { Migration } from './index';

/** Spaced repetition queue and bookmarks. */
export const migration004: Migration = {
  version: 4,
  name: 'review_bookmarks',
  statements: [
    `CREATE TABLE IF NOT EXISTS review_items (
      id TEXT PRIMARY KEY,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      topic_id TEXT,
      stage INTEGER NOT NULL DEFAULT 0,
      due_at INTEGER NOT NULL,
      last_reviewed_at INTEGER,
      repetitions INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      ease REAL NOT NULL DEFAULT 2.2,
      snapshot TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_review_unique ON review_items (item_type, item_id)`,
    `CREATE INDEX IF NOT EXISTS idx_review_due ON review_items (due_at)`,
    `CREATE INDEX IF NOT EXISTS idx_review_topic ON review_items (topic_id, due_at)`,

    `CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      note TEXT,
      snapshot TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'local',
      last_synced_at INTEGER,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_unique ON bookmarks (item_type, item_id)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_type ON bookmarks (item_type, created_at DESC)`,
  ],
};
