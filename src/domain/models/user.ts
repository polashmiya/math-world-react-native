import type { DifficultyBand } from '../../core/constants/difficulty';
import type { Language } from '../../core/constants/levels';
import type { ID, SyncMeta } from './common';

/** Local-only profile (spec §41). No auth in version 1. */
export interface UserProfile extends SyncMeta {
  id: ID;
  name: string;
  avatarEmoji: string;
  learningGoal: LearningGoal;
  language: Language;
  dailyGoalQuestions: number;
  dailyGoalMinutes: number;
  difficultyPreference: DifficultyBand | 'adaptive';
  /** Set when the profile is later migrated into a real account. */
  remoteUserId?: string | null;
}

export type LearningGoal =
  | 'school'
  | 'admission'
  | 'competitive'
  | 'brain_training'
  | 'university'
  | 'olympiad'
  | 'real_life';

export const LEARNING_GOALS: readonly LearningGoal[] = [
  'school',
  'admission',
  'competitive',
  'brain_training',
  'university',
  'olympiad',
  'real_life',
];

export const LEARNING_GOAL_LABELS: Record<LearningGoal, { en: string; bn: string; emoji: string }> = {
  school: { en: 'School Mathematics', bn: 'স্কুল গণিত', emoji: '🏫' },
  admission: { en: 'Admission Test', bn: 'ভর্তি পরীক্ষা', emoji: '🎓' },
  competitive: { en: 'Competitive Exam', bn: 'প্রতিযোগিতামূলক পরীক্ষা', emoji: '🏆' },
  brain_training: { en: 'Brain Training', bn: 'মস্তিষ্ক চর্চা', emoji: '🧠' },
  university: { en: 'University Mathematics', bn: 'বিশ্ববিদ্যালয় গণিত', emoji: '🎯' },
  olympiad: { en: 'Olympiad', bn: 'অলিম্পিয়াড', emoji: '🥇' },
  real_life: { en: 'Real Life Math', bn: 'বাস্তব জীবনের গণিত', emoji: '🛒' },
};

export interface UserSettings extends SyncMeta {
  id: ID;
  language: Language;
  themeMode: 'light' | 'dark' | 'system';
  reduceAnimations: boolean;
  largeText: boolean;
  highContrast: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  showBanglaDigits: boolean;
  thinkFirstEnabled: boolean;
  adaptiveDifficultyEnabled: boolean;
  spacedRepetitionEnabled: boolean;
  /** Installed content pack ids (spec §10). */
  enabledPackIds: string[];
}

export const DEFAULT_SETTINGS: Omit<UserSettings, keyof SyncMeta | 'id'> = {
  language: 'bn',
  themeMode: 'system',
  reduceAnimations: false,
  largeText: false,
  highContrast: false,
  soundEnabled: true,
  hapticsEnabled: true,
  showBanglaDigits: true,
  thinkFirstEnabled: true,
  adaptiveDifficultyEnabled: true,
  spacedRepetitionEnabled: true,
  enabledPackIds: [],
};

export const LOCAL_USER_ID = 'local-user';
