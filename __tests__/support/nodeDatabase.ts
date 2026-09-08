import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase, SqlStatement, SqlValue } from '../../src/data/database/sqlite/adapter';

/**
 * `SqlDatabase` backed by Node's built-in SQLite. Tests therefore exercise the
 * real migrations, real SQL and real indexes rather than a hand-written fake,
 * which is the whole point of keeping storage behind an interface.
 */
class NodeSqlDatabase implements SqlDatabase {
  private depth = 0;

  constructor(private readonly db: DatabaseSync) {}

  async execute(sql: string, params: SqlValue[] = []): Promise<void> {
    this.db.prepare(sql).run(...(params as never[]));
  }

  async executeBatch(statements: readonly SqlStatement[]): Promise<void> {
    for (const statement of statements) {
      await this.execute(statement.sql, statement.params ?? []);
    }
  }

  async select<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    const rows = this.db.prepare(sql).all(...(params as never[]));
    // node:sqlite returns null-prototype objects; normalise them.
    return rows.map((row) => ({ ...(row as object) })) as T[];
  }

  async selectOne<T>(sql: string, params: SqlValue[] = []): Promise<T | null> {
    const row = this.db.prepare(sql).get(...(params as never[]));
    return row ? ({ ...(row as object) } as T) : null;
  }

  async transaction<T>(fn: (tx: SqlDatabase) => Promise<T>): Promise<T> {
    // Nested transactions are flattened: SQLite has no nested BEGIN.
    if (this.depth > 0) return fn(this);
    this.depth++;
    this.db.exec('BEGIN');
    try {
      const result = await fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    } finally {
      this.depth--;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

export function createNodeDatabase(path = ':memory:'): SqlDatabase {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  return new NodeSqlDatabase(db);
}
