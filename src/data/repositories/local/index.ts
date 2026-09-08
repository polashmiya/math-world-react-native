import { RuleBasedMathTutor } from '../../../core/question-engine/solutionEngine';
import type { Language } from '../../../core/constants/levels';
import type { RepositoryRegistry } from '../../../domain/repositories';
import type { SqlDatabase } from '../../database/sqlite/adapter';
import {
  LocalChallengeRepository,
  LocalContentPackRepository,
  LocalExamRepository,
  LocalFormulaRepository,
  LocalGameRepository,
  LocalLessonRepository,
  LocalTopicRepository,
} from './LocalContentRepositories';
import { LocalQuestionRepository } from './LocalQuestionRepository';
import {
  LocalAchievementRepository,
  LocalAttemptRepository,
  LocalBookmarkRepository,
  LocalMistakeRepository,
  LocalProgressRepository,
  LocalReviewRepository,
  LocalUserRepository,
} from './LocalUserRepositories';

export * from './LocalContentRepositories';
export * from './LocalQuestionRepository';
export * from './LocalUserRepositories';

/**
 * Wires the version-1 local implementations behind the domain contracts.
 * Swapping in `Api*Repository` later means changing only this function
 * (spec §4, §5).
 */
export function createLocalRepositories(db: SqlDatabase, language: Language = 'bn'): RepositoryRegistry {
  return {
    questions: new LocalQuestionRepository(db),
    topics: new LocalTopicRepository(db),
    lessons: new LocalLessonRepository(db),
    formulas: new LocalFormulaRepository(db),
    exams: new LocalExamRepository(db),
    attempts: new LocalAttemptRepository(db),
    mistakes: new LocalMistakeRepository(db),
    progress: new LocalProgressRepository(db),
    users: new LocalUserRepository(db),
    bookmarks: new LocalBookmarkRepository(db),
    reviews: new LocalReviewRepository(db),
    games: new LocalGameRepository(db),
    challenges: new LocalChallengeRepository(db),
    achievements: new LocalAchievementRepository(db),
    packs: new LocalContentPackRepository(db),
    tutor: new RuleBasedMathTutor(language),
  };
}
