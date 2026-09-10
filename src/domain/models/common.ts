export type ID = string;

/**
 * Fields every synchronisable record carries (spec §57). Version 1 never talks
 * to a server, but persisting them from day one means the future sync engine
 * needs no migration of meaning.
 */
export interface SyncMeta {
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
  syncStatus: SyncStatus;
  lastSyncedAt?: number | null;
  version: number;
}

export type SyncStatus = 'local' | 'pending' | 'synced' | 'conflict';

export const CURRENT_SCHEMA_VERSION = 7;
export const CURRENT_CONTENT_VERSION = 1;

export function newSyncMeta(now = Date.now()): SyncMeta {
  return {
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'local',
    lastSyncedAt: null,
    version: 1,
  };
}

/**
 * Bumps the sync metadata on a record while preserving the record itself, so
 * callers can write `{ ...touchSyncMeta(entity), field: value }`.
 */
export function touchSyncMeta<T extends SyncMeta>(entity: T, now = Date.now()): T {
  return { ...entity, updatedAt: now, version: entity.version + 1, syncStatus: 'pending' };
}

/** Paged result used everywhere a list could grow large (spec §8). */
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PageRequest {
  limit?: number;
  offset?: number;
}

export function emptyPage<T>(limit = 20, offset = 0): Page<T> {
  return { items: [], total: 0, limit, offset, hasMore: false };
}

export function makePage<T>(items: T[], total: number, limit: number, offset: number): Page<T> {
  return { items, total, limit, offset, hasMore: offset + items.length < total };
}
