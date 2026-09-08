import { DIFFICULTY_MAX, DIFFICULTY_MIN } from '../../../core/constants/difficulty';
import { BRAIN_CATEGORIES, FORMULA_CATEGORIES } from '../../../core/constants/categories';
import { ACADEMIC_LEVELS } from '../../../core/constants/levels';
import { LESSON_SECTION_ORDER, QUESTION_TYPES, isChoiceQuestion } from '../../../domain/models';
import type { ContentPack, Question } from '../../../domain/models';
import { getGenerator } from '../../../core/question-engine/registry';

export interface ValidationIssue {
  entity: string;
  id: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationReport {
  packId: string;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  valid: boolean;
}

/**
 * Content validation (spec §51). An invalid question must never reach the
 * production database, so the seeder refuses to insert a pack with errors.
 */
export function validatePack(pack: ContentPack, knownIds?: KnownIds): ValidationReport {
  const issues: ValidationIssue[] = [];
  const ids = knownIds ?? collectKnownIds([pack]);

  const error = (entity: string, id: string, message: string): void => {
    issues.push({ entity, id, message, severity: 'error' });
  };
  const warn = (entity: string, id: string, message: string): void => {
    issues.push({ entity, id, message, severity: 'warning' });
  };

  if (!pack.meta.id) error('pack', '(unknown)', 'Pack id is required');
  if (pack.meta.version < 1) error('pack', pack.meta.id, 'Pack version must be at least 1');
  for (const level of pack.meta.levels) {
    if (!ACADEMIC_LEVELS.includes(level)) {
      error('pack', pack.meta.id, 'Unknown academic level: ' + level);
    }
  }

  // ── topics ──────────────────────────────────────────────────────────────
  const seenTopicIds = new Set<string>();
  for (const topic of pack.topics ?? []) {
    if (!topic.id) error('topic', '(missing)', 'Topic id is required');
    if (seenTopicIds.has(topic.id)) error('topic', topic.id, 'Duplicate topic id in pack');
    seenTopicIds.add(topic.id);
    if (!topic.name || !topic.nameBn) error('topic', topic.id, 'Topic needs both name and nameBn');
    if (!ACADEMIC_LEVELS.includes(topic.level)) error('topic', topic.id, 'Unknown level: ' + topic.level);
    if (topic.baseDifficulty < DIFFICULTY_MIN || topic.baseDifficulty > DIFFICULTY_MAX) {
      error('topic', topic.id, 'baseDifficulty must be between 1 and 9');
    }
    if (topic.parentId && !ids.topics.has(topic.parentId)) {
      error('topic', topic.id, 'Unknown parent topic: ' + topic.parentId);
    }
    for (const prerequisite of topic.prerequisiteTopicIds) {
      if (!ids.topics.has(prerequisite)) {
        warn('topic', topic.id, 'Unknown prerequisite topic: ' + prerequisite);
      }
    }
  }

  // ── skills ──────────────────────────────────────────────────────────────
  const seenSkillIds = new Set<string>();
  for (const skill of pack.skills ?? []) {
    if (seenSkillIds.has(skill.id)) error('skill', skill.id, 'Duplicate skill id in pack');
    seenSkillIds.add(skill.id);
    if (!skill.name || !skill.nameBn) error('skill', skill.id, 'Skill needs both name and nameBn');
    if (!ids.topics.has(skill.topicId)) error('skill', skill.id, 'Unknown topic: ' + skill.topicId);
  }

  // ── lessons ─────────────────────────────────────────────────────────────
  const seenLessonIds = new Set<string>();
  for (const lesson of pack.lessons ?? []) {
    if (seenLessonIds.has(lesson.id)) error('lesson', lesson.id, 'Duplicate lesson id in pack');
    seenLessonIds.add(lesson.id);
    if (!lesson.title || !lesson.titleBn) error('lesson', lesson.id, 'Lesson needs both title and titleBn');
    if (!ids.topics.has(lesson.topicId)) error('lesson', lesson.id, 'Unknown topic: ' + lesson.topicId);
    if (lesson.sections.length === 0) error('lesson', lesson.id, 'Lesson has no sections');
    for (const section of lesson.sections) {
      if (!LESSON_SECTION_ORDER.includes(section.kind)) {
        error('lesson', lesson.id, 'Unknown section kind: ' + section.kind);
      }
      if (!section.body || !section.bodyBn) {
        error('lesson', lesson.id, 'Section "' + section.kind + '" needs body text in both languages');
      }
    }
    if (!lesson.sections.some((s) => s.kind === 'concept')) {
      warn('lesson', lesson.id, 'Lesson has no concept section');
    }
    for (const skillId of lesson.skillIds) {
      if (!ids.skills.has(skillId)) warn('lesson', lesson.id, 'Unknown skill: ' + skillId);
    }
    for (const generatorId of lesson.practiceGeneratorIds) {
      if (!getGenerator(generatorId)) {
        error('lesson', lesson.id, 'Unknown practice generator: ' + generatorId);
      }
    }
  }

  // ── questions ───────────────────────────────────────────────────────────
  const seenQuestionIds = new Set<string>();
  for (const question of pack.questions ?? []) {
    for (const issue of validateQuestion(question, ids, seenQuestionIds)) issues.push(issue);
    seenQuestionIds.add(question.id);
  }

  // ── formulas ────────────────────────────────────────────────────────────
  const seenFormulaIds = new Set<string>();
  for (const formula of pack.formulas ?? []) {
    if (seenFormulaIds.has(formula.id)) error('formula', formula.id, 'Duplicate formula id in pack');
    seenFormulaIds.add(formula.id);
    if (!FORMULA_CATEGORIES.includes(formula.category)) {
      error('formula', formula.id, 'Unknown category: ' + formula.category);
    }
    if (!formula.expression) error('formula', formula.id, 'Formula needs an expression');
    if (!formula.nameBn || !formula.meaningBn) {
      error('formula', formula.id, 'Formula needs Bangla name and meaning');
    }
    for (const related of formula.relatedFormulaIds) {
      if (!ids.formulas.has(related)) warn('formula', formula.id, 'Unknown related formula: ' + related);
    }
  }

  // ── exams ───────────────────────────────────────────────────────────────
  for (const exam of pack.exams ?? []) {
    if (exam.sections.length === 0) error('exam', exam.id, 'Exam has no sections');
    const declared = exam.sections.reduce((acc, s) => acc + s.questionCount, 0);
    if (declared !== exam.totalQuestions) {
      error(
        'exam',
        exam.id,
        'totalQuestions (' + exam.totalQuestions + ') does not match the sections (' + declared + ')',
      );
    }
    if (exam.durationSeconds <= 0) error('exam', exam.id, 'Exam duration must be positive');
    if (exam.negativeMarkPerWrong < 0) error('exam', exam.id, 'Negative marking cannot be below zero');
    for (const section of exam.sections) {
      if (section.questionCount <= 0) error('exam', exam.id, 'Section "' + section.id + '" needs questions');
      if (section.difficultyMin > section.difficultyMax) {
        error('exam', exam.id, 'Section "' + section.id + '" has an inverted difficulty range');
      }
      for (const topicId of section.topicIds) {
        if (!ids.topics.has(topicId)) {
          error('exam', exam.id, 'Section "' + section.id + '" references unknown topic ' + topicId);
        }
      }
      for (const generatorId of section.generatorIds) {
        if (!getGenerator(generatorId)) {
          error('exam', exam.id, 'Section "' + section.id + '" references unknown generator ' + generatorId);
        }
      }
      // A section must be fillable from somewhere.
      if (section.topicIds.length === 0 && section.generatorIds.length === 0 && exam.id !== 'exam.quick-10') {
        warn('exam', exam.id, 'Section "' + section.id + '" has neither topics nor generators');
      }
    }
  }

  // ── games and challenges ────────────────────────────────────────────────
  for (const game of pack.games ?? []) {
    if (game.generatorIds.length === 0) error('game', game.id, 'Game has no generators');
    for (const generatorId of game.generatorIds) {
      if (!getGenerator(generatorId)) error('game', game.id, 'Unknown generator: ' + generatorId);
    }
    if (!BRAIN_CATEGORIES.includes(game.brainCategory)) {
      error('game', game.id, 'Unknown brain category: ' + game.brainCategory);
    }
    if (game.startDifficulty < DIFFICULTY_MIN || game.startDifficulty > DIFFICULTY_MAX) {
      error('game', game.id, 'startDifficulty must be between 1 and 9');
    }
  }

  for (const challenge of pack.challenges ?? []) {
    if (challenge.topicId && !ids.topics.has(challenge.topicId)) {
      error('challenge', challenge.id, 'Unknown topic: ' + challenge.topicId);
    }
    if (challenge.difficultyStart > challenge.difficultyEnd) {
      error('challenge', challenge.id, 'Difficulty ramp goes downwards');
    }
    if (challenge.kind === 'boss' && challenge.questionCount < 5) {
      warn('challenge', challenge.id, 'Boss battles usually have at least 5 questions');
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  return {
    packId: pack.meta.id,
    issues,
    errorCount,
    warningCount: issues.length - errorCount,
    valid: errorCount === 0,
  };
}

export interface KnownIds {
  topics: Set<string>;
  skills: Set<string>;
  formulas: Set<string>;
  exams: Set<string>;
  questions: Set<string>;
}

/** Cross-pack id index so a pack may reference a topic from a required pack. */
export function collectKnownIds(packs: readonly ContentPack[]): KnownIds {
  const ids: KnownIds = {
    topics: new Set(),
    skills: new Set(),
    formulas: new Set(),
    exams: new Set(),
    questions: new Set(),
  };
  for (const pack of packs) {
    for (const t of pack.topics ?? []) ids.topics.add(t.id);
    for (const s of pack.skills ?? []) ids.skills.add(s.id);
    for (const f of pack.formulas ?? []) ids.formulas.add(f.id);
    for (const e of pack.exams ?? []) ids.exams.add(e.id);
    for (const q of pack.questions ?? []) ids.questions.add(q.id);
  }
  return ids;
}

/** Validates a single question — also used for generated questions at runtime. */
export function validateQuestion(
  question: Question,
  ids: KnownIds,
  seenIds: ReadonlySet<string> = new Set(),
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (message: string): void => {
    issues.push({ entity: 'question', id: question.id || '(missing)', message, severity: 'error' });
  };
  const warn = (message: string): void => {
    issues.push({ entity: 'question', id: question.id || '(missing)', message, severity: 'warning' });
  };

  if (!question.id) error('Question id is required');
  if (seenIds.has(question.id)) error('Duplicate question id');
  if (!question.prompt?.trim()) error('Question prompt is empty');
  if (!question.promptBn?.trim()) warn('Question has no Bangla prompt');
  if (!QUESTION_TYPES.includes(question.questionType)) {
    error('Unknown question type: ' + question.questionType);
  }
  if (question.difficulty < DIFFICULTY_MIN || question.difficulty > DIFFICULTY_MAX) {
    error('Difficulty must be between 1 and 9');
  }
  if (!ids.topics.has(question.topicId)) error('Unknown topic: ' + question.topicId);
  if (question.subtopicId && !ids.topics.has(question.subtopicId)) {
    error('Unknown subtopic: ' + question.subtopicId);
  }
  for (const skillId of question.skillIds) {
    if (!ids.skills.has(skillId)) warn('Unknown skill: ' + skillId);
  }
  if (question.brainCategory && !BRAIN_CATEGORIES.includes(question.brainCategory)) {
    error('Unknown brain category: ' + question.brainCategory);
  }
  if (!question.correctAnswer?.toString().trim()) error('Question has no correct answer');
  if (question.solutionSteps.length === 0) error('Question has no solution steps');
  question.solutionSteps.forEach((step, index) => {
    if (step.order !== index + 1) error('Solution steps must be ordered from 1');
    if (!step.detail?.trim()) error('Solution step ' + (index + 1) + ' is empty');
  });

  if (isChoiceQuestion(question) || question.questionType === 'true_false') {
    const options = question.options ?? [];
    if (options.length < 2) error('A choice question needs at least two options');
    const optionIds = new Set(options.map((o) => o.id));
    if (optionIds.size !== options.length) error('Option ids must be unique');
    const texts = new Set(options.map((o) => o.text));
    if (texts.size !== options.length) error('Option texts must be unique');
    if (!optionIds.has(question.correctAnswer)) {
      error('correctAnswer "' + question.correctAnswer + '" is not one of the option ids');
    }
  }

  if (question.tolerance !== undefined && question.tolerance < 0) {
    error('Tolerance cannot be negative');
  }
  if (question.source === 'generated' && !question.generatorId) {
    warn('Generated question has no generatorId');
  }
  return issues;
}

export function formatReport(report: ValidationReport): string {
  if (report.valid && report.warningCount === 0) {
    return report.packId + ': ok';
  }
  const lines = [
    report.packId + ': ' + report.errorCount + ' error(s), ' + report.warningCount + ' warning(s)',
  ];
  for (const issue of report.issues) {
    lines.push('  [' + issue.severity + '] ' + issue.entity + ' ' + issue.id + ' — ' + issue.message);
  }
  return lines.join('\n');
}
