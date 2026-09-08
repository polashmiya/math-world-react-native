import * as SQLite from 'expo-sqlite';
import { DatabaseError } from '../../../core/errors';
import type { SqlDatabase, SqlStatement, SqlValue } from './adapter';

export const DATABASE_NAME = 'mathworld.db';

/**
 * `expo-sqlite` implementation of `SqlDatabase`. This is the only file in the
 * app that imports a storage library.
 */
class ExpoSqlDatabase implements SqlDatabase {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async execute(sql: string, params: SqlValue[] = []): Promise<void> {
    try {
      await this.db.runAsync(sql, params);
    } catch (error) {
      throw wrap(error, sql);
    }
  }

  async executeBatch(statements: readonly SqlStatement[]): Promise<void> {
    for (const statement of statements) {
      await this.execute(statement.sql, statement.params ?? []);
    }
  }

  async select<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    try {
      return (await this.db.getAllAsync<T>(sql, params)) ?? [];
    } catch (error) {
      throw wrap(error, sql);
    }
  }

  async selectOne<T>(sql: string, params: SqlValue[] = []): Promise<T | null> {
    try {
      return (await this.db.getFirstAsync<T>(sql, params)) ?? null;
    } catch (error) {
      throw wrap(error, sql);
    }
  }

  async transaction<T>(fn: (tx: SqlDatabase) => Promise<T>): Promise<T> {
    let result: T;
    try {
      // Only queries issued through the `txn` handle join an exclusive
      // transaction, so the callback is given a wrapper around it rather than
      // around `this` (expo-sqlite SDK 57).
      await this.db.withExclusiveTransactionAsync(async (txn) => {
        result = await fn(new ExpoSqlDatabase(txn));
      });
    } catch (error) {
      throw wrap(error, 'transaction');
    }
    // `result` is always assigned: withExclusiveTransactionAsync awaits the callback.
    return result!;
  }

  async close(): Promise<void> {
    try {
      await this.db.closeAsync();
    } catch (error) {
      throw wrap(error, 'close');
    }
  }
}

function wrap(error: unknown, sql: string): DatabaseError {
  const message = error instanceof Error ? error.message : String(error);
  return new DatabaseError('SQLite failed: ' + message, { sql });
}

/**
 * Opens the app database with WAL journalling and foreign keys enabled.
 * If the file is unreadable (corrupted install, interrupted update) the caller
 * can retry with `resetCorruptDatabase` (spec §53).
 */
export async function openAppDatabase(name = DATABASE_NAME): Promise<SqlDatabase> {
  try {
    const db = await SQLite.openDatabaseAsync(name);
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    return new ExpoSqlDatabase(db);
  } catch (error) {
    throw wrap(error, 'open ' + name);
  }
}

/** Last resort for an unreadable database: content is re-seeded afterwards. */
export async function resetCorruptDatabase(name = DATABASE_NAME): Promise<SqlDatabase> {
  await SQLite.deleteDatabaseAsync(name).catch(() => undefined);
  return openAppDatabase(name);
}

/** Quick integrity probe used at startup. */
export async function checkIntegrity(db: SqlDatabase): Promise<boolean> {
  const row = await db.selectOne<{ integrity_check: string }>('PRAGMA integrity_check;');
  const value = row ? Object.values(row)[0] : 'unknown';
  return String(value).toLowerCase() === 'ok';
}
