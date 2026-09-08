import { CURRENT_CONTENT_VERSION, CURRENT_SCHEMA_VERSION } from '../../domain/models/common';
import { LATEST_SCHEMA_VERSION } from '../../data/database/migrations';

/**
 * App-wide configuration. Everything here is a compile-time constant: version 1
 * has no remote config and no feature flags fetched over a network (spec §6).
 */
export const APP_CONFIG = {
  name: 'Math World',
  /** Keep in step with `app.json`. */
  version: '1.0.0',
  schemaVersion: CURRENT_SCHEMA_VERSION,
  contentVersion: CURRENT_CONTENT_VERSION,

  /** Capabilities that exist as interfaces only in version 1 (spec §55–§58). */
  features: {
    offlineAiTutor: false,
    cameraOcr: false,
    cloudSync: false,
    teacherMode: false,
    downloadablePacks: false,
    onlineLeaderboards: false,
  },

  /** Defaults the UI uses before the user changes anything. */
  defaults: {
    practiceCount: 10,
    dailyGoalQuestions: 20,
    dailyGoalMinutes: 20,
    studyPlanMinutes: 30,
    examListLimit: 50,
  },

  /** Guard rails that keep the app responsive on low-end devices (spec §43). */
  limits: {
    /** Hard ceiling on rows a single query may return. */
    maxQuestionPageSize: 200,
    maxPracticeSetSize: 60,
    maxSimulationTrials: 100000,
    /** Rolling window used by the mastery and difficulty engines. */
    recentAttemptWindow: 20,
    searchDebounceMs: 220,
  },
} as const;

/**
 * Sanity check for the boot sequence: the schema version the models expect must
 * match the migrations that actually exist.
 */
export function schemaVersionsAgree(): boolean {
  return APP_CONFIG.schemaVersion === LATEST_SCHEMA_VERSION;
}
