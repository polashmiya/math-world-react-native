import type { AcademicLevel } from '../../core/constants/levels';
import type { ID } from './common';
import type { Exam } from './exam';
import type { Formula } from './formula';
import type { GameDefinition, Challenge } from './game';
import type { Lesson } from './lesson';
import type { Question } from './question';
import type { Curriculum, Skill, Subject, Topic } from './topic';

/** Content pack metadata (spec §10). Packs ship bundled in version 1. */
export interface ContentPackMeta {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  emoji: string;
  version: number;
  schemaVersion: number;
  levels: AcademicLevel[];
  /** Packs that must be seeded first. */
  requires: string[];
  /** Core packs cannot be disabled. */
  core: boolean;
  sizeHintKb: number;
}

export interface ContentPack {
  meta: ContentPackMeta;
  curriculums?: Curriculum[];
  subjects?: Subject[];
  topics?: Topic[];
  skills?: Skill[];
  lessons?: Lesson[];
  questions?: Question[];
  formulas?: Formula[];
  exams?: Exam[];
  games?: GameDefinition[];
  challenges?: Challenge[];
}

export interface InstalledPack {
  id: string;
  version: number;
  seededAt: number;
  enabled: boolean;
  checksum: string;
}

export interface PackSeedReport {
  packId: string;
  version: number;
  inserted: Record<string, number>;
  skipped: boolean;
  issues: string[];
  durationMs: number;
}

export interface ContentStats {
  topics: number;
  lessons: number;
  questions: number;
  formulas: number;
  exams: number;
  games: number;
  challenges: number;
  skills: number;
}

export type ContentEntityKind = keyof Omit<ContentPack, 'meta'>;

export function packChecksum(pack: ContentPack): string {
  const counts: (string | number)[] = [pack.meta.id, pack.meta.version];
  const kinds: ContentEntityKind[] = [
    'curriculums',
    'subjects',
    'topics',
    'skills',
    'lessons',
    'questions',
    'formulas',
    'exams',
    'games',
    'challenges',
  ];
  for (const k of kinds) counts.push(k + '=' + (pack[k]?.length ?? 0));
  return counts.join('|');
}

export function packEntityIds(pack: ContentPack): ID[] {
  const ids: ID[] = [];
  for (const t of pack.topics ?? []) ids.push(t.id);
  for (const q of pack.questions ?? []) ids.push(q.id);
  for (const l of pack.lessons ?? []) ids.push(l.id);
  return ids;
}
