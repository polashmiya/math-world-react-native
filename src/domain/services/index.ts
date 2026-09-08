import type { RepositoryRegistry } from '../repositories';
import { ChallengeService } from './ChallengeService';
import { DailyBrainService } from './DailyBrainService';
import { ExamService } from './ExamService';
import { GameService } from './GameService';
import { LearningService } from './LearningService';
import { PracticeService } from './PracticeService';
import { ProfileService } from './ProfileService';
import { ProgressService } from './ProgressService';
import { SearchService } from './SearchService';
import { SolverService } from './SolverService';

export * from './ChallengeService';
export * from './DailyBrainService';
export * from './ExamService';
export * from './GameService';
export * from './LearningService';
export * from './PracticeService';
export * from './ProfileService';
export * from './ProgressService';
export * from './SearchService';
export * from './SolverService';

/**
 * Every use case the UI is allowed to call. The screens depend on this object
 * and never on a repository or on SQLite (spec §3).
 */
export interface AppServices {
  practice: PracticeService;
  learning: LearningService;
  dailyBrain: DailyBrainService;
  exams: ExamService;
  games: GameService;
  challenges: ChallengeService;
  progress: ProgressService;
  solver: SolverService;
  search: SearchService;
  profile: ProfileService;
  repositories: RepositoryRegistry;
}

export function createServices(repositories: RepositoryRegistry): AppServices {
  return {
    practice: new PracticeService(repositories),
    learning: new LearningService(repositories),
    dailyBrain: new DailyBrainService(repositories),
    exams: new ExamService(repositories),
    games: new GameService(repositories),
    challenges: new ChallengeService(repositories),
    progress: new ProgressService(repositories),
    solver: new SolverService(),
    search: new SearchService(repositories),
    profile: new ProfileService(repositories),
    repositories,
  };
}
