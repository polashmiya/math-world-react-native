import { ContentError } from '../../../core/errors';
import { packChecksum } from '../../../domain/models';
import type { ContentPack, PackSeedReport } from '../../../domain/models';
import { CONTENT_PACKS } from '../../content/packs';
import {
  challengeToRow,
  curriculumToRow,
  examToRow,
  formulaToRow,
  gameToRow,
  lessonToRow,
  questionToRow,
  skillToRow,
  subjectToRow,
  topicToRow,
  type Row,
} from '../../repositories/local/mappers';
import { placeholders, type SqlDatabase } from '../sqlite/adapter';
import { collectKnownIds, formatReport, validatePack, type ValidationReport } from './validator';

export interface SeedOptions {
  /** Re-seed even when the stored checksum and version already match. */
  force?: boolean;
  /** Restrict seeding to these pack ids. */
  packIds?: string[];
  /** Called with progress so the splash screen can show it. */
  onProgress?: (packId: string, index: number, total: number) => void;
}

export interface SeedSummary {
  reports: PackSeedReport[];
  validation: ValidationReport[];
  totalInserted: number;
  durationMs: number;
}

/**
 * JSON/TS content → validation → normalisation → SQLite (spec §50).
 *
 * Seeding is idempotent: a pack whose version and checksum already match is
 * skipped, and re-seeding only ever touches content tables, never user data.
 */
export async function seedContent(
  db: SqlDatabase,
  packs: readonly ContentPack[] = CONTENT_PACKS,
  options: SeedOptions = {},
): Promise<SeedSummary> {
  const started = Date.now();
  const selected = options.packIds
    ? packs.filter((p) => options.packIds!.includes(p.meta.id))
    : packs.slice();

  const ordered = orderByDependency(selected);
  const knownIds = collectKnownIds(packs);
  const validation = ordered.map((pack) => validatePack(pack, knownIds));

  const invalid = validation.filter((report) => !report.valid);
  if (invalid.length > 0) {
    throw new ContentError('Content validation failed; nothing was seeded', {
      details: invalid.map(formatReport).join('\n'),
    });
  }

  const reports: PackSeedReport[] = [];
  for (let index = 0; index < ordered.length; index++) {
    const pack = ordered[index];
    options.onProgress?.(pack.meta.id, index, ordered.length);
    reports.push(await seedPack(db, pack, options.force ?? false));
  }

  return {
    reports,
    validation,
    totalInserted: reports.reduce(
      (acc, r) => acc + Object.values(r.inserted).reduce((a, b) => a + b, 0),
      0,
    ),
    durationMs: Date.now() - started,
  };
}

async function seedPack(db: SqlDatabase, pack: ContentPack, force: boolean): Promise<PackSeedReport> {
  const started = Date.now();
  const checksum = packChecksum(pack);
  const existing = await db.selectOne<{ version: number; checksum: string }>(
    'SELECT version, checksum FROM content_packs WHERE id = ?',
    [pack.meta.id],
  );

  if (!force && existing && existing.version === pack.meta.version && existing.checksum === checksum) {
    return {
      packId: pack.meta.id,
      version: pack.meta.version,
      inserted: {},
      skipped: true,
      issues: [],
      durationMs: Date.now() - started,
    };
  }

  const inserted: Record<string, number> = {};
  const packId = pack.meta.id;

  await db.transaction(async (tx) => {
    const insertAll = async (table: string, rows: Row[]): Promise<void> => {
      if (rows.length === 0) return;
      for (const row of rows) {
        const columns = Object.keys(row);
        await tx.execute(
          'INSERT OR REPLACE INTO ' +
            table +
            ' (' +
            columns.join(', ') +
            ') VALUES (' +
            placeholders(columns.length) +
            ')',
          columns.map((c) => row[c]),
        );
      }
      inserted[table] = (inserted[table] ?? 0) + rows.length;
    };

    await insertAll('curriculums', (pack.curriculums ?? []).map(curriculumToRow));
    await insertAll('subjects', (pack.subjects ?? []).map(subjectToRow));
    await insertAll('topics', (pack.topics ?? []).map((t) => topicToRow(t, packId)));
    await insertAll('skills', (pack.skills ?? []).map((s) => skillToRow(s, packId)));
    await insertAll('lessons', (pack.lessons ?? []).map((l) => lessonToRow(l, packId)));
    await insertAll('formulas', (pack.formulas ?? []).map((f) => formulaToRow(f, packId)));
    await insertAll('exams', (pack.exams ?? []).map((e) => examToRow(e, packId)));
    await insertAll('games', (pack.games ?? []).map((g) => gameToRow(g, packId)));
    await insertAll('challenges', (pack.challenges ?? []).map((c) => challengeToRow(c, packId)));

    // Questions carry join rows for indexable skill/exam/tag lookups.
    for (const question of pack.questions ?? []) {
      const row = questionToRow(question, packId);
      const columns = Object.keys(row);
      await tx.execute(
        'INSERT OR REPLACE INTO questions (' +
          columns.join(', ') +
          ') VALUES (' +
          placeholders(columns.length) +
          ')',
        columns.map((c) => row[c]),
      );
      await tx.execute('DELETE FROM question_skills WHERE question_id = ?', [question.id]);
      await tx.execute('DELETE FROM question_exams WHERE question_id = ?', [question.id]);
      await tx.execute('DELETE FROM question_tags WHERE question_id = ?', [question.id]);
      for (const skillId of question.skillIds) {
        await tx.execute('INSERT OR IGNORE INTO question_skills (question_id, skill_id) VALUES (?, ?)', [
          question.id,
          skillId,
        ]);
      }
      for (const examId of question.examIds) {
        await tx.execute('INSERT OR IGNORE INTO question_exams (question_id, exam_id) VALUES (?, ?)', [
          question.id,
          examId,
        ]);
      }
      for (const tag of question.tags) {
        await tx.execute('INSERT OR IGNORE INTO question_tags (question_id, tag) VALUES (?, ?)', [
          question.id,
          tag,
        ]);
      }
    }
    if ((pack.questions ?? []).length > 0) {
      inserted.questions = (pack.questions ?? []).length;
    }

    await tx.execute(
      'INSERT INTO content_packs (id, version, schema_version, name, name_bn, description, description_bn, emoji, core, enabled, checksum, seeded_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(id) DO UPDATE SET version = excluded.version, schema_version = excluded.schema_version, ' +
        'name = excluded.name, name_bn = excluded.name_bn, description = excluded.description, ' +
        'description_bn = excluded.description_bn, emoji = excluded.emoji, core = excluded.core, ' +
        'checksum = excluded.checksum, seeded_at = excluded.seeded_at',
      [
        pack.meta.id,
        pack.meta.version,
        pack.meta.schemaVersion,
        pack.meta.name,
        pack.meta.nameBn,
        pack.meta.description,
        pack.meta.descriptionBn,
        pack.meta.emoji,
        pack.meta.core ? 1 : 0,
        // Core packs are always enabled; others default to enabled on install.
        1,
        checksum,
        Date.now(),
      ],
    );
  });

  return {
    packId: pack.meta.id,
    version: pack.meta.version,
    inserted,
    skipped: false,
    issues: [],
    durationMs: Date.now() - started,
  };
}

/** Topological order so a pack's `requires` are seeded first (spec §10). */
export function orderByDependency(packs: readonly ContentPack[]): ContentPack[] {
  const byId = new Map(packs.map((p) => [p.meta.id, p]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const out: ContentPack[] = [];

  const visit = (pack: ContentPack): void => {
    if (visited.has(pack.meta.id)) return;
    if (visiting.has(pack.meta.id)) {
      throw new ContentError('Circular pack dependency at ' + pack.meta.id);
    }
    visiting.add(pack.meta.id);
    for (const requiredId of pack.meta.requires) {
      const required = byId.get(requiredId);
      // A missing requirement is fine when the pack is not in this selection;
      // it will already have been seeded on a previous run.
      if (required) visit(required);
    }
    visiting.delete(pack.meta.id);
    visited.add(pack.meta.id);
    out.push(pack);
  };

  for (const pack of packs) visit(pack);
  return out;
}

/** Validates every bundled pack without writing anything. */
export function validateAllPacks(packs: readonly ContentPack[] = CONTENT_PACKS): ValidationReport[] {
  const knownIds = collectKnownIds(packs);
  return packs.map((pack) => validatePack(pack, knownIds));
}
