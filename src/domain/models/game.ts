import type { BrainCategory } from '../../core/constants/categories';
import type { ID, SyncMeta } from './common';

/** Games are real practice with a timer, not cosmetics (spec §28). */
export type GameKind =
  | 'speed_math'
  | 'number_ninja'
  | 'equation_battle'
  | 'sequence_master'
  | 'pattern_hunter'
  | 'logic_escape'
  | 'geometry_puzzle'
  | 'probability_lab'
  | 'mental_math_rush'
  | 'math_runner';

export interface GameDefinition {
  id: ID;
  kind: GameKind;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  emoji: string;
  /** Seconds per round; 0 means untimed. */
  durationSeconds: number;
  /** Generators the game draws from. */
  generatorIds: string[];
  brainCategory: BrainCategory;
  startDifficulty: number;
  /** Difficulty step applied after a correct/incorrect answer. */
  difficultyStepUp: number;
  difficultyStepDown: number;
  livesAllowed: number;
  contentVersion: number;
}

export interface GameScore extends SyncMeta {
  id: ID;
  gameKind: GameKind;
  score: number;
  correct: number;
  wrong: number;
  maxCombo: number;
  durationMs: number;
  playedAt: number;
  difficultyReached: number;
}

export interface GameHighScore {
  gameKind: GameKind;
  bestScore: number;
  playCount: number;
  lastPlayedAt: number | null;
}

/** Boss battle (spec §34) and challenges (spec §33/§35). */
export interface Challenge {
  id: ID;
  kind: ChallengeKind;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  emoji: string;
  topicId?: ID | null;
  questionCount: number;
  durationSeconds: number;
  hintsAllowed: number;
  /** Increasing difficulty across the run. */
  difficultyStart: number;
  difficultyEnd: number;
  xpReward: number;
  coinReward: number;
  /** Topic mastery required before this unlocks (0..1). */
  requiredMastery: number;
  contentVersion: number;
}

export type ChallengeKind =
  | 'boss'
  | 'daily_mission'
  | 'weekly_mission'
  | 'monthly_challenge'
  | 'tournament';

export interface ChallengeAttempt extends SyncMeta {
  id: ID;
  challengeId: ID;
  startedAt: number;
  finishedAt?: number | null;
  score: number;
  correct: number;
  total: number;
  passed: boolean;
}

export interface MissionState extends SyncMeta {
  id: ID;
  code: string;
  periodKey: string;
  target: number;
  progress: number;
  completed: boolean;
  claimedAt?: number | null;
}
