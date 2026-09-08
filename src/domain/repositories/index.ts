/**
 * Domain repository contracts (spec §4).
 *
 * These interfaces know nothing about SQLite, REST, Axios, Firebase or any
 * other storage technology. Version 1 binds them to `Local*Repository`
 * implementations; a future `Api*Repository` can be swapped in without any
 * change to use cases or UI.
 */
import type {
  Achievement,
  AttemptFilter,
  Bookmark,
  BookmarkItemType,
  BrainCategoryProgress,
  Challenge,
  ChallengeAttempt,
  CompletedLesson,
  ContentStats,
  Curriculum,
  DailyActivity,
  Exam,
  ExamAttempt,
  Formula,
  FormulaFilter,
  GameDefinition,
  GameHighScore,
  GameScore,
  ID,
  InstalledPack,
  Lesson,
  MissionState,
  Mistake,
  Page,
  PageRequest,
  Question,
  QuestionAttempt,
  QuestionFilter,
  ReviewItem,
  Skill,
  SkillProgress,
  StreakState,
  StudyGoal,
  StudySession,
  Subject,
  ThinkingScoreState,
  Topic,
  TopicProgress,
  UnlockedAchievement,
  UserProfile,
  UserProgress,
  UserSettings,
} from '../models';
import type { BrainCategory, ThinkingDimension } from '../../core/constants/categories';

export interface QuestionRepository {
  getQuestionById(id: ID): Promise<Question | null>;
  getQuestions(filter: QuestionFilter): Promise<Question[]>;
  getQuestionsPage(filter: QuestionFilter): Promise<Page<Question>>;
  getRandomQuestions(filter: QuestionFilter): Promise<Question[]>;
  searchQuestions(query: string, page?: PageRequest): Promise<Question[]>;
  countQuestions(filter: QuestionFilter): Promise<number>;
  /** Persists a generated question so attempts and mistakes can reference it. */
  upsertQuestions(questions: Question[]): Promise<void>;
}

export interface TopicRepository {
  getCurriculums(): Promise<Curriculum[]>;
  getSubjects(curriculumId?: ID): Promise<Subject[]>;
  getTopics(): Promise<Topic[]>;
  getTopicById(id: ID): Promise<Topic | null>;
  getChildTopics(parentId: ID | null): Promise<Topic[]>;
  getSkills(topicId?: ID): Promise<Skill[]>;
  getSkillById(id: ID): Promise<Skill | null>;
  searchTopics(query: string): Promise<Topic[]>;
}

export interface LessonRepository {
  getLessons(topicId?: ID): Promise<Lesson[]>;
  getLessonById(id: ID): Promise<Lesson | null>;
  searchLessons(query: string): Promise<Lesson[]>;
  getCompletedLessons(): Promise<CompletedLesson[]>;
  markLessonCompleted(lesson: CompletedLesson): Promise<void>;
}

export interface FormulaRepository {
  getFormulas(filter?: FormulaFilter): Promise<Formula[]>;
  getFormulaById(id: ID): Promise<Formula | null>;
  searchFormulas(query: string): Promise<Formula[]>;
}

export interface ExamRepository {
  getExams(): Promise<Exam[]>;
  getExamById(id: ID): Promise<Exam | null>;
  saveExamAttempt(attempt: ExamAttempt): Promise<void>;
  getExamAttempts(examId?: ID, page?: PageRequest): Promise<ExamAttempt[]>;
  getExamAttemptById(id: ID): Promise<ExamAttempt | null>;
}

export interface AttemptRepository {
  saveAttempt(attempt: QuestionAttempt): Promise<void>;
  saveAttempts(attempts: QuestionAttempt[]): Promise<void>;
  getAttempts(filter: AttemptFilter): Promise<QuestionAttempt[]>;
  countAttempts(filter: AttemptFilter): Promise<number>;
  getSolvedQuestionIds(topicIds?: ID[]): Promise<ID[]>;
  saveSession(session: StudySession): Promise<void>;
  getSessions(page?: PageRequest): Promise<StudySession[]>;
}

export interface MistakeRepository {
  recordMistake(mistake: Mistake): Promise<void>;
  getMistakes(options?: { topicId?: ID; includeResolved?: boolean } & PageRequest): Promise<Mistake[]>;
  getMistakeByQuestionId(questionId: ID): Promise<Mistake | null>;
  updateMistake(mistake: Mistake): Promise<void>;
  removeMistake(id: ID): Promise<void>;
  countByTopic(): Promise<{ topicId: ID; count: number }[]>;
}

export interface ProgressRepository {
  getProgress(userId: ID): Promise<UserProgress>;
  updateProgress(progress: UserProgress): Promise<void>;
  getTopicProgress(topicId?: ID): Promise<TopicProgress[]>;
  upsertTopicProgress(progress: TopicProgress): Promise<void>;
  getSkillProgress(skillIds?: ID[]): Promise<SkillProgress[]>;
  upsertSkillProgress(progress: SkillProgress): Promise<void>;
  getDailyActivity(days: number): Promise<DailyActivity[]>;
  getDailyActivityForDay(day: string): Promise<DailyActivity | null>;
  upsertDailyActivity(activity: DailyActivity): Promise<void>;
  getStreak(): Promise<StreakState>;
  updateStreak(streak: StreakState): Promise<void>;
  getBrainProgress(): Promise<BrainCategoryProgress[]>;
  upsertBrainProgress(progress: BrainCategoryProgress): Promise<void>;
  getThinkingScore(): Promise<ThinkingScoreState>;
  updateThinkingScore(state: ThinkingScoreState): Promise<void>;
  getGoals(): Promise<StudyGoal[]>;
  upsertGoal(goal: StudyGoal): Promise<void>;
  removeGoal(id: ID): Promise<void>;
}

export interface UserRepository {
  getProfile(): Promise<UserProfile>;
  updateProfile(profile: UserProfile): Promise<void>;
  getSettings(): Promise<UserSettings>;
  updateSettings(settings: UserSettings): Promise<void>;
}

export interface BookmarkRepository {
  addBookmark(bookmark: Bookmark): Promise<void>;
  removeBookmark(itemType: BookmarkItemType, itemId: ID): Promise<void>;
  getBookmarks(itemType?: BookmarkItemType): Promise<Bookmark[]>;
  isBookmarked(itemType: BookmarkItemType, itemId: ID): Promise<boolean>;
}

export interface ReviewRepository {
  upsertReviewItem(item: ReviewItem): Promise<void>;
  getDueItems(now: number, limit?: number): Promise<ReviewItem[]>;
  getReviewItem(itemType: ReviewItem['itemType'], itemId: ID): Promise<ReviewItem | null>;
  countDue(now: number): Promise<number>;
  removeReviewItem(id: ID): Promise<void>;
}

export interface GameRepository {
  getGames(): Promise<GameDefinition[]>;
  getGameByKind(kind: GameDefinition['kind']): Promise<GameDefinition | null>;
  saveScore(score: GameScore): Promise<void>;
  getHighScores(): Promise<GameHighScore[]>;
  getScores(kind?: GameDefinition['kind'], page?: PageRequest): Promise<GameScore[]>;
}

export interface ChallengeRepository {
  getChallenges(): Promise<Challenge[]>;
  getChallengeById(id: ID): Promise<Challenge | null>;
  saveChallengeAttempt(attempt: ChallengeAttempt): Promise<void>;
  getChallengeAttempts(challengeId?: ID): Promise<ChallengeAttempt[]>;
  getMissions(periodKey?: string): Promise<MissionState[]>;
  upsertMission(mission: MissionState): Promise<void>;
}

export interface AchievementRepository {
  getCatalog(): Promise<Achievement[]>;
  getUnlocked(): Promise<UnlockedAchievement[]>;
  unlock(unlocked: UnlockedAchievement): Promise<void>;
  markSeen(codes: string[]): Promise<void>;
}

export interface ContentPackRepository {
  getInstalledPacks(): Promise<InstalledPack[]>;
  setPackEnabled(packId: string, enabled: boolean): Promise<void>;
  getContentStats(): Promise<ContentStats>;
}

/** Rule-based today; an offline LLM can implement the same contract (spec §55). */
export interface MathTutor {
  explain(question: Question): Promise<string>;
  giveHint(question: Question, level: number): Promise<string>;
  explainMistake(attempt: QuestionAttempt, question: Question): Promise<string>;
}

/** Every repository the app needs, resolved once at startup. */
export interface RepositoryRegistry {
  questions: QuestionRepository;
  topics: TopicRepository;
  lessons: LessonRepository;
  formulas: FormulaRepository;
  exams: ExamRepository;
  attempts: AttemptRepository;
  mistakes: MistakeRepository;
  progress: ProgressRepository;
  users: UserRepository;
  bookmarks: BookmarkRepository;
  reviews: ReviewRepository;
  games: GameRepository;
  challenges: ChallengeRepository;
  achievements: AchievementRepository;
  packs: ContentPackRepository;
  tutor: MathTutor;
}

export type { BrainCategory, ThinkingDimension };
