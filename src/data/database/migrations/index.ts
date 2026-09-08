import { MigrationError } from '../../../core/errors';
import type { SqlDatabase } from '../sqlite/adapter';
import { migration001 } from './001_core_content';
import { migration002 } from './002_user_data';
import { migration003 } from './003_progress';
import { migration004 } from './004_review_bookmarks';
import { migration005 } from './005_games_exams';
import { migration006 } from './006_goals_indexes';

export interface Migration {
  version: number;
  name: string;
  /** Statements are applied in order inside a single transaction. */
  statements: string[];
}

/**
 * Migrations are append-only and never destructive (spec §42): each one only
 * creates tables or adds columns/indexes, so user progress survives upgrades.
 */
export const MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export interface MigrationReport {
  fromVersion: number;
  toVersion: number;
  applied: { version: number; name: string; durationMs: number }[];
}

async function currentVersion(db: SqlDatabase): Promise<number> {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS schema_migrations (' +
      'version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL)',
  );
  const row = await db.selectOne<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_migrations',
  );
  return row?.version ?? 0;
}

/** Applies every pending migration. Safe to call on every app start. */
export async function runMigrations(db: SqlDatabase): Promise<MigrationReport> {
  const sorted = MIGRATIONS.slice().sort((a, b) => a.version - b.version);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].version !== i + 1) {
      throw new MigrationError(
        'Migrations must be numbered consecutively from 1; found ' + sorted[i].version + ' at position ' + (i + 1),
      );
    }
  }

  const from = await currentVersion(db);
  const report: MigrationReport = { fromVersion: from, toVersion: from, applied: [] };

  for (const migration of sorted) {
    if (migration.version <= from) continue;
    const started = Date.now();
    try {
      await db.transaction(async (tx) => {
        for (const statement of migration.statements) {
          await tx.execute(statement);
        }
        await tx.execute(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
          [migration.version, migration.name, Date.now()],
        );
      });
    } catch (error) {
      throw new MigrationError(
        'Migration ' + migration.version + ' (' + migration.name + ') failed: ' +
          (error instanceof Error ? error.message : String(error)),
        { version: migration.version },
      );
    }
    report.applied.push({
      version: migration.version,
      name: migration.name,
      durationMs: Date.now() - started,
    });
    report.toVersion = migration.version;
  }

  return report;
}

export async function schemaVersion(db: SqlDatabase): Promise<number> {
  return currentVersion(db);
}
