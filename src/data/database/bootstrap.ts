import { DatabaseError } from '../../core/errors';
import type { Language } from '../../core/constants/levels';
import type { RepositoryRegistry } from '../../domain/repositories';
import { createLocalRepositories } from '../repositories/local';
import { runMigrations, schemaVersion, type MigrationReport } from './migrations';
import { seedContent, type SeedSummary } from './seed/seeder';
import type { SqlDatabase } from './sqlite/adapter';
import { checkIntegrity, openAppDatabase, resetCorruptDatabase } from './sqlite/expoDatabase';

export interface BootstrapResult {
  db: SqlDatabase;
  repositories: RepositoryRegistry;
  schemaVersion: number;
  migrations: MigrationReport;
  seed: SeedSummary;
  /** True when a corrupt database had to be rebuilt from scratch. */
  recovered: boolean;
  durationMs: number;
}

export interface BootstrapOptions {
  language?: Language;
  onProgress?: (stage: BootstrapStage, detail?: string) => void;
  /** Injected in tests; defaults to the expo-sqlite database. */
  openDatabase?: () => Promise<SqlDatabase>;
  forceReseed?: boolean;
}

export type BootstrapStage = 'opening' | 'migrating' | 'seeding' | 'ready' | 'recovering';

/**
 * Startup sequence: open → integrity check → migrate → seed → build
 * repositories. Everything here works with no network and no account.
 */
export async function bootstrapDatabase(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const started = Date.now();
  const open = options.openDatabase ?? (() => openAppDatabase());
  const report = (stage: BootstrapStage, detail?: string): void => options.onProgress?.(stage, detail);

  report('opening');
  let db: SqlDatabase;
  let recovered = false;
  try {
    db = await open();
    const healthy = await checkIntegrity(db).catch(() => false);
    if (!healthy) throw new DatabaseError('Integrity check failed');
  } catch (error) {
    // Corrupted or unreadable database: rebuild it rather than crash (spec §53).
    report('recovering', error instanceof Error ? error.message : undefined);
    if (options.openDatabase) throw error;
    db = await resetCorruptDatabase();
    recovered = true;
  }

  report('migrating');
  const migrations = await runMigrations(db);

  report('seeding');
  const seed = await seedContent(db, undefined, {
    force: options.forceReseed,
    onProgress: (packId, index, total) => report('seeding', packId + ' (' + (index + 1) + '/' + total + ')'),
  });

  const version = await schemaVersion(db);
  const repositories = createLocalRepositories(db, options.language ?? 'bn');
  report('ready');

  return {
    db,
    repositories,
    schemaVersion: version,
    migrations,
    seed,
    recovered,
    durationMs: Date.now() - started,
  };
}
