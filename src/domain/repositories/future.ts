/**
 * Interfaces for capabilities that are deliberately NOT implemented in
 * version 1 (spec §55–§58). They exist so the features can be added later
 * without reshaping the domain or the UI.
 *
 * Nothing in the app imports an implementation of these; version 1 ships with
 * `RuleBasedMathTutor` only, and no sync, OCR or teacher code at all.
 */
import type { ID, Question, QuestionAttempt, SyncStatus, Topic, UserProgress } from '../models';

/* ── future AI (spec §55) ────────────────────────────────────────────────── */

/**
 * An offline LLM tutor would implement `MathTutor` (already defined in
 * `./index`) plus this richer surface. The critical rule: the tutor asks the
 * Math Engine for every number and never computes one itself (spec §61.14).
 */
export interface OfflineTutorCapabilities {
  /** Free-form question about a topic, answered from local content only. */
  ask(question: string, context: { topicId?: ID; questionId?: ID }): Promise<string>;
  /** Rewrites an explanation at a simpler reading level. */
  simplify(explanation: string): Promise<string>;
  /** Suggests what to study next, given the local progress record. */
  recommend(progress: UserProgress): Promise<{ topicId: ID; reason: string }[]>;
  /** True when the model is present on the device. */
  isAvailable(): Promise<boolean>;
}

/* ── future OCR (spec §56) ───────────────────────────────────────────────── */

export interface OcrResult {
  /** Raw recognised text, unmodified. */
  text: string;
  /** 0..1 recogniser confidence. */
  confidence: number;
  /** Bounding boxes for the UI to highlight. */
  regions: { x: number; y: number; width: number; height: number; text: string }[];
}

export interface MathOcr {
  recognize(imageUri: string): Promise<OcrResult>;
}

/**
 * Camera → OCR → parser → Math Engine → solution.
 *
 * The parser step is what keeps OCR honest: recognised text is turned into an
 * expression the existing engine can evaluate, and if it cannot be parsed the
 * pipeline reports that rather than guessing an answer.
 */
export interface MathImagePipeline {
  ocr: MathOcr;
  /** Normalises OCR output into an expression string the engine accepts. */
  toExpression(result: OcrResult): { expression: string; confidence: number } | null;
}

/* ── future cloud sync (spec §57) ───────────────────────────────────────── */

export interface SyncQueueItem {
  id: ID;
  entity: string;
  entityId: ID;
  operation: 'create' | 'update' | 'delete';
  payload: string;
  queuedAt: number;
  attempts: number;
  lastError?: string | null;
}

export interface SyncCursor {
  entity: string;
  lastSyncedAt: number;
  lastRemoteVersion: number;
}

export interface SyncEngine {
  /** Local rows whose `syncStatus` is not `synced`. */
  pending(): Promise<SyncQueueItem[]>;
  push(items: readonly SyncQueueItem[]): Promise<{ accepted: ID[]; rejected: { id: ID; reason: string }[] }>;
  pull(cursors: readonly SyncCursor[]): Promise<{ changes: unknown[]; cursors: SyncCursor[] }>;
  /** Resolves a conflict between a local and remote version of one record. */
  resolve(entity: string, entityId: ID, strategy: 'local' | 'remote' | 'merge'): Promise<void>;
  status(): Promise<{ pending: number; lastSyncedAt: number | null; state: SyncStatus }>;
}

/* ── future teacher mode (spec §58) ─────────────────────────────────────── */

export interface Classroom {
  id: ID;
  name: string;
  teacherId: ID;
  studentIds: ID[];
  createdAt: number;
}

export interface Assignment {
  id: ID;
  classroomId: ID;
  title: string;
  topicIds: ID[];
  questionCount: number;
  dueAt: number;
  difficultyMin: number;
  difficultyMax: number;
}

export interface ClassAnalytics {
  classroomId: ID;
  studentCount: number;
  averageMastery: number;
  weakTopics: { topic: Topic; averageMastery: number }[];
  submissionRate: number;
}

export interface TeacherRepository {
  getClassrooms(teacherId: ID): Promise<Classroom[]>;
  createAssignment(assignment: Assignment): Promise<void>;
  getAssignments(classroomId: ID): Promise<Assignment[]>;
  getStudentAttempts(classroomId: ID, studentId: ID): Promise<QuestionAttempt[]>;
  getClassAnalytics(classroomId: ID): Promise<ClassAnalytics>;
}

/* ── future content delivery (spec §10) ─────────────────────────────────── */

export interface RemotePackDescriptor {
  id: string;
  version: number;
  sizeBytes: number;
  checksum: string;
  url: string;
}

export interface ContentPackDownloader {
  listAvailable(): Promise<RemotePackDescriptor[]>;
  download(descriptor: RemotePackDescriptor, onProgress?: (ratio: number) => void): Promise<string>;
  /** Verifies a downloaded file before the seeder is allowed near it. */
  verify(filePath: string, descriptor: RemotePackDescriptor): Promise<boolean>;
}

/** Future question sources implement the same domain contract as today's. */
export interface RemoteQuestionSource {
  fetchQuestions(topicId: ID, since: number): Promise<Question[]>;
}
