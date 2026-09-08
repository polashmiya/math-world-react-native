import { DatabaseError } from '../../../core/errors';

export type SqlValue = string | number | null;

export interface SqlStatement {
  sql: string;
  params?: SqlValue[];
}

/**
 * The only surface the data layer uses to talk to SQLite.
 *
 * Keeping it behind an interface means the same repositories run against
 * `expo-sqlite` on device and against a real SQLite database in Node for
 * tests, and it keeps every storage detail out of the domain (spec §3).
 */
export interface SqlDatabase {
  execute(sql: string, params?: SqlValue[]): Promise<void>;
  executeBatch(statements: readonly SqlStatement[]): Promise<void>;
  select<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): Promise<T[]>;
  selectOne<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): Promise<T | null>;
  transaction<T>(fn: (tx: SqlDatabase) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Builds `(?, ?, ?)` for a parameterised IN clause. */
export function placeholders(count: number): string {
  if (count <= 0) throw new DatabaseError('An IN clause needs at least one value');
  return new Array(count).fill('?').join(', ');
}

export interface WhereClause {
  sql: string;
  params: SqlValue[];
}

/**
 * Small helper for composing WHERE clauses. Every value is bound as a
 * parameter — no user input is ever concatenated into SQL (spec §53).
 */
export class WhereBuilder {
  private readonly parts: string[] = [];
  private readonly values: SqlValue[] = [];

  eq(column: string, value: SqlValue | undefined): this {
    if (value === undefined) return this;
    this.parts.push(column + ' = ?');
    this.values.push(value);
    return this;
  }

  gte(column: string, value: number | undefined): this {
    if (value === undefined) return this;
    this.parts.push(column + ' >= ?');
    this.values.push(value);
    return this;
  }

  lte(column: string, value: number | undefined): this {
    if (value === undefined) return this;
    this.parts.push(column + ' <= ?');
    this.values.push(value);
    return this;
  }

  in(column: string, values: readonly SqlValue[] | undefined): this {
    if (!values || values.length === 0) return this;
    this.parts.push(column + ' IN (' + placeholders(values.length) + ')');
    this.values.push(...values);
    return this;
  }

  notIn(column: string, values: readonly SqlValue[] | undefined): this {
    if (!values || values.length === 0) return this;
    this.parts.push(column + ' NOT IN (' + placeholders(values.length) + ')');
    this.values.push(...values);
    return this;
  }

  like(columns: readonly string[], term: string | undefined): this {
    if (!term || term.trim().length === 0) return this;
    const pattern = '%' + term.trim().toLowerCase() + '%';
    this.parts.push('(' + columns.map((c) => 'LOWER(' + c + ') LIKE ?').join(' OR ') + ')');
    for (let i = 0; i < columns.length; i++) this.values.push(pattern);
    return this;
  }

  raw(sql: string, params: readonly SqlValue[] = []): this {
    this.parts.push(sql);
    this.values.push(...params);
    return this;
  }

  build(): WhereClause {
    return {
      sql: this.parts.length === 0 ? '' : ' WHERE ' + this.parts.join(' AND '),
      params: this.values.slice(),
    };
  }
}

/** Builds an UPSERT for a table with a single-column primary key. */
export function upsertStatement(
  table: string,
  primaryKey: string,
  row: Record<string, SqlValue>,
): SqlStatement {
  const columns = Object.keys(row);
  if (columns.length === 0) throw new DatabaseError('Cannot upsert an empty row into ' + table);
  const updates = columns.filter((c) => c !== primaryKey).map((c) => c + ' = excluded.' + c);
  const sql =
    'INSERT INTO ' +
    table +
    ' (' +
    columns.join(', ') +
    ') VALUES (' +
    placeholders(columns.length) +
    ')' +
    (updates.length > 0
      ? ' ON CONFLICT(' + primaryKey + ') DO UPDATE SET ' + updates.join(', ')
      : ' ON CONFLICT(' + primaryKey + ') DO NOTHING');
  return { sql, params: columns.map((c) => row[c]) };
}

export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

export function intToBool(value: SqlValue | undefined): boolean {
  return value === 1 || value === '1';
}

export function jsonColumn(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/** Parses a JSON column, returning `fallback` instead of throwing (spec §54). */
export function parseJsonColumn<T>(value: SqlValue | undefined, fallback: T): T {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  try {
    const parsed = JSON.parse(value) as T | null;
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export function toNumber(value: SqlValue | undefined, fallback = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function toText(value: SqlValue | undefined, fallback = ''): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? fallback : String(value);
}

export function toNullableText(value: SqlValue | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function toNullableNumber(value: SqlValue | undefined): number | null {
  return typeof value === 'number' ? value : value === null || value === undefined ? null : toNumber(value);
}
