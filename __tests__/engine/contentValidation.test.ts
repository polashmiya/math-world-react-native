/**
 * The content validation entry point (spec §51).
 *
 *   npm run validate:content
 *
 * It runs the same validators the seeder uses, over every bundled pack and
 * every generator, so an invalid question fails the build instead of reaching
 * a device.
 */
import { CONTENT_PACKS, packById } from '../../src/data/content/packs';
import { validateAllPacks } from '../../src/data/database/seed/seeder';
import {
  collectKnownIds,
  formatReport,
  validateQuestion,
  type ValidationIssue,
} from '../../src/data/database/seed/validator';
import { ALL_GENERATORS, generateQuestions } from '../../src/core/question-engine/registry';
import { contextFor } from '../../src/core/question-engine/types';
import { validateAnswer } from '../../src/core/question-engine/answerValidator';
import { TAXONOMY_SKILLS, TAXONOMY_TOPICS, topicExists } from '../../src/domain/taxonomy';
import { EXAMS } from '../../src/data/content/exams';
import { FORMULAS } from '../../src/data/content/formulas';
import { LESSONS } from '../../src/data/content/lessons';
import { STATIC_QUESTIONS } from '../../src/data/content/questions';
import { ACHIEVEMENTS } from '../../src/data/content/achievements';
import { CHALLENGES, GAMES } from '../../src/data/content/games';
import { LESSON_SECTION_ORDER } from '../../src/domain/models';
import { APP_CONFIG, schemaVersionsAgree } from '../../src/app/config/appConfig';
import { LATEST_SCHEMA_VERSION } from '../../src/data/database/migrations';

jest.setTimeout(180000);

describe('content packs', () => {
  it('all pass validation with zero errors', () => {
    const reports = validateAllPacks(CONTENT_PACKS);
    const failed = reports.filter((report) => !report.valid);
    if (failed.length > 0) throw new Error(failed.map(formatReport).join('\n'));
    expect(reports.every((report) => report.valid)).toBe(true);
  });

  it('have unique ids and a single core pack', () => {
    const ids = CONTENT_PACKS.map((pack) => pack.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CONTENT_PACKS.filter((pack) => pack.meta.core)).toHaveLength(1);
  });

  it('only require packs that exist', () => {
    const ids = new Set(CONTENT_PACKS.map((pack) => pack.meta.id));
    for (const pack of CONTENT_PACKS) {
      for (const required of pack.meta.requires) {
        expect(ids.has(required)).toBe(true);
      }
    }
  });

  it('ship the core pack with the root topics', () => {
    const core = packById('pack.core')!;
    const roots = TAXONOMY_TOPICS.filter((topic) => topic.parentId === null).map((topic) => topic.id);
    const packed = new Set((core.topics ?? []).map((topic) => topic.id));
    for (const root of roots) expect(packed.has(root)).toBe(true);
  });
});

describe('taxonomy integrity', () => {
  it('has unique topic and skill ids', () => {
    const topicIds = TAXONOMY_TOPICS.map((topic) => topic.id);
    const skillIds = TAXONOMY_SKILLS.map((skill) => skill.id);
    expect(new Set(topicIds).size).toBe(topicIds.length);
    expect(new Set(skillIds).size).toBe(skillIds.length);
  });

  it('has no dangling parents, prerequisites or skill topics', () => {
    for (const topic of TAXONOMY_TOPICS) {
      if (topic.parentId) expect(topicExists(topic.parentId)).toBe(true);
      for (const prerequisite of topic.prerequisiteTopicIds) {
        expect(topicExists(prerequisite)).toBe(true);
      }
    }
    for (const skill of TAXONOMY_SKILLS) {
      expect(topicExists(skill.topicId)).toBe(true);
    }
  });

  it('has no cycles in the topic tree', () => {
    const byId = new Map(TAXONOMY_TOPICS.map((topic) => [topic.id, topic]));
    for (const topic of TAXONOMY_TOPICS) {
      const seen = new Set<string>();
      let current = topic;
      while (current.parentId) {
        expect(seen.has(current.id)).toBe(false);
        seen.add(current.id);
        current = byId.get(current.parentId)!;
        expect(current).toBeDefined();
      }
    }
  });

  it('gives every topic Bangla text', () => {
    for (const topic of TAXONOMY_TOPICS) {
      expect(topic.nameBn.trim().length).toBeGreaterThan(0);
      expect(topic.descriptionBn.trim().length).toBeGreaterThan(0);
    }
    for (const skill of TAXONOMY_SKILLS) {
      expect(skill.nameBn.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('lessons', () => {
  it('follow the required section flow', () => {
    for (const lesson of LESSONS) {
      const kinds = lesson.sections.map((section) => section.kind);
      // Sections must appear in the canonical order, with no repeats.
      const positions = kinds.map((kind) => LESSON_SECTION_ORDER.indexOf(kind));
      expect(positions.every((position) => position >= 0)).toBe(true);
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThan(positions[i - 1]);
      }
      expect(kinds).toContain('concept');
      expect(kinds).toContain('worked_example');
      expect(kinds).toContain('mastery_test');
    }
  });

  it('have Bangla text in every section', () => {
    for (const lesson of LESSONS) {
      expect(lesson.titleBn.trim().length).toBeGreaterThan(0);
      expect(lesson.summaryBn.trim().length).toBeGreaterThan(0);
      for (const section of lesson.sections) {
        expect(section.titleBn.trim().length).toBeGreaterThan(0);
        expect(section.bodyBn.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('have unique ids and real topics', () => {
    const ids = LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lesson of LESSONS) expect(topicExists(lesson.topicId)).toBe(true);
  });
});

describe('static questions', () => {
  it('pass the question validator', () => {
    const knownIds = collectKnownIds(CONTENT_PACKS);
    const issues: ValidationIssue[] = [];
    const seen = new Set<string>();
    for (const question of STATIC_QUESTIONS) {
      issues.push(...validateQuestion(question, knownIds, seen));
      seen.add(question.id);
    }
    const errors = issues.filter((issue) => issue.severity === 'error');
    if (errors.length > 0) {
      throw new Error(errors.map((issue) => issue.id + ': ' + issue.message).join('\n'));
    }
    expect(errors).toHaveLength(0);
  });

  it('accept their own answers through the validator', () => {
    for (const question of STATIC_QUESTIONS) {
      expect(validateAnswer(question, question.correctAnswer).isCorrect).toBe(true);
    }
  });

  it('have Bangla prompts and solution steps', () => {
    for (const question of STATIC_QUESTIONS) {
      expect(question.promptBn?.trim().length ?? 0).toBeGreaterThan(0);
      expect(question.solutionSteps.length).toBeGreaterThan(0);
      expect(question.explanationBn?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it('reference exams that exist', () => {
    const examIds = new Set(EXAMS.map((exam) => exam.id));
    for (const question of STATIC_QUESTIONS) {
      for (const examId of question.examIds) expect(examIds.has(examId)).toBe(true);
    }
  });
});

describe('generators', () => {
  it('produce valid questions at the edges of their range', () => {
    const knownIds = collectKnownIds(CONTENT_PACKS);
    const errors: string[] = [];

    for (const generator of ALL_GENERATORS) {
      const difficulties = [
        generator.minDifficulty,
        Math.round((generator.minDifficulty + generator.maxDifficulty) / 2),
        generator.maxDifficulty,
      ];
      for (const difficulty of difficulties) {
        for (let seed = 0; seed < 4; seed++) {
          let question;
          try {
            question = generator.generate(contextFor(generator.id + ':v:' + seed, difficulty));
          } catch (error) {
            errors.push(generator.id + ' threw: ' + (error as Error).message);
            continue;
          }
          for (const issue of validateQuestion(question, knownIds)) {
            if (issue.severity === 'error') {
              errors.push(generator.id + ' @' + difficulty + ': ' + issue.message);
            }
          }
          if (!validateAnswer(question, question.correctAnswer).isCorrect) {
            errors.push(generator.id + ' @' + difficulty + ': own answer rejected');
          }
        }
      }
    }

    if (errors.length > 0) throw new Error(errors.slice(0, 20).join('\n'));
    expect(errors).toHaveLength(0);
  });

  it('fill a large mixed batch', () => {
    const batch = generateQuestions({ count: 40, difficulty: 5, seed: 'validate' });
    expect(batch).toHaveLength(40);
    expect(new Set(batch.map((question) => question.id)).size).toBe(40);
  });
});

describe('exams, games, challenges and formulas', () => {
  it('have exams whose sections add up', () => {
    for (const exam of EXAMS) {
      const declared = exam.sections.reduce((acc, section) => acc + section.questionCount, 0);
      expect(declared).toBe(exam.totalQuestions);
      expect(exam.durationSeconds).toBeGreaterThan(0);
      expect(exam.nameBn.trim().length).toBeGreaterThan(0);
    }
  });

  it('reference only real generators from exams and games', () => {
    const generatorIds = new Set(ALL_GENERATORS.map((generator) => generator.id));
    for (const exam of EXAMS) {
      for (const section of exam.sections) {
        for (const id of section.generatorIds) expect(generatorIds.has(id)).toBe(true);
      }
    }
    for (const game of GAMES) {
      expect(game.generatorIds.length).toBeGreaterThan(0);
      for (const id of game.generatorIds) expect(generatorIds.has(id)).toBe(true);
    }
    for (const lesson of LESSONS) {
      for (const id of lesson.practiceGeneratorIds) expect(generatorIds.has(id)).toBe(true);
    }
  });

  it('has ten games with unique kinds', () => {
    expect(GAMES).toHaveLength(10);
    expect(new Set(GAMES.map((game) => game.kind)).size).toBe(10);
  });

  it('has challenges with valid topics and ramps', () => {
    for (const challenge of CHALLENGES) {
      if (challenge.topicId) expect(topicExists(challenge.topicId)).toBe(true);
      expect(challenge.difficultyStart).toBeLessThanOrEqual(challenge.difficultyEnd);
      expect(challenge.nameBn.trim().length).toBeGreaterThan(0);
    }
    expect(new Set(CHALLENGES.map((challenge) => challenge.id)).size).toBe(CHALLENGES.length);
  });

  it('has formulas with variables, examples and Bangla text', () => {
    expect(FORMULAS.length).toBeGreaterThanOrEqual(40);
    const ids = new Set(FORMULAS.map((formula) => formula.id));
    for (const formula of FORMULAS) {
      expect(formula.expression.trim().length).toBeGreaterThan(0);
      expect(formula.nameBn.trim().length).toBeGreaterThan(0);
      expect(formula.meaningBn.trim().length).toBeGreaterThan(0);
      expect(formula.exampleBn.trim().length).toBeGreaterThan(0);
      expect(formula.commonMistakes.length).toBeGreaterThan(0);
      for (const related of formula.relatedFormulaIds) expect(ids.has(related)).toBe(true);
    }
  });

  it('has achievements with unique codes and rewards', () => {
    const codes = ACHIEVEMENTS.map((achievement) => achievement.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.threshold).toBeGreaterThan(0);
      expect(achievement.xpReward).toBeGreaterThan(0);
      expect(achievement.nameBn.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('app configuration', () => {
  it('agrees with the migrations that actually exist', () => {
    expect(schemaVersionsAgree()).toBe(true);
    expect(APP_CONFIG.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
  });

  it('ships with every future feature switched off', () => {
    for (const [name, enabled] of Object.entries(APP_CONFIG.features)) {
      expect(enabled).toBe(false);
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
