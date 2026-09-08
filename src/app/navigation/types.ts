import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BrainCategory } from '../../core/constants/categories';
import type { GameKind, PracticeMode } from '../../domain/models';
import type { SolverModule } from '../../domain/services';

export interface PracticeRunParams {
  mode: PracticeMode;
  title: string;
  count?: number;
  topicIds?: string[];
  skillIds?: string[];
  examIds?: string[];
  generatorIds?: string[];
  brainCategories?: BrainCategory[];
  difficulty?: number;
  /** Set when the run comes from the mistake bank or the revision queue. */
  sourceIds?: string[];
  lessonId?: string;
}

export interface SessionSummaryParams {
  answered: number;
  correct: number;
  xp: number;
  bestStreak: number;
  averageTimeMs: number;
  title: string;
  lessonId?: string;
}

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  TopicDetail: { topicId: string };
  Lesson: { lessonId: string };
  PracticeRun: PracticeRunParams;
  SessionSummary: SessionSummaryParams;
  Mistakes: undefined;
  Revision: undefined;
  Bookmarks: undefined;
  SkillTree: undefined;
  Exams: undefined;
  ExamDetail: { examId: string };
  ExamRun: { examId: string; year?: number };
  ExamResult: { attemptId: string };
  ExamHistory: { examId: string };
  Games: undefined;
  GamePlay: { kind: GameKind };
  Lab: undefined;
  Challenges: undefined;
  BossBattle: { challengeId: string };
  Solver: { module?: SolverModule } | undefined;
  Formulas: undefined;
  FormulaDetail: { formulaId: string };
  Progress: undefined;
  Achievements: undefined;
  StudyPlan: undefined;
  Search: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Learn: undefined;
  Practice: undefined;
  Brain: undefined;
  More: undefined;
};
