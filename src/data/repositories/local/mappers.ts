import {
  DEFAULT_SOUND_VOLUME,
  clampSoundVolume,
  isFontScale,
  type FontScale,
} from '../../../core/constants/accessibility';
import type { AcademicLevel, CurriculumCode, ExamFamily, Language } from '../../../core/constants/levels';
import type { BrainCategory, FormulaCategory, ThinkingDimension, TournamentTier } from '../../../core/constants/categories';
import { THINKING_DIMENSIONS } from '../../../core/constants/categories';
import type { DifficultyBand } from '../../../core/constants/difficulty';
import type {
  Bookmark,
  BookmarkItemType,
  BrainCategoryProgress,
  Challenge,
  ChallengeAttempt,
  ChallengeKind,
  CompletedLesson,
  Curriculum,
  DailyActivity,
  Exam,
  ExamAttempt,
  ExamSection,
  Formula,
  FormulaVariable,
  GameDefinition,
  GameKind,
  GameScore,
  InstalledPack,
  Lesson,
  LessonSection,
  MissionState,
  Mistake,
  PracticeMode,
  Question,
  QuestionAttempt,
  QuestionOption,
  QuestionType,
  ReviewItem,
  Skill,
  SkillProgress,
  SolutionStep,
  StreakState,
  StudyGoal,
  StudyGoalKind,
  StudySession,
  Subject,
  SyncMeta,
  SyncStatus,
  ThinkingScoreState,
  Topic,
  TopicColorKey,
  TopicProgress,
  UnlockedAchievement,
  UserProfile,
  UserProgress,
  UserSettings,
} from '../../../domain/models';
import type { LearningGoal } from '../../../domain/models/user';
import {
  boolToInt,
  intToBool,
  jsonColumn,
  parseJsonColumn,
  toNullableNumber,
  toNullableText,
  toNumber,
  toText,
  type SqlValue,
} from '../../database/sqlite/adapter';

export type Row = Record<string, SqlValue>;

/* ── sync metadata ───────────────────────────────────────────────────────── */

export function readSyncMeta(row: Row): SyncMeta {
  return {
    createdAt: toNumber(row.created_at),
    updatedAt: toNumber(row.updated_at),
    deletedAt: toNullableNumber(row.deleted_at),
    syncStatus: (toText(row.sync_status, 'local') as SyncStatus) || 'local',
    lastSyncedAt: toNullableNumber(row.last_synced_at),
    version: toNumber(row.version, 1),
  };
}

export function writeSyncMeta(meta: SyncMeta): Row {
  return {
    created_at: meta.createdAt,
    updated_at: meta.updatedAt,
    deleted_at: meta.deletedAt ?? null,
    sync_status: meta.syncStatus,
    last_synced_at: meta.lastSyncedAt ?? null,
    version: meta.version,
  };
}

/* ── content ─────────────────────────────────────────────────────────────── */

export function rowToCurriculum(row: Row): Curriculum {
  return {
    id: toText(row.id),
    code: toText(row.code, 'custom') as CurriculumCode,
    name: toText(row.name),
    nameBn: toText(row.name_bn),
    description: toNullableText(row.description) ?? undefined,
    descriptionBn: toNullableText(row.description_bn) ?? undefined,
    contentVersion: toNumber(row.content_version, 1),
  };
}

export function curriculumToRow(item: Curriculum): Row {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    name_bn: item.nameBn,
    description: item.description ?? null,
    description_bn: item.descriptionBn ?? null,
    content_version: item.contentVersion,
  };
}

export function rowToSubject(row: Row): Subject {
  return {
    id: toText(row.id),
    curriculumId: toText(row.curriculum_id),
    name: toText(row.name),
    nameBn: toText(row.name_bn),
    slug: toText(row.slug),
    orderIndex: toNumber(row.order_index),
    contentVersion: toNumber(row.content_version, 1),
  };
}

export function subjectToRow(item: Subject): Row {
  return {
    id: item.id,
    curriculum_id: item.curriculumId,
    name: item.name,
    name_bn: item.nameBn,
    slug: item.slug,
    order_index: item.orderIndex,
    content_version: item.contentVersion,
  };
}

export function rowToTopic(row: Row): Topic {
  return {
    id: toText(row.id),
    subjectId: toText(row.subject_id),
    parentId: toNullableText(row.parent_id),
    name: toText(row.name),
    nameBn: toText(row.name_bn),
    slug: toText(row.slug),
    level: toText(row.level, 'foundation') as AcademicLevel,
    baseDifficulty: toNumber(row.base_difficulty, 1),
    orderIndex: toNumber(row.order_index),
    emoji: toText(row.emoji, '📘'),
    colorKey: toText(row.color_key, 'blue') as TopicColorKey,
    description: toNullableText(row.description) ?? undefined,
    descriptionBn: toNullableText(row.description_bn) ?? undefined,
    prerequisiteTopicIds: parseJsonColumn<string[]>(row.prerequisite_ids, []),
    contentVersion: toNumber(row.content_version, 1),
  };
}

export function topicToRow(item: Topic, packId?: string): Row {
  return {
    id: item.id,
    subject_id: item.subjectId,
    parent_id: item.parentId ?? null,
    name: item.name,
    name_bn: item.nameBn,
    slug: item.slug,
    level: item.level,
    base_difficulty: item.baseDifficulty,
    order_index: item.orderIndex,
    emoji: item.emoji,
    color_key: item.colorKey,
    description: item.description ?? null,
    description_bn: item.descriptionBn ?? null,
    prerequisite_ids: jsonColumn(item.prerequisiteTopicIds),
    content_version: item.contentVersion,
    pack_id: packId ?? null,
    search_text: searchText([item.name, item.nameBn, item.slug, item.description, item.descriptionBn]),
  };
}

export function rowToSkill(row: Row): Skill {
  return {
    id: toText(row.id),
    topicId: toText(row.topic_id),
    name: toText(row.name),
    nameBn: toText(row.name_bn),
    slug: toText(row.slug),
    description: toNullableText(row.description) ?? undefined,
    descriptionBn: toNullableText(row.description_bn) ?? undefined,
    orderIndex: toNumber(row.order_index),
    contentVersion: toNumber(row.content_version, 1),
  };
}

export function skillToRow(item: Skill, packId?: string): Row {
  return {
    id: item.id,
    topic_id: item.topicId,
    name: item.name,
    name_bn: item.nameBn,
    slug: item.slug,
    description: item.description ?? null,
    description_bn: item.descriptionBn ?? null,
    order_index: item.orderIndex,
    content_version: item.contentVersion,
    pack_id: packId ?? null,
  };
}

export function rowToLesson(row: Row): Lesson {
  return {
    id: toText(row.id),
    topicId: toText(row.topic_id),
    skillIds: parseJsonColumn<string[]>(row.skill_ids, []),
    title: toText(row.title),
    titleBn: toText(row.title_bn),
    summary: toText(row.summary),
    summaryBn: toText(row.summary_bn),
    orderIndex: toNumber(row.order_index),
    estimatedMinutes: toNumber(row.estimated_minutes, 10),
    sections: parseJsonColumn<LessonSection[]>(row.sections_json, []),
    practiceGeneratorIds: parseJsonColumn<string[]>(row.practice_generator_ids, []),
    contentVersion: toNumber(row.content_version, 1),
  };
}

export function lessonToRow(item: Lesson, packId?: string): Row {
  return {
    id: item.id,
    topic_id: item.topicId,
    skill_ids: jsonColumn(item.skillIds),
    title: item.title,
    title_bn: item.titleBn,
    summary: item.summary,
    summary_bn: item.summaryBn,
    order_index: item.orderIndex,
    estimated_minutes: item.estimatedMinutes,
    sections_json: jsonColumn(item.sections),
    practice_generator_ids: jsonColumn(item.practiceGeneratorIds),
    content_version: item.contentVersion,
    pack_id: packId ?? null,
    search_text: searchText([
      item.title,
      item.titleBn,
      item.summary,
      item.summaryBn,
      ...item.sections.map((s) => s.title),
    ]),
  };
}

export function rowToQuestion(row: Row): Question {
  return {
    id: toText(row.id),
    topicId: toText(row.topic_id),
    subtopicId: toNullableText(row.subtopic_id),
    skillIds: parseJsonColumn<string[]>(row.skill_ids, []),
    difficulty: toNumber(row.difficulty, 1),
    questionType: toText(row.question_type, 'mcq') as QuestionType,
    curriculumIds: parseJsonColumn<CurriculumCode[]>(row.curriculum_ids, []),
    examIds: parseJsonColumn<string[]>(row.exam_ids, []),
    tags: parseJsonColumn<string[]>(row.tags, []),
    brainCategory: (toNullableText(row.brain_category) as BrainCategory | null) ?? null,
    prompt: toText(row.prompt),
    promptBn: toNullableText(row.prompt_bn) ?? undefined,
    options: parseJsonColumn<QuestionOption[] | undefined>(row.options_json, undefined),
    correctAnswer: toText(row.correct_answer),
    acceptedAnswers: parseJsonColumn<string[] | undefined>(row.accepted_answers, undefined),
    tolerance: toNullableNumber(row.tolerance) ?? undefined,
    solutionSteps: parseJsonColumn<SolutionStep[]>(row.solution_json, []),
    explanation: toNullableText(row.explanation) ?? undefined,
    explanationBn: toNullableText(row.explanation_bn) ?? undefined,
    hints: parseJsonColumn<string[] | undefined>(row.hints, undefined),
    hintsBn: parseJsonColumn<string[] | undefined>(row.hints_bn, undefined),
    estimatedTimeSeconds: toNullableNumber(row.estimated_time_seconds) ?? undefined,
    points: toNullableNumber(row.points) ?? undefined,
    source: toText(row.source, 'static') === 'generated' ? 'generated' : 'static',
    generatorId: toNullableText(row.generator_id),
    generatorParams: parseJsonColumn<Record<string, number | string> | null>(row.generator_params, null),
    year: toNullableNumber(row.year),
    questionVersion: toNumber(row.question_version, 1),
    contentVersion: toNumber(row.content_version, 1),
  };
}

export function questionToRow(item: Question, packId?: string): Row {
  return {
    id: item.id,
    topic_id: item.topicId,
    subtopic_id: item.subtopicId ?? null,
    difficulty: item.difficulty,
    question_type: item.questionType,
    brain_category: item.brainCategory ?? null,
    prompt: item.prompt,
    prompt_bn: item.promptBn ?? null,
    options_json: item.options ? jsonColumn(item.options) : null,
    correct_answer: item.correctAnswer,
    accepted_answers: item.acceptedAnswers ? jsonColumn(item.acceptedAnswers) : null,
    tolerance: item.tolerance ?? null,
    solution_json: jsonColumn(item.solutionSteps),
    explanation: item.explanation ?? null,
    explanation_bn: item.explanationBn ?? null,
    hints: item.hints ? jsonColumn(item.hints) : null,
    hints_bn: item.hintsBn ? jsonColumn(item.hintsBn) : null,
    estimated_time_seconds: item.estimatedTimeSeconds ?? null,
    points: item.points ?? null,
    source: item.source,
    generator_id: item.generatorId ?? null,
    generator_params: item.generatorParams ? jsonColumn(item.generatorParams) : null,
    year: item.year ?? null,
    curriculum_ids: jsonColumn(item.curriculumIds),
    skill_ids: jsonColumn(item.skillIds),
    exam_ids: jsonColumn(item.examIds),
    tags: jsonColumn(item.tags),
    question_version: item.questionVersion,
    content_version: item.contentVersion,
    pack_id: packId ?? null,
    search_text: searchText([item.prompt, item.promptBn, item.explanation, ...item.tags]),
  };
}

export function rowToFormula(row: Row): Formula {
  return {
    id: toText(row.id),
    category: toText(row.category, 'arithmetic') as FormulaCategory,
    name: toText(row.name),
    nameBn: toText(row.name_bn),
    expression: toText(row.expression),
    meaning: toText(row.meaning),
    meaningBn: toText(row.meaning_bn),
    variables: parseJsonColumn<FormulaVariable[]>(row.variables_json, []),
    example: toText(row.example),
    exampleBn: toText(row.example_bn),
    relatedFormulaIds: parseJsonColumn<string[]>(row.related_ids, []),
    commonMistakes: parseJsonColumn<string[]>(row.common_mistakes, []),
    commonMistakesBn: parseJsonColumn<string[]>(row.common_mistakes_bn, []),
    tags: parseJsonColumn<string[]>(row.tags, []),
    contentVersion: toNumber(row.content_version, 1),
  };
}

export function formulaToRow(item: Formula, packId?: string): Row {
  return {
    id: item.id,
    category: item.category,
    name: item.name,
    name_bn: item.nameBn,
    expression: item.expression,
    meaning: item.meaning,
    meaning_bn: item.meaningBn,
    variables_json: jsonColumn(item.variables),
    example: item.example,
    example_bn: item.exampleBn,
    related_ids: jsonColumn(item.relatedFormulaIds),
    common_mistakes: jsonColumn(item.commonMistakes),
    common_mistakes_bn: jsonColumn(item.commonMistakesBn),
    tags: jsonColumn(item.tags),
    content_version: item.contentVersion,
    pack_id: packId ?? null,
    search_text: searchText([item.name, item.nameBn, item.expression, item.meaning, item.meaningBn, ...item.tags]),
  };
}

export function rowToExam(row: Row): Exam {
  return {
    id: toText(row.id),
    code: toText(row.code),
    family: toText(row.family, 'custom') as ExamFamily,
    name: toText(row.name),
    nameBn: toText(row.name_bn),
    description: toText(row.description),
    descriptionBn: toText(row.description_bn),
    emoji: toText(row.emoji, '📝'),
    totalQuestions: toNumber(row.total_questions, 20),
    durationSeconds: toNumber(row.duration_seconds, 1200),
    markPerQuestion: toNumber(row.mark_per_question, 1),
    negativeMarkPerWrong: toNumber(row.negative_mark_per_wrong, 0),
    shuffleQuestions: intToBool(row.shuffle_questions),
    shuffleOptions: intToBool(row.shuffle_options),
    sections: parseJsonColumn<ExamSection[]>(row.sections_json, []),
    years: parseJsonColumn<number[]>(row.years, []),
    contentVersion: toNumber(row.content_version, 1),
  };
}

export function examToRow(item: Exam, packId?: string): Row {
  return {
    id: item.id,
    code: item.code,
    family: item.family,
    name: item.name,
    name_bn: item.nameBn,
    description: item.description,
    description_bn: item.descriptionBn,
    emoji: item.emoji,
    total_questions: item.totalQuestions,
    duration_seconds: item.durationSeconds,
    mark_per_question: item.markPerQuestion,
    negative_mark_per_wrong: item.negativeMarkPerWrong,
    shuffle_questions: boolToInt(item.shuffleQuestions),
    shuffle_options: boolToInt(item.shuffleOptions),
    sections_json: jsonColumn(item.sections),
    years: jsonColumn(item.years),
    content_version: item.contentVersion,
    pack_id: packId ?? null,
  };
}

export function rowToGame(row: Row): GameDefinition {
  return {
    id: toText(row.id),
    kind: toText(row.kind, 'speed_math') as GameKind,
    name: toText(row.name),
    nameBn: toText(row.name_bn),
    description: toText(row.description),
    descriptionBn: toText(row.description_bn),
    emoji: toText(row.emoji, '🎮'),
    durationSeconds: toNumber(row.duration_seconds, 60),
    generatorIds: parseJsonColumn<string[]>(row.generator_ids, []),
    brainCategory: toText(row.brain_category, 'mental_math') as BrainCategory,
    startDifficulty: toNumber(row.start_difficulty, 2),
    difficultyStepUp: toNumber(row.difficulty_step_up, 1),
    difficultyStepDown: toNumber(row.difficulty_step_down, 1),
    livesAllowed: toNumber(row.lives_allowed, 3),
    contentVersion: toNumber(row.content_version, 1),
  };
}

export function gameToRow(item: GameDefinition, packId?: string): Row {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    name_bn: item.nameBn,
    description: item.description,
    description_bn: item.descriptionBn,
    emoji: item.emoji,
    duration_seconds: item.durationSeconds,
    generator_ids: jsonColumn(item.generatorIds),
    brain_category: item.brainCategory,
    start_difficulty: item.startDifficulty,
    difficulty_step_up: item.difficultyStepUp,
    difficulty_step_down: item.difficultyStepDown,
    lives_allowed: item.livesAllowed,
    content_version: item.contentVersion,
    pack_id: packId ?? null,
  };
}

export function rowToChallenge(row: Row): Challenge {
  return {
    id: toText(row.id),
    kind: toText(row.kind, 'boss') as ChallengeKind,
    name: toText(row.name),
    nameBn: toText(row.name_bn),
    description: toText(row.description),
    descriptionBn: toText(row.description_bn),
    emoji: toText(row.emoji, '🔥'),
    topicId: toNullableText(row.topic_id),
    questionCount: toNumber(row.question_count, 10),
    durationSeconds: toNumber(row.duration_seconds, 600),
    hintsAllowed: toNumber(row.hints_allowed, 1),
    difficultyStart: toNumber(row.difficulty_start, 2),
    difficultyEnd: toNumber(row.difficulty_end, 7),
    xpReward: toNumber(row.xp_reward, 100),
    coinReward: toNumber(row.coin_reward, 50),
    requiredMastery: toNumber(row.required_mastery, 0),
    contentVersion: toNumber(row.content_version, 1),
  };
}

export function challengeToRow(item: Challenge, packId?: string): Row {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    name_bn: item.nameBn,
    description: item.description,
    description_bn: item.descriptionBn,
    emoji: item.emoji,
    topic_id: item.topicId ?? null,
    question_count: item.questionCount,
    duration_seconds: item.durationSeconds,
    hints_allowed: item.hintsAllowed,
    difficulty_start: item.difficultyStart,
    difficulty_end: item.difficultyEnd,
    xp_reward: item.xpReward,
    coin_reward: item.coinReward,
    required_mastery: item.requiredMastery,
    content_version: item.contentVersion,
    pack_id: packId ?? null,
  };
}

export function rowToInstalledPack(row: Row): InstalledPack {
  return {
    id: toText(row.id),
    version: toNumber(row.version),
    seededAt: toNumber(row.seeded_at),
    enabled: intToBool(row.enabled),
    checksum: toText(row.checksum),
  };
}

/* ── user data ───────────────────────────────────────────────────────────── */

export function rowToProfile(row: Row): UserProfile {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    name: toText(row.name),
    avatarEmoji: toText(row.avatar_emoji, '🧑‍🎓'),
    learningGoal: toText(row.learning_goal, 'school') as LearningGoal,
    language: toText(row.language, 'bn') as Language,
    dailyGoalQuestions: toNumber(row.daily_goal_questions, 20),
    dailyGoalMinutes: toNumber(row.daily_goal_minutes, 20),
    difficultyPreference: toText(row.difficulty_preference, 'adaptive') as DifficultyBand | 'adaptive',
    remoteUserId: toNullableText(row.remote_user_id),
  };
}

export function profileToRow(item: UserProfile): Row {
  return {
    id: item.id,
    name: item.name,
    avatar_emoji: item.avatarEmoji,
    learning_goal: item.learningGoal,
    language: item.language,
    daily_goal_questions: item.dailyGoalQuestions,
    daily_goal_minutes: item.dailyGoalMinutes,
    difficulty_preference: item.difficultyPreference,
    remote_user_id: item.remoteUserId ?? null,
    ...writeSyncMeta(item),
  };
}

/**
 * Rows written before migration 007 have an empty `font_scale`. Those users
 * already told us how they wanted to read, through the old two-state toggle —
 * so honour it rather than resetting them to the default.
 */
function readFontScale(row: Row): FontScale {
  const stored = toText(row.font_scale, '');
  if (isFontScale(stored)) return stored;
  return intToBool(row.large_text) ? 'large' : 'medium';
}

export function rowToSettings(row: Row): UserSettings {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    language: toText(row.language, 'bn') as Language,
    themeMode: toText(row.theme_mode, 'system') as UserSettings['themeMode'],
    reduceAnimations: intToBool(row.reduce_animations),
    largeText: intToBool(row.large_text),
    fontScale: readFontScale(row),
    highContrast: intToBool(row.high_contrast),
    soundEnabled: intToBool(row.sound_enabled),
    soundVolume: clampSoundVolume(toNumber(row.sound_volume, DEFAULT_SOUND_VOLUME)),
    hapticsEnabled: intToBool(row.haptics_enabled),
    showBanglaDigits: intToBool(row.show_bangla_digits),
    adaptiveDifficultyEnabled: intToBool(row.adaptive_difficulty_enabled),
    spacedRepetitionEnabled: intToBool(row.spaced_repetition_enabled),
    enabledPackIds: parseJsonColumn<string[]>(row.enabled_pack_ids, []),
  };
}

export function settingsToRow(item: UserSettings): Row {
  return {
    id: item.id,
    language: item.language,
    theme_mode: item.themeMode,
    reduce_animations: boolToInt(item.reduceAnimations),
    large_text: boolToInt(item.largeText),
    font_scale: item.fontScale,
    high_contrast: boolToInt(item.highContrast),
    sound_enabled: boolToInt(item.soundEnabled),
    sound_volume: clampSoundVolume(item.soundVolume),
    haptics_enabled: boolToInt(item.hapticsEnabled),
    show_bangla_digits: boolToInt(item.showBanglaDigits),
    // `think_first_enabled` is a retired column. The migration is append-only so
    // the column stays; it is left to its DEFAULT and nothing reads it.
    adaptive_difficulty_enabled: boolToInt(item.adaptiveDifficultyEnabled),
    spaced_repetition_enabled: boolToInt(item.spacedRepetitionEnabled),
    enabled_pack_ids: jsonColumn(item.enabledPackIds),
    ...writeSyncMeta(item),
  };
}

export function rowToAttempt(row: Row): QuestionAttempt {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    questionId: toText(row.question_id),
    topicId: toText(row.topic_id),
    skillIds: parseJsonColumn<string[]>(row.skill_ids, []),
    sessionId: toNullableText(row.session_id),
    mode: toText(row.mode, 'practice') as PracticeMode,
    difficulty: toNumber(row.difficulty, 1),
    isCorrect: intToBool(row.is_correct),
    givenAnswer: toText(row.given_answer),
    correctAnswer: toText(row.correct_answer),
    timeSpentMs: toNumber(row.time_spent_ms),
    hintsUsed: toNumber(row.hints_used),
    estimateValue: toNullableNumber(row.estimate_value),
    estimateAccuracy: toNullableNumber(row.estimate_accuracy),
    strategy: toNullableText(row.strategy),
  };
}

export function attemptToRow(item: QuestionAttempt): Row {
  return {
    id: item.id,
    question_id: item.questionId,
    topic_id: item.topicId,
    skill_ids: jsonColumn(item.skillIds),
    session_id: item.sessionId ?? null,
    mode: item.mode,
    difficulty: item.difficulty,
    is_correct: boolToInt(item.isCorrect),
    given_answer: item.givenAnswer,
    correct_answer: item.correctAnswer,
    time_spent_ms: item.timeSpentMs,
    hints_used: item.hintsUsed,
    estimate_value: item.estimateValue ?? null,
    estimate_accuracy: item.estimateAccuracy ?? null,
    strategy: item.strategy ?? null,
    ...writeSyncMeta(item),
  };
}

export function rowToMistake(row: Row): Mistake {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    questionId: toText(row.question_id),
    topicId: toText(row.topic_id),
    skillIds: parseJsonColumn<string[]>(row.skill_ids, []),
    difficulty: toNumber(row.difficulty, 1),
    mistakeCount: toNumber(row.mistake_count, 1),
    lastMistakeAt: toNumber(row.last_mistake_at),
    correctStreak: toNumber(row.correct_streak),
    resolved: intToBool(row.resolved),
    questionSnapshot: toText(row.question_snapshot),
    reason: toNullableText(row.reason),
  };
}

export function mistakeToRow(item: Mistake): Row {
  return {
    id: item.id,
    question_id: item.questionId,
    topic_id: item.topicId,
    skill_ids: jsonColumn(item.skillIds),
    difficulty: item.difficulty,
    mistake_count: item.mistakeCount,
    last_mistake_at: item.lastMistakeAt,
    correct_streak: item.correctStreak,
    resolved: boolToInt(item.resolved),
    question_snapshot: item.questionSnapshot,
    reason: item.reason ?? null,
    ...writeSyncMeta(item),
  };
}

export function rowToUserProgress(row: Row): UserProgress {
  return {
    ...readSyncMeta(row),
    userId: toText(row.user_id),
    xp: toNumber(row.xp),
    coins: toNumber(row.coins),
    level: toNumber(row.level, 1),
    questionsSolved: toNumber(row.questions_solved),
    questionsCorrect: toNumber(row.questions_correct),
    totalTimeMs: toNumber(row.total_time_ms),
    lessonsCompleted: toNumber(row.lessons_completed),
    examsTaken: toNumber(row.exams_taken),
    currentStreak: toNumber(row.current_streak),
    longestStreak: toNumber(row.longest_streak),
    lastActiveDay: toNullableText(row.last_active_day),
    overallMastery: toNumber(row.overall_mastery),
    thinkingScore: toNumber(row.thinking_score),
    tier: toText(row.tier, 'bronze') as TournamentTier,
  };
}

export function userProgressToRow(item: UserProgress): Row {
  return {
    user_id: item.userId,
    xp: item.xp,
    coins: item.coins,
    level: item.level,
    questions_solved: item.questionsSolved,
    questions_correct: item.questionsCorrect,
    total_time_ms: item.totalTimeMs,
    lessons_completed: item.lessonsCompleted,
    exams_taken: item.examsTaken,
    current_streak: item.currentStreak,
    longest_streak: item.longestStreak,
    last_active_day: item.lastActiveDay ?? null,
    overall_mastery: item.overallMastery,
    thinking_score: item.thinkingScore,
    tier: item.tier,
    ...writeSyncMeta(item),
  };
}

export function rowToTopicProgress(row: Row): TopicProgress {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    topicId: toText(row.topic_id),
    attempts: toNumber(row.attempts),
    correct: toNumber(row.correct),
    totalTimeMs: toNumber(row.total_time_ms),
    mastery: toNumber(row.mastery),
    bestDifficulty: toNumber(row.best_difficulty, 1),
    lastPracticedAt: toNullableNumber(row.last_practiced_at),
    bossDefeatedAt: toNullableNumber(row.boss_defeated_at),
  };
}

export function topicProgressToRow(item: TopicProgress): Row {
  return {
    id: item.id,
    topic_id: item.topicId,
    attempts: item.attempts,
    correct: item.correct,
    total_time_ms: item.totalTimeMs,
    mastery: item.mastery,
    best_difficulty: item.bestDifficulty,
    last_practiced_at: item.lastPracticedAt ?? null,
    boss_defeated_at: item.bossDefeatedAt ?? null,
    ...writeSyncMeta(item),
  };
}

export function rowToSkillProgress(row: Row): SkillProgress {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    skillId: toText(row.skill_id),
    topicId: toText(row.topic_id),
    attempts: toNumber(row.attempts),
    correct: toNumber(row.correct),
    totalTimeMs: toNumber(row.total_time_ms),
    mastery: toNumber(row.mastery),
    recentOutcomes: toText(row.recent_outcomes),
    lastPracticedAt: toNullableNumber(row.last_practiced_at),
  };
}

export function skillProgressToRow(item: SkillProgress): Row {
  return {
    id: item.id,
    skill_id: item.skillId,
    topic_id: item.topicId,
    attempts: item.attempts,
    correct: item.correct,
    total_time_ms: item.totalTimeMs,
    mastery: item.mastery,
    recent_outcomes: item.recentOutcomes,
    last_practiced_at: item.lastPracticedAt ?? null,
    ...writeSyncMeta(item),
  };
}

export function rowToCompletedLesson(row: Row): CompletedLesson {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    lessonId: toText(row.lesson_id),
    topicId: toText(row.topic_id),
    completedAt: toNumber(row.completed_at),
    masteryScore: toNumber(row.mastery_score),
  };
}

export function completedLessonToRow(item: CompletedLesson): Row {
  return {
    id: item.id,
    lesson_id: item.lessonId,
    topic_id: item.topicId,
    completed_at: item.completedAt,
    mastery_score: item.masteryScore,
    ...writeSyncMeta(item),
  };
}

export function rowToDailyActivity(row: Row): DailyActivity {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    day: toText(row.day),
    questionsAnswered: toNumber(row.questions_answered),
    correct: toNumber(row.correct),
    minutesStudied: toNumber(row.minutes_studied),
    xpEarned: toNumber(row.xp_earned),
    brainScore: toNumber(row.brain_score),
    goalMet: intToBool(row.goal_met),
  };
}

export function dailyActivityToRow(item: DailyActivity): Row {
  return {
    id: item.id,
    day: item.day,
    questions_answered: item.questionsAnswered,
    correct: item.correct,
    minutes_studied: item.minutesStudied,
    xp_earned: item.xpEarned,
    brain_score: item.brainScore,
    goal_met: boolToInt(item.goalMet),
    ...writeSyncMeta(item),
  };
}

export function rowToStreak(row: Row): StreakState {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    currentStreak: toNumber(row.current_streak),
    longestStreak: toNumber(row.longest_streak),
    lastActiveDay: toNullableText(row.last_active_day),
    freezesAvailable: toNumber(row.freezes_available),
  };
}

export function streakToRow(item: StreakState): Row {
  return {
    id: item.id,
    current_streak: item.currentStreak,
    longest_streak: item.longestStreak,
    last_active_day: item.lastActiveDay ?? null,
    freezes_available: item.freezesAvailable,
    ...writeSyncMeta(item),
  };
}

export function rowToUnlockedAchievement(row: Row): UnlockedAchievement {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    achievementCode: toText(row.achievement_code),
    unlockedAt: toNumber(row.unlocked_at),
    seen: intToBool(row.seen),
  };
}

export function unlockedAchievementToRow(item: UnlockedAchievement): Row {
  return {
    id: item.id,
    achievement_code: item.achievementCode,
    unlocked_at: item.unlockedAt,
    seen: boolToInt(item.seen),
    ...writeSyncMeta(item),
  };
}

export function rowToBrainProgress(row: Row): BrainCategoryProgress {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    category: toText(row.category, 'mental_math') as BrainCategory,
    attempts: toNumber(row.attempts),
    correct: toNumber(row.correct),
    mastery: toNumber(row.mastery),
    lastPracticedAt: toNullableNumber(row.last_practiced_at),
  };
}

export function brainProgressToRow(item: BrainCategoryProgress): Row {
  return {
    id: item.id,
    category: item.category,
    attempts: item.attempts,
    correct: item.correct,
    mastery: item.mastery,
    last_practiced_at: item.lastPracticedAt ?? null,
    ...writeSyncMeta(item),
  };
}

export function rowToThinkingScore(row: Row): ThinkingScoreState {
  const stored = parseJsonColumn<Record<string, number>>(row.dimensions_json, {});
  const dimensions = {} as Record<ThinkingDimension, number>;
  for (const key of THINKING_DIMENSIONS) dimensions[key] = stored[key] ?? 0;
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    score: toNumber(row.score),
    dimensions,
    updatedDay: toText(row.updated_day),
  };
}

export function thinkingScoreToRow(item: ThinkingScoreState): Row {
  return {
    id: item.id,
    score: item.score,
    dimensions_json: jsonColumn(item.dimensions),
    updated_day: item.updatedDay,
    ...writeSyncMeta(item),
  };
}

export function rowToGoal(row: Row): StudyGoal {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    kind: toText(row.kind, 'daily_questions') as StudyGoalKind,
    target: toNumber(row.target),
    progress: toNumber(row.progress),
    periodKey: toNullableText(row.period_key),
    topicId: toNullableText(row.topic_id),
    examId: toNullableText(row.exam_id),
    active: intToBool(row.active),
  };
}

export function goalToRow(item: StudyGoal): Row {
  return {
    id: item.id,
    kind: item.kind,
    target: item.target,
    progress: item.progress,
    period_key: item.periodKey ?? null,
    topic_id: item.topicId ?? null,
    exam_id: item.examId ?? null,
    active: boolToInt(item.active),
    ...writeSyncMeta(item),
  };
}

export function rowToReviewItem(row: Row): ReviewItem {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    itemType: toText(row.item_type, 'question') as ReviewItem['itemType'],
    itemId: toText(row.item_id),
    topicId: toNullableText(row.topic_id),
    stage: toNumber(row.stage),
    dueAt: toNumber(row.due_at),
    lastReviewedAt: toNullableNumber(row.last_reviewed_at),
    repetitions: toNumber(row.repetitions),
    lapses: toNumber(row.lapses),
    ease: toNumber(row.ease, 2.2),
    snapshot: toNullableText(row.snapshot),
  };
}

export function reviewItemToRow(item: ReviewItem): Row {
  return {
    id: item.id,
    item_type: item.itemType,
    item_id: item.itemId,
    topic_id: item.topicId ?? null,
    stage: item.stage,
    due_at: item.dueAt,
    last_reviewed_at: item.lastReviewedAt ?? null,
    repetitions: item.repetitions,
    lapses: item.lapses,
    ease: item.ease,
    snapshot: item.snapshot ?? null,
    ...writeSyncMeta(item),
  };
}

export function rowToBookmark(row: Row): Bookmark {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    itemType: toText(row.item_type, 'question') as BookmarkItemType,
    itemId: toText(row.item_id),
    label: toText(row.label),
    note: toNullableText(row.note),
    snapshot: toNullableText(row.snapshot),
  };
}

export function bookmarkToRow(item: Bookmark): Row {
  return {
    id: item.id,
    item_type: item.itemType,
    item_id: item.itemId,
    label: item.label,
    note: item.note ?? null,
    snapshot: item.snapshot ?? null,
    ...writeSyncMeta(item),
  };
}

export function rowToStudySession(row: Row): StudySession {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    mode: toText(row.mode, 'practice') as PracticeMode,
    startedAt: toNumber(row.started_at),
    endedAt: toNullableNumber(row.ended_at),
    questionsAnswered: toNumber(row.questions_answered),
    correct: toNumber(row.correct),
    xpEarned: toNumber(row.xp_earned),
    topicId: toNullableText(row.topic_id),
    meta: toNullableText(row.meta),
  };
}

export function studySessionToRow(item: StudySession): Row {
  return {
    id: item.id,
    mode: item.mode,
    started_at: item.startedAt,
    ended_at: item.endedAt ?? null,
    questions_answered: item.questionsAnswered,
    correct: item.correct,
    xp_earned: item.xpEarned,
    topic_id: item.topicId ?? null,
    meta: item.meta ?? null,
    ...writeSyncMeta(item),
  };
}

export function rowToExamAttempt(row: Row): ExamAttempt {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    examId: toText(row.exam_id),
    startedAt: toNumber(row.started_at),
    finishedAt: toNullableNumber(row.finished_at),
    score: toNumber(row.score),
    maxScore: toNumber(row.max_score),
    accuracy: toNumber(row.accuracy),
    totalQuestions: toNumber(row.total_questions),
    correct: toNumber(row.correct),
    wrong: toNumber(row.wrong),
    skipped: toNumber(row.skipped),
    totalTimeMs: toNumber(row.total_time_ms),
    resultJson: toText(row.result_json, '{}'),
  };
}

export function examAttemptToRow(item: ExamAttempt): Row {
  return {
    id: item.id,
    exam_id: item.examId,
    started_at: item.startedAt,
    finished_at: item.finishedAt ?? null,
    score: item.score,
    max_score: item.maxScore,
    accuracy: item.accuracy,
    total_questions: item.totalQuestions,
    correct: item.correct,
    wrong: item.wrong,
    skipped: item.skipped,
    total_time_ms: item.totalTimeMs,
    result_json: item.resultJson,
    ...writeSyncMeta(item),
  };
}

export function rowToGameScore(row: Row): GameScore {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    gameKind: toText(row.game_kind, 'speed_math') as GameKind,
    score: toNumber(row.score),
    correct: toNumber(row.correct),
    wrong: toNumber(row.wrong),
    maxCombo: toNumber(row.max_combo),
    durationMs: toNumber(row.duration_ms),
    playedAt: toNumber(row.played_at),
    difficultyReached: toNumber(row.difficulty_reached, 1),
  };
}

export function gameScoreToRow(item: GameScore): Row {
  return {
    id: item.id,
    game_kind: item.gameKind,
    score: item.score,
    correct: item.correct,
    wrong: item.wrong,
    max_combo: item.maxCombo,
    duration_ms: item.durationMs,
    played_at: item.playedAt,
    difficulty_reached: item.difficultyReached,
    ...writeSyncMeta(item),
  };
}

export function rowToChallengeAttempt(row: Row): ChallengeAttempt {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    challengeId: toText(row.challenge_id),
    startedAt: toNumber(row.started_at),
    finishedAt: toNullableNumber(row.finished_at),
    score: toNumber(row.score),
    correct: toNumber(row.correct),
    total: toNumber(row.total),
    passed: intToBool(row.passed),
  };
}

export function challengeAttemptToRow(item: ChallengeAttempt): Row {
  return {
    id: item.id,
    challenge_id: item.challengeId,
    started_at: item.startedAt,
    finished_at: item.finishedAt ?? null,
    score: item.score,
    correct: item.correct,
    total: item.total,
    passed: boolToInt(item.passed),
    ...writeSyncMeta(item),
  };
}

export function rowToMission(row: Row): MissionState {
  return {
    ...readSyncMeta(row),
    id: toText(row.id),
    code: toText(row.code),
    periodKey: toText(row.period_key),
    target: toNumber(row.target, 1),
    progress: toNumber(row.progress),
    completed: intToBool(row.completed),
    claimedAt: toNullableNumber(row.claimed_at),
  };
}

export function missionToRow(item: MissionState): Row {
  return {
    id: item.id,
    code: item.code,
    period_key: item.periodKey,
    target: item.target,
    progress: item.progress,
    completed: boolToInt(item.completed),
    claimed_at: item.claimedAt ?? null,
    ...writeSyncMeta(item),
  };
}

/** Lowercased haystack for offline search (spec §37). */
export function searchText(parts: readonly (string | undefined | null)[]): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
    .join(' ')
    .toLowerCase()
    .slice(0, 2000);
}
