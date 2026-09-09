import { createNodeDatabase } from '../support/nodeDatabase';
import { LATEST_SCHEMA_VERSION, MIGRATIONS, runMigrations, schemaVersion } from '../../src/data/database/migrations';
import { orderByDependency, seedContent, validateAllPacks } from '../../src/data/database/seed/seeder';
import { collectKnownIds, formatReport, validatePack, validateQuestion } from '../../src/data/database/seed/validator';
import { CONTENT_PACKS, packById } from '../../src/data/content/packs';
import { createLocalRepositories } from '../../src/data/repositories/local';
import { generateQuestions } from '../../src/core/question-engine/registry';
import { newSyncMeta, LOCAL_USER_ID, type Question } from '../../src/domain/models';
import type { SqlDatabase } from '../../src/data/database/sqlite/adapter';
import { WhereBuilder, upsertStatement } from '../../src/data/database/sqlite/adapter';
import { uuid } from '../../src/core/utils/id';
import { dayKey } from '../../src/core/utils/date';
import { ContentError } from '../../src/core/errors';
import type { RepositoryRegistry } from '../../src/domain/repositories';

jest.setTimeout(120000);

async function freshDb(): Promise<SqlDatabase> {
  const db = createNodeDatabase();
  await runMigrations(db);
  return db;
}

async function seededRepos(): Promise<{ db: SqlDatabase; repos: RepositoryRegistry }> {
  const db = await freshDb();
  await seedContent(db);
  return { db, repos: createLocalRepositories(db) };
}

describe('migrations', () => {
  it('are numbered consecutively', () => {
    MIGRATIONS.forEach((migration, index) => {
      expect(migration.version).toBe(index + 1);
      expect(migration.statements.length).toBeGreaterThan(0);
    });
    expect(LATEST_SCHEMA_VERSION).toBe(MIGRATIONS.length);
  });

  it('applies every migration to an empty database', async () => {
    const db = createNodeDatabase();
    const report = await runMigrations(db);
    expect(report.fromVersion).toBe(0);
    expect(report.toVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(report.applied).toHaveLength(MIGRATIONS.length);
    expect(await schemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    await db.close();
  });

  it('is idempotent on a second run', async () => {
    const db = await freshDb();
    const second = await runMigrations(db);
    expect(second.applied).toHaveLength(0);
    expect(second.toVersion).toBe(LATEST_SCHEMA_VERSION);
    await db.close();
  });

  it('never destroys user data on re-run', async () => {
    const db = await freshDb();
    const repos = createLocalRepositories(db);
    const profile = await repos.users.getProfile();
    await repos.users.updateProfile({ ...profile, name: 'Nusrat' });
    await runMigrations(db);
    expect((await repos.users.getProfile()).name).toBe('Nusrat');
    await db.close();
  });

  it('creates the expected tables and indexes', async () => {
    const db = await freshDb();
    const tables = await db.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    const names = tables.map((t) => t.name);
    for (const expected of [
      'questions',
      'topics',
      'skills',
      'lessons',
      'formulas',
      'exams',
      'games',
      'challenges',
      'question_attempts',
      'mistakes',
      'topic_progress',
      'skill_progress',
      'review_items',
      'bookmarks',
      'daily_activity',
      'study_goals',
      'thinking_score',
      'content_packs',
    ]) {
      expect(names).toContain(expected);
    }
    const indexes = await db.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'",
    );
    expect(indexes.length).toBeGreaterThan(15);
    await db.close();
  });
});

describe('content validation', () => {
  it('accepts every bundled pack', () => {
    const reports = validateAllPacks();
    const failures = reports.filter((r) => !r.valid);
    if (failures.length > 0) {
      throw new Error(failures.map(formatReport).join('\n'));
    }
    expect(reports).toHaveLength(CONTENT_PACKS.length);
  });

  it('reports no warnings for the core pack', () => {
    const ids = collectKnownIds(CONTENT_PACKS);
    const report = validatePack(packById('pack.core')!, ids);
    expect(report.valid).toBe(true);
  });

  it('rejects a question with a dangling topic', () => {
    const ids = collectKnownIds(CONTENT_PACKS);
    const bad: Question = {
      id: 'q.bad',
      topicId: 'does-not-exist',
      skillIds: [],
      difficulty: 3,
      questionType: 'numeric',
      curriculumIds: ['bangladesh'],
      examIds: [],
      tags: [],
      prompt: '1 + 1',
      correctAnswer: '2',
      solutionSteps: [{ order: 1, detail: '2' }],
      source: 'static',
      questionVersion: 1,
      contentVersion: 1,
    };
    const issues = validateQuestion(bad, ids);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('Unknown topic'))).toBe(true);
  });

  it('rejects an mcq whose answer is not an option', () => {
    const ids = collectKnownIds(CONTENT_PACKS);
    const bad: Question = {
      id: 'q.bad-mcq',
      topicId: 'arithmetic',
      skillIds: [],
      difficulty: 3,
      questionType: 'mcq',
      curriculumIds: ['bangladesh'],
      examIds: [],
      tags: [],
      prompt: '1 + 1',
      options: [
        { id: 'a', text: '2' },
        { id: 'b', text: '3' },
      ],
      correctAnswer: 'z',
      solutionSteps: [{ order: 1, detail: '2' }],
      source: 'static',
      questionVersion: 1,
      contentVersion: 1,
    };
    const issues = validateQuestion(bad, ids);
    expect(issues.some((i) => i.message.includes('not one of the option ids'))).toBe(true);
  });

  it('rejects out-of-order solution steps', () => {
    const ids = collectKnownIds(CONTENT_PACKS);
    const bad: Question = {
      id: 'q.bad-steps',
      topicId: 'arithmetic',
      skillIds: [],
      difficulty: 3,
      questionType: 'numeric',
      curriculumIds: ['bangladesh'],
      examIds: [],
      tags: [],
      prompt: '1 + 1',
      correctAnswer: '2',
      solutionSteps: [{ order: 5, detail: 'wrong order' }],
      source: 'static',
      questionVersion: 1,
      contentVersion: 1,
    };
    expect(validateQuestion(bad, ids).some((i) => i.message.includes('ordered from 1'))).toBe(true);
  });

  it('refuses to seed an invalid pack', async () => {
    const db = await freshDb();
    const broken = {
      ...packById('pack.foundation')!,
      questions: [
        {
          id: 'q.broken',
          topicId: 'nope',
          skillIds: [],
          difficulty: 99,
          questionType: 'numeric' as const,
          curriculumIds: ['bangladesh' as const],
          examIds: [],
          tags: [],
          prompt: '',
          correctAnswer: '',
          solutionSteps: [],
          source: 'static' as const,
          questionVersion: 1,
          contentVersion: 1,
        },
      ],
    };
    await expect(seedContent(db, [broken])).rejects.toThrow(ContentError);
    const count = await db.selectOne<{ total: number }>('SELECT COUNT(*) AS total FROM questions');
    expect(count?.total).toBe(0);
    await db.close();
  });
});

describe('seeding', () => {
  it('orders packs so dependencies come first', () => {
    const ordered = orderByDependency(CONTENT_PACKS);
    const positions = new Map(ordered.map((p, i) => [p.meta.id, i]));
    for (const pack of ordered) {
      for (const requiredId of pack.meta.requires) {
        if (!positions.has(requiredId)) continue;
        expect(positions.get(requiredId)!).toBeLessThan(positions.get(pack.meta.id)!);
      }
    }
  });

  it('seeds content and reports what it inserted', async () => {
    const db = await freshDb();
    const summary = await seedContent(db);
    expect(summary.totalInserted).toBeGreaterThan(0);
    expect(summary.reports.every((r) => !r.skipped)).toBe(true);

    const stats = await createLocalRepositories(db).packs.getContentStats();
    expect(stats.topics).toBeGreaterThan(50);
    expect(stats.skills).toBeGreaterThan(50);
    expect(stats.lessons).toBeGreaterThan(5);
    expect(stats.formulas).toBeGreaterThan(40);
    expect(stats.exams).toBeGreaterThan(8);
    expect(stats.games).toBe(10);
    expect(stats.challenges).toBeGreaterThan(20);
    expect(stats.questions).toBeGreaterThan(20);
    await db.close();
  });

  it('skips a pack whose version and checksum are unchanged', async () => {
    const db = await freshDb();
    await seedContent(db);
    const second = await seedContent(db);
    expect(second.reports.every((r) => r.skipped)).toBe(true);
    await db.close();
  });

  it('re-seeds when forced without touching user data', async () => {
    const db = await freshDb();
    await seedContent(db);
    const repos = createLocalRepositories(db);
    const profile = await repos.users.getProfile();
    await repos.users.updateProfile({ ...profile, name: 'Tanvir', avatarEmoji: '🦊' });

    const forced = await seedContent(db, undefined, { force: true });
    expect(forced.reports.every((r) => !r.skipped)).toBe(true);
    const after = await repos.users.getProfile();
    expect(after.name).toBe('Tanvir');
    expect(after.avatarEmoji).toBe('🦊');
    await db.close();
  });

  it('populates the question join tables', async () => {
    const db = await freshDb();
    await seedContent(db);
    const skills = await db.selectOne<{ total: number }>('SELECT COUNT(*) AS total FROM question_skills');
    const exams = await db.selectOne<{ total: number }>('SELECT COUNT(*) AS total FROM question_exams');
    const tags = await db.selectOne<{ total: number }>('SELECT COUNT(*) AS total FROM question_tags');
    expect(skills!.total).toBeGreaterThan(0);
    expect(exams!.total).toBeGreaterThan(0);
    expect(tags!.total).toBeGreaterThan(0);
    await db.close();
  });
});

describe('question repository', () => {
  it('reads back a seeded question with every field intact', async () => {
    const { db, repos } = await seededRepos();
    const question = await repos.questions.getQuestionById('q.bcs.2023.percent-1');
    expect(question).not.toBeNull();
    expect(question!.promptBn).toContain('৪০%');
    expect(question!.options).toHaveLength(4);
    expect(question!.solutionSteps).toHaveLength(2);
    expect(question!.examIds).toContain('exam.bcs-math');
    expect(question!.year).toBe(2023);
    expect(question!.tags).toContain('previous-year');
    await db.close();
  });

  it('filters by topic, difficulty, exam, skill, tag and year', async () => {
    const { db, repos } = await seededRepos();

    const byTopic = await repos.questions.getQuestions({ topicIds: ['percentage'] });
    expect(byTopic.length).toBeGreaterThan(0);
    expect(byTopic.every((q) => q.topicId === 'percentage')).toBe(true);

    const byDifficulty = await repos.questions.getQuestions({ difficultyMin: 7 });
    expect(byDifficulty.every((q) => q.difficulty >= 7)).toBe(true);

    const byExam = await repos.questions.getQuestions({ examIds: ['exam.bcs-math'] });
    expect(byExam.length).toBeGreaterThan(0);
    expect(byExam.every((q) => q.examIds.includes('exam.bcs-math'))).toBe(true);

    const bySkill = await repos.questions.getQuestions({ skillIds: ['skill.percent-of'] });
    expect(bySkill.length).toBeGreaterThan(0);

    const byTag = await repos.questions.getQuestions({ tags: ['real-life'] });
    expect(byTag.length).toBeGreaterThan(0);
    expect(byTag.every((q) => q.tags.includes('real-life'))).toBe(true);

    const byYear = await repos.questions.getQuestions({ years: [2023] });
    expect(byYear.every((q) => q.year === 2023)).toBe(true);

    await db.close();
  });

  it('searches prompts in both languages', async () => {
    const { db, repos } = await seededRepos();
    const english = await repos.questions.searchQuestions('train');
    expect(english.length).toBeGreaterThan(0);
    const bangla = await repos.questions.searchQuestions('ট্রেন');
    expect(bangla.length).toBeGreaterThan(0);
    const nothing = await repos.questions.searchQuestions('zzzzzznotfound');
    expect(nothing).toHaveLength(0);
    await db.close();
  });

  it('paginates and never returns the whole table at once', async () => {
    const { db, repos } = await seededRepos();
    const page = await repos.questions.getQuestionsPage({ limit: 5, offset: 0 });
    expect(page.items).toHaveLength(5);
    expect(page.total).toBeGreaterThan(5);
    expect(page.hasMore).toBe(true);

    const second = await repos.questions.getQuestionsPage({ limit: 5, offset: 5 });
    expect(second.offset).toBe(5);
    expect(second.items.map((q) => q.id)).not.toEqual(page.items.map((q) => q.id));

    // A silly limit is clamped rather than honoured.
    const clamped = await repos.questions.getQuestions({ limit: 100000 });
    expect(clamped.length).toBeLessThanOrEqual(200);
    await db.close();
  });

  it('excludes ids on request', async () => {
    const { db, repos } = await seededRepos();
    const all = await repos.questions.getQuestions({ topicIds: ['percentage'], limit: 50 });
    const excluded = await repos.questions.getQuestions({
      topicIds: ['percentage'],
      excludeQuestionIds: [all[0].id],
      limit: 50,
    });
    expect(excluded.map((q) => q.id)).not.toContain(all[0].id);
    await db.close();
  });

  it('gives a reproducible random order for a given seed', async () => {
    const { db, repos } = await seededRepos();
    const first = await repos.questions.getRandomQuestions({ seed: 99, limit: 10 });
    const second = await repos.questions.getRandomQuestions({ seed: 99, limit: 10 });
    const different = await repos.questions.getRandomQuestions({ seed: 12345, limit: 10 });
    expect(first.map((q) => q.id)).toEqual(second.map((q) => q.id));
    expect(first.map((q) => q.id)).not.toEqual(different.map((q) => q.id));
    await db.close();
  });

  it('persists generated questions and their join rows', async () => {
    const { db, repos } = await seededRepos();
    const generated = generateQuestions({ count: 12, difficulty: 4, seed: 'persist' });
    await repos.questions.upsertQuestions(generated);

    const stored = await repos.questions.getQuestionById(generated[0].id);
    expect(stored).not.toBeNull();
    expect(stored!.source).toBe('generated');
    expect(stored!.generatorId).toBe(generated[0].generatorId);
    expect(stored!.generatorParams).toEqual(generated[0].generatorParams);
    expect(stored!.solutionSteps.length).toBe(generated[0].solutionSteps.length);

    // Upserting again must not duplicate.
    await repos.questions.upsertQuestions(generated);
    const count = await repos.questions.countQuestions({ excludeQuestionIds: [] });
    const again = await repos.questions.countQuestions({});
    expect(count).toBe(again);
    await db.close();
  });

  it('filters solved and unsolved questions', async () => {
    const { db, repos } = await seededRepos();
    const target = (await repos.questions.getQuestions({ topicIds: ['percentage'], limit: 1 }))[0];
    await repos.attempts.saveAttempt({
      ...newSyncMeta(),
      id: uuid(),
      questionId: target.id,
      topicId: target.topicId,
      skillIds: target.skillIds,
      sessionId: null,
      mode: 'practice',
      difficulty: target.difficulty,
      isCorrect: true,
      givenAnswer: target.correctAnswer,
      correctAnswer: target.correctAnswer,
      timeSpentMs: 12000,
      hintsUsed: 0,
      estimateValue: null,
      estimateAccuracy: null,
      strategy: null,
    });

    const solved = await repos.questions.getQuestions({ solved: true, limit: 50 });
    expect(solved.map((q) => q.id)).toContain(target.id);
    const unsolved = await repos.questions.getQuestions({ solved: false, limit: 200 });
    expect(unsolved.map((q) => q.id)).not.toContain(target.id);
    await db.close();
  });
});

describe('content repositories', () => {
  it('builds the topic tree', async () => {
    const { db, repos } = await seededRepos();
    const topics = await repos.topics.getTopics();
    expect(topics.length).toBeGreaterThan(50);
    const roots = await repos.topics.getChildTopics(null);
    expect(roots.length).toBeGreaterThan(5);
    const children = await repos.topics.getChildTopics('numbers');
    expect(children.map((t) => t.id)).toContain('fractions');
    const percentage = await repos.topics.getTopicById('percentage');
    expect(percentage!.nameBn).toBe('শতকরা');
    expect(percentage!.prerequisiteTopicIds).toContain('fractions');
    await db.close();
  });

  it('returns lessons with their sections and visuals', async () => {
    const { db, repos } = await seededRepos();
    const lessons = await repos.lessons.getLessons('percentage');
    expect(lessons.length).toBeGreaterThan(0);
    const lesson = lessons[0];
    expect(lesson.sections.length).toBe(7);
    expect(lesson.sections[0].kind).toBe('concept');
    expect(lesson.sections.some((s) => !!s.visual)).toBe(true);
    expect(lesson.practiceGeneratorIds.length).toBeGreaterThan(0);
    await db.close();
  });

  it('marks a lesson complete', async () => {
    const { db, repos } = await seededRepos();
    await repos.lessons.markLessonCompleted({
      ...newSyncMeta(),
      id: uuid(),
      lessonId: 'lesson.percentage-basics',
      topicId: 'percentage',
      completedAt: Date.now(),
      masteryScore: 0.9,
    });
    const done = await repos.lessons.getCompletedLessons();
    expect(done).toHaveLength(1);
    expect(done[0].lessonId).toBe('lesson.percentage-basics');
    await db.close();
  });

  it('searches formulas and returns their variables', async () => {
    const { db, repos } = await seededRepos();
    const found = await repos.formulas.searchFormulas('pythagoras');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].variables.length).toBeGreaterThan(0);
    expect(found[0].commonMistakes.length).toBeGreaterThan(0);

    const byCategory = await repos.formulas.getFormulas({ categories: ['calculus'] });
    expect(byCategory.every((f) => f.category === 'calculus')).toBe(true);
    await db.close();
  });

  it('returns exams with their section blueprints', async () => {
    const { db, repos } = await seededRepos();
    const exams = await repos.exams.getExams();
    expect(exams.length).toBeGreaterThan(8);
    const bcs = await repos.exams.getExamById('exam.bcs-math');
    expect(bcs!.totalQuestions).toBe(50);
    expect(bcs!.durationSeconds).toBe(1800);
    expect(bcs!.negativeMarkPerWrong).toBe(0.5);
    expect(bcs!.sections.reduce((a, s) => a + s.questionCount, 0)).toBe(50);
    expect(bcs!.years).toContain(2023);
    await db.close();
  });

  it('returns games and boss challenges', async () => {
    const { db, repos } = await seededRepos();
    const games = await repos.games.getGames();
    expect(games).toHaveLength(10);
    const speed = await repos.games.getGameByKind('speed_math');
    expect(speed!.generatorIds.length).toBeGreaterThan(0);

    const challenges = await repos.challenges.getChallenges();
    expect(challenges.filter((c) => c.kind === 'boss').length).toBeGreaterThan(10);
    expect(challenges.some((c) => c.kind === 'daily_mission')).toBe(true);
    await db.close();
  });

  it('cannot disable a core pack', async () => {
    const { db, repos } = await seededRepos();
    await repos.packs.setPackEnabled('pack.core', false);
    const packs = await repos.packs.getInstalledPacks();
    expect(packs.find((p) => p.id === 'pack.core')!.enabled).toBe(true);

    await repos.packs.setPackEnabled('pack.olympiad', false);
    const after = await repos.packs.getInstalledPacks();
    expect(after.find((p) => p.id === 'pack.olympiad')!.enabled).toBe(false);
    await db.close();
  });
});

describe('user repositories', () => {
  it('creates a local profile and settings on first read', async () => {
    const { db, repos } = await seededRepos();
    const profile = await repos.users.getProfile();
    expect(profile.id).toBe(LOCAL_USER_ID);
    expect(profile.language).toBe('bn');
    const settings = await repos.users.getSettings();
    expect(settings.themeMode).toBe('system');
    expect(settings.adaptiveDifficultyEnabled).toBe(true);

    await repos.users.updateSettings({ ...settings, largeText: true, language: 'en' });
    const updated = await repos.users.getSettings();
    expect(updated.largeText).toBe(true);
    expect(updated.language).toBe('en');
    await db.close();
  });

  it('stores attempts and filters them', async () => {
    const { db, repos } = await seededRepos();
    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      await repos.attempts.saveAttempt({
        ...newSyncMeta(now + i),
        id: 'attempt-' + i,
        questionId: 'q-' + i,
        topicId: i % 2 === 0 ? 'percentage' : 'fractions',
        skillIds: ['skill.percent-of'],
        sessionId: 'session-1',
        mode: i === 5 ? 'exam' : 'practice',
        difficulty: 4,
        isCorrect: i % 3 !== 0,
        givenAnswer: 'x',
        correctAnswer: 'x',
        timeSpentMs: 10000 + i * 1000,
        hintsUsed: 0,
        estimateValue: null,
        estimateAccuracy: null,
        strategy: null,
      });
    }

    expect(await repos.attempts.countAttempts({})).toBe(6);
    expect((await repos.attempts.getAttempts({ topicIds: ['percentage'] })).length).toBe(3);
    expect((await repos.attempts.getAttempts({ isCorrect: false })).length).toBe(2);
    expect((await repos.attempts.getAttempts({ modes: ['exam'] })).length).toBe(1);
    expect((await repos.attempts.getAttempts({ skillIds: ['skill.percent-of'] })).length).toBe(6);
    expect((await repos.attempts.getAttempts({ skillIds: ['skill.derivative'] })).length).toBe(0);

    const newest = await repos.attempts.getAttempts({ limit: 1 });
    expect(newest[0].id).toBe('attempt-5');
    await db.close();
  });

  it('merges repeated mistakes instead of duplicating them', async () => {
    const { db, repos } = await seededRepos();
    const base = {
      ...newSyncMeta(),
      id: uuid(),
      questionId: 'q.repeat',
      topicId: 'percentage',
      skillIds: ['skill.percent-of'],
      difficulty: 5,
      mistakeCount: 1,
      lastMistakeAt: 1000,
      correctStreak: 0,
      resolved: false,
      questionSnapshot: '{"id":"q.repeat"}',
      reason: null,
    };
    await repos.mistakes.recordMistake(base);
    await repos.mistakes.recordMistake({ ...base, id: uuid(), lastMistakeAt: 2000 });
    await repos.mistakes.recordMistake({ ...base, id: uuid(), lastMistakeAt: 3000 });

    const all = await repos.mistakes.getMistakes();
    expect(all).toHaveLength(1);
    expect(all[0].mistakeCount).toBe(3);
    expect(all[0].lastMistakeAt).toBe(3000);

    const counts = await repos.mistakes.countByTopic();
    expect(counts).toEqual([{ topicId: 'percentage', count: 1 }]);

    await repos.mistakes.updateMistake({ ...all[0], resolved: true });
    expect(await repos.mistakes.getMistakes()).toHaveLength(0);
    expect(await repos.mistakes.getMistakes({ includeResolved: true })).toHaveLength(1);
    await db.close();
  });

  it('tracks progress, streaks, brain categories and the thinking score', async () => {
    const { db, repos } = await seededRepos();
    const progress = await repos.progress.getProgress(LOCAL_USER_ID);
    expect(progress.level).toBe(1);
    await repos.progress.updateProgress({ ...progress, xp: 3000, questionsSolved: 40 });
    expect((await repos.progress.getProgress(LOCAL_USER_ID)).xp).toBe(3000);

    await repos.progress.upsertTopicProgress({
      ...newSyncMeta(),
      id: uuid(),
      topicId: 'percentage',
      attempts: 20,
      correct: 15,
      totalTimeMs: 200000,
      mastery: 0.62,
      bestDifficulty: 6,
      lastPracticedAt: Date.now(),
      bossDefeatedAt: null,
    });
    const topicProgress = await repos.progress.getTopicProgress('percentage');
    expect(topicProgress[0].mastery).toBeCloseTo(0.62, 5);

    await repos.progress.upsertSkillProgress({
      ...newSyncMeta(),
      id: uuid(),
      skillId: 'skill.percent-of',
      topicId: 'percentage',
      attempts: 10,
      correct: 6,
      totalTimeMs: 90000,
      mastery: 0.5,
      recentOutcomes: '1101001',
      lastPracticedAt: Date.now(),
    });
    expect((await repos.progress.getSkillProgress(['skill.percent-of']))[0].recentOutcomes).toBe('1101001');

    const streak = await repos.progress.getStreak();
    await repos.progress.updateStreak({ ...streak, currentStreak: 12, longestStreak: 30, lastActiveDay: dayKey() });
    expect((await repos.progress.getStreak()).currentStreak).toBe(12);

    const brain = await repos.progress.getBrainProgress();
    expect(brain.length).toBeGreaterThan(10);
    await repos.progress.upsertBrainProgress({ ...brain[0], attempts: 5, correct: 4, mastery: 0.7 });
    const updatedBrain = await repos.progress.getBrainProgress();
    expect(updatedBrain.find((b) => b.category === brain[0].category)!.attempts).toBe(5);

    const thinking = await repos.progress.getThinkingScore();
    expect(Object.keys(thinking.dimensions)).toHaveLength(8);
    await repos.progress.updateThinkingScore({ ...thinking, score: 640, dimensions: { ...thinking.dimensions, logic: 700 } });
    const reread = await repos.progress.getThinkingScore();
    expect(reread.score).toBe(640);
    expect(reread.dimensions.logic).toBe(700);
    await db.close();
  });

  it('stores daily activity keyed by day', async () => {
    const { db, repos } = await seededRepos();
    const today = dayKey();
    await repos.progress.upsertDailyActivity({
      ...newSyncMeta(),
      id: 'day-' + today,
      day: today,
      questionsAnswered: 18,
      correct: 15,
      minutesStudied: 22,
      xpEarned: 260,
      brainScore: 80,
      goalMet: false,
    });
    await repos.progress.upsertDailyActivity({
      ...newSyncMeta(),
      id: 'day-' + today,
      day: today,
      questionsAnswered: 24,
      correct: 20,
      minutesStudied: 30,
      xpEarned: 320,
      brainScore: 90,
      goalMet: true,
    });
    const days = await repos.progress.getDailyActivity(7);
    expect(days).toHaveLength(1);
    expect(days[0].questionsAnswered).toBe(24);
    expect(days[0].goalMet).toBe(true);
    await db.close();
  });

  it('manages study goals', async () => {
    const { db, repos } = await seededRepos();
    const goal = {
      ...newSyncMeta(),
      id: 'goal-1',
      kind: 'daily_questions' as const,
      target: 20,
      progress: 5,
      periodKey: dayKey(),
      topicId: null,
      examId: null,
      active: true,
    };
    await repos.progress.upsertGoal(goal);
    expect((await repos.progress.getGoals())[0].target).toBe(20);
    await repos.progress.upsertGoal({ ...goal, progress: 20 });
    expect((await repos.progress.getGoals())[0].progress).toBe(20);
    await repos.progress.removeGoal('goal-1');
    expect(await repos.progress.getGoals()).toHaveLength(0);
    await db.close();
  });

  it('keeps the spaced repetition queue unique per item', async () => {
    const { db, repos } = await seededRepos();
    const now = Date.now();
    const item = {
      ...newSyncMeta(),
      id: uuid(),
      itemType: 'question' as const,
      itemId: 'q.review',
      topicId: 'percentage',
      stage: 1,
      dueAt: now - 1000,
      lastReviewedAt: null,
      repetitions: 1,
      lapses: 0,
      ease: 2.2,
      snapshot: null,
    };
    await repos.reviews.upsertReviewItem(item);
    await repos.reviews.upsertReviewItem({ ...item, id: uuid(), stage: 3, dueAt: now + 100000 });

    expect(await repos.reviews.countDue(now)).toBe(0);
    const stored = await repos.reviews.getReviewItem('question', 'q.review');
    expect(stored!.stage).toBe(3);

    await repos.reviews.upsertReviewItem({ ...stored!, dueAt: now - 5000 });
    expect(await repos.reviews.countDue(now)).toBe(1);
    expect((await repos.reviews.getDueItems(now))[0].itemId).toBe('q.review');

    await repos.reviews.removeReviewItem(stored!.id);
    expect(await repos.reviews.countDue(now)).toBe(0);
    await db.close();
  });

  it('toggles bookmarks', async () => {
    const { db, repos } = await seededRepos();
    await repos.bookmarks.addBookmark({
      ...newSyncMeta(),
      id: uuid(),
      itemType: 'formula',
      itemId: 'formula.pythagoras',
      label: 'Pythagoras theorem',
      note: null,
      snapshot: null,
    });
    expect(await repos.bookmarks.isBookmarked('formula', 'formula.pythagoras')).toBe(true);
    expect(await repos.bookmarks.getBookmarks('formula')).toHaveLength(1);
    expect(await repos.bookmarks.getBookmarks('question')).toHaveLength(0);
    await repos.bookmarks.removeBookmark('formula', 'formula.pythagoras');
    expect(await repos.bookmarks.isBookmarked('formula', 'formula.pythagoras')).toBe(false);
    await db.close();
  });

  it('records exam, game and challenge attempts', async () => {
    const { db, repos } = await seededRepos();
    await repos.exams.saveExamAttempt({
      ...newSyncMeta(),
      id: 'exam-attempt-1',
      examId: 'exam.bcs-math',
      startedAt: 1000,
      finishedAt: 2000,
      score: 32.5,
      maxScore: 50,
      accuracy: 0.7,
      totalQuestions: 50,
      correct: 35,
      wrong: 10,
      skipped: 5,
      totalTimeMs: 1700000,
      resultJson: '{"weakTopics":[]}',
    });
    const attempts = await repos.exams.getExamAttempts('exam.bcs-math');
    expect(attempts).toHaveLength(1);
    expect(attempts[0].score).toBeCloseTo(32.5, 5);
    expect((await repos.exams.getExamAttemptById('exam-attempt-1'))!.correct).toBe(35);

    for (const score of [120, 340, 220]) {
      await repos.games.saveScore({
        ...newSyncMeta(),
        id: uuid(),
        gameKind: 'speed_math',
        score,
        correct: score / 10,
        wrong: 2,
        maxCombo: 6,
        durationMs: 60000,
        playedAt: Date.now(),
        difficultyReached: 5,
      });
    }
    const high = await repos.games.getHighScores();
    expect(high[0].bestScore).toBe(340);
    expect(high[0].playCount).toBe(3);
    expect((await repos.games.getScores('speed_math'))[0].score).toBe(340);

    await repos.challenges.saveChallengeAttempt({
      ...newSyncMeta(),
      id: uuid(),
      challengeId: 'challenge.boss.percentage',
      startedAt: 1,
      finishedAt: 2,
      score: 8,
      correct: 8,
      total: 10,
      passed: true,
    });
    expect((await repos.challenges.getChallengeAttempts('challenge.boss.percentage'))[0].passed).toBe(true);

    await repos.challenges.upsertMission({
      ...newSyncMeta(),
      id: uuid(),
      code: 'daily_10',
      periodKey: dayKey(),
      target: 10,
      progress: 4,
      completed: false,
      claimedAt: null,
    });
    const missions = await repos.challenges.getMissions(dayKey());
    expect(missions).toHaveLength(1);
    expect(missions[0].progress).toBe(4);
    await db.close();
  });

  it('unlocks achievements only once', async () => {
    const { db, repos } = await seededRepos();
    const catalog = await repos.achievements.getCatalog();
    expect(catalog.length).toBeGreaterThan(20);

    const unlocked = {
      ...newSyncMeta(),
      id: uuid(),
      achievementCode: 'first_steps',
      unlockedAt: Date.now(),
      seen: false,
    };
    await repos.achievements.unlock(unlocked);
    await repos.achievements.unlock({ ...unlocked, id: uuid() });
    const list = await repos.achievements.getUnlocked();
    expect(list).toHaveLength(1);
    expect(list[0].seen).toBe(false);

    await repos.achievements.markSeen(['first_steps']);
    expect((await repos.achievements.getUnlocked())[0].seen).toBe(true);
    await db.close();
  });
});

describe('sql helpers', () => {
  it('binds every value as a parameter', () => {
    const built = new WhereBuilder()
      .eq('topic_id', "'; DROP TABLE questions; --")
      .in('difficulty', [1, 2, 3])
      .like(['prompt'], 'percent')
      .build();
    expect(built.sql).not.toContain('DROP');
    expect(built.sql).toContain('?');
    expect(built.params).toContain("'; DROP TABLE questions; --");
  });

  it('survives an injection attempt end to end', async () => {
    const { db, repos } = await seededRepos();
    const result = await repos.questions.searchQuestions("'; DROP TABLE questions; --");
    expect(result).toHaveLength(0);
    const stats = await repos.packs.getContentStats();
    expect(stats.questions).toBeGreaterThan(0);
    await db.close();
  });

  it('builds an upsert statement', () => {
    const statement = upsertStatement('topics', 'id', { id: 'a', name: 'A' });
    expect(statement.sql).toContain('ON CONFLICT(id) DO UPDATE SET');
    expect(statement.params).toEqual(['a', 'A']);
  });
});
