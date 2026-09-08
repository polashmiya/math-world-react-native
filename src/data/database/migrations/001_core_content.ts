import type { Migration } from './index';

/**
 * Content schema. Content is kept strictly separate from user data (spec §7):
 * re-seeding a content pack must never touch a row in a user table.
 */
export const migration001: Migration = {
  version: 1,
  name: 'core_content',
  statements: [
    `CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS content_packs (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      schema_version INTEGER NOT NULL,
      name TEXT NOT NULL,
      name_bn TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      description_bn TEXT NOT NULL DEFAULT '',
      emoji TEXT NOT NULL DEFAULT '📦',
      core INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      checksum TEXT NOT NULL DEFAULT '',
      seeded_at INTEGER NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS curriculums (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      name_bn TEXT NOT NULL,
      description TEXT,
      description_bn TEXT,
      content_version INTEGER NOT NULL DEFAULT 1
    )`,

    `CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      curriculum_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_bn TEXT NOT NULL,
      slug TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      content_version INTEGER NOT NULL DEFAULT 1
    )`,

    `CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      name_bn TEXT NOT NULL,
      slug TEXT NOT NULL,
      level TEXT NOT NULL,
      base_difficulty INTEGER NOT NULL DEFAULT 1,
      order_index INTEGER NOT NULL DEFAULT 0,
      emoji TEXT NOT NULL DEFAULT '📘',
      color_key TEXT NOT NULL DEFAULT 'blue',
      description TEXT,
      description_bn TEXT,
      prerequisite_ids TEXT NOT NULL DEFAULT '[]',
      content_version INTEGER NOT NULL DEFAULT 1,
      pack_id TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics (parent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_topics_level ON topics (level)`,
    `CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics (subject_id, order_index)`,

    `CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_bn TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      description_bn TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      content_version INTEGER NOT NULL DEFAULT 1,
      pack_id TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_skills_topic ON skills (topic_id)`,

    `CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      skill_ids TEXT NOT NULL DEFAULT '[]',
      title TEXT NOT NULL,
      title_bn TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      summary_bn TEXT NOT NULL DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0,
      estimated_minutes INTEGER NOT NULL DEFAULT 10,
      sections_json TEXT NOT NULL DEFAULT '[]',
      practice_generator_ids TEXT NOT NULL DEFAULT '[]',
      content_version INTEGER NOT NULL DEFAULT 1,
      pack_id TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_lessons_topic ON lessons (topic_id, order_index)`,

    `CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      subtopic_id TEXT,
      difficulty INTEGER NOT NULL,
      question_type TEXT NOT NULL,
      brain_category TEXT,
      prompt TEXT NOT NULL,
      prompt_bn TEXT,
      options_json TEXT,
      correct_answer TEXT NOT NULL,
      accepted_answers TEXT,
      tolerance REAL,
      solution_json TEXT NOT NULL DEFAULT '[]',
      explanation TEXT,
      explanation_bn TEXT,
      hints TEXT,
      hints_bn TEXT,
      estimated_time_seconds INTEGER,
      points INTEGER,
      source TEXT NOT NULL DEFAULT 'static',
      generator_id TEXT,
      generator_params TEXT,
      year INTEGER,
      curriculum_ids TEXT NOT NULL DEFAULT '[]',
      skill_ids TEXT NOT NULL DEFAULT '[]',
      exam_ids TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      question_version INTEGER NOT NULL DEFAULT 1,
      content_version INTEGER NOT NULL DEFAULT 1,
      pack_id TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_questions_topic_difficulty ON questions (topic_id, difficulty)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions (difficulty)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_type ON questions (question_type)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_brain ON questions (brain_category)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_year ON questions (year)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_source ON questions (source)`,

    // Join tables keep tag/skill/exam lookups indexable on a very large bank.
    `CREATE TABLE IF NOT EXISTS question_skills (
      question_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      PRIMARY KEY (question_id, skill_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_question_skills_skill ON question_skills (skill_id)`,

    `CREATE TABLE IF NOT EXISTS question_exams (
      question_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
      PRIMARY KEY (question_id, exam_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_question_exams_exam ON question_exams (exam_id)`,

    `CREATE TABLE IF NOT EXISTS question_tags (
      question_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (question_id, tag)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_question_tags_tag ON question_tags (tag)`,

    `CREATE TABLE IF NOT EXISTS formulas (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      name_bn TEXT NOT NULL,
      expression TEXT NOT NULL,
      meaning TEXT NOT NULL DEFAULT '',
      meaning_bn TEXT NOT NULL DEFAULT '',
      variables_json TEXT NOT NULL DEFAULT '[]',
      example TEXT NOT NULL DEFAULT '',
      example_bn TEXT NOT NULL DEFAULT '',
      related_ids TEXT NOT NULL DEFAULT '[]',
      common_mistakes TEXT NOT NULL DEFAULT '[]',
      common_mistakes_bn TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      content_version INTEGER NOT NULL DEFAULT 1,
      pack_id TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_formulas_category ON formulas (category)`,
  ],
};
