import { descendantTopicIds } from '../../../domain/taxonomy';
import { CURRENT_SCHEMA_VERSION } from '../../../domain/models/common';
import type { ContentPack, ContentPackMeta } from '../../../domain/models';
import { ACHIEVEMENTS } from '../achievements';
import { EXAMS } from '../exams';
import { FORMULAS } from '../formulas';
import { CHALLENGES, GAMES } from '../games';
import { LESSONS } from '../lessons';
import { STATIC_QUESTIONS } from '../questions';
import { buildSkills, buildTopics, CURRICULUMS, SUBJECTS } from '../taxonomyContent';

/**
 * Content packs (spec §10). Version 1 ships them all bundled; the shape is
 * already what a downloadable pack will use, so no backend is required today
 * and none is assumed tomorrow.
 */
const TOPICS = buildTopics();
const SKILLS = buildSkills();

function topicsIn(rootIds: string[]): string[] {
  return Array.from(new Set(rootIds.flatMap((id) => descendantTopicIds(id))));
}

function pack(
  meta: ContentPackMeta,
  rootTopicIds: string[],
  options: {
    includeCurriculums?: boolean;
    formulaCategories?: string[];
    examIds?: string[];
    includeGames?: boolean;
    includeChallenges?: boolean;
  } = {},
): ContentPack {
  const topicIds = new Set(topicsIn(rootTopicIds));
  const topics = TOPICS.filter((t) => topicIds.has(t.id));
  const skills = SKILLS.filter((s) => topicIds.has(s.topicId));
  const lessons = LESSONS.filter((l) => topicIds.has(l.topicId));
  const questions = STATIC_QUESTIONS.filter((q) => topicIds.has(q.topicId));
  const formulas = options.formulaCategories
    ? FORMULAS.filter((f) => options.formulaCategories!.includes(f.category))
    : [];
  const exams = options.examIds ? EXAMS.filter((e) => options.examIds!.includes(e.id)) : [];
  const challenges = options.includeChallenges
    ? CHALLENGES.filter((c) => !c.topicId || topicIds.has(c.topicId))
    : [];

  return {
    meta,
    curriculums: options.includeCurriculums ? CURRICULUMS : undefined,
    subjects: options.includeCurriculums ? SUBJECTS : undefined,
    topics,
    skills,
    lessons,
    questions,
    formulas,
    exams,
    games: options.includeGames ? GAMES : undefined,
    challenges,
  };
}

const CORE: ContentPack = pack(
  {
    id: 'pack.core',
    name: 'Core Pack',
    nameBn: 'কোর প্যাক',
    description: 'The topic tree, everyday mathematics, games and the formula basics.',
    descriptionBn: 'বিষয়বৃক্ষ, দৈনন্দিন গণিত, গেম ও মৌলিক সূত্র।',
    emoji: '🧱',
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    levels: ['foundation', 'primary'],
    requires: [],
    core: true,
    sizeHintKb: 320,
  },
  ['numbers', 'real-life', 'logic'],
  {
    includeCurriculums: true,
    formulaCategories: ['arithmetic', 'financial_math', 'statistics'],
    examIds: ['exam.quick-10'],
    includeGames: true,
    includeChallenges: true,
  },
);

// The core pack owns the root topics that other packs hang from.
CORE.topics = TOPICS.filter((t) => t.parentId === null || topicsIn(['numbers', 'real-life', 'logic']).includes(t.id));

const FOUNDATION: ContentPack = pack(
  {
    id: 'pack.foundation',
    name: 'Foundation Pack',
    nameBn: 'ভিত্তি প্যাক',
    description: 'Number sense, mental math and estimation for a confident start.',
    descriptionBn: 'সংখ্যাজ্ঞান, মানসিক গণিত ও আন্দাজ — আত্মবিশ্বাসী শুরুর জন্য।',
    emoji: '🌱',
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    levels: ['foundation', 'primary'],
    requires: ['pack.core'],
    core: false,
    sizeHintKb: 120,
  },
  ['arithmetic', 'fractions', 'decimals', 'mental-math', 'estimation', 'measurement'],
  { formulaCategories: ['arithmetic'] },
);

const SCHOOL: ContentPack = pack(
  {
    id: 'pack.school',
    name: 'School Math Pack',
    nameBn: 'স্কুল গণিত প্যাক',
    description: 'Secondary algebra, geometry, statistics and probability.',
    descriptionBn: 'মাধ্যমিক বীজগণিত, জ্যামিতি, পরিসংখ্যান ও সম্ভাব্যতা।',
    emoji: '🎒',
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    levels: ['middle', 'secondary'],
    requires: ['pack.core'],
    core: false,
    sizeHintKb: 260,
  },
  ['algebra', 'geometry', 'probability', 'statistics'],
  {
    formulaCategories: ['algebra', 'geometry', 'mensuration', 'statistics', 'probability'],
    examIds: ['exam.ssc-math'],
    includeChallenges: true,
  },
);

const HIGHER: ContentPack = pack(
  {
    id: 'pack.higher-math',
    name: 'Higher Math Pack',
    nameBn: 'উচ্চতর গণিত প্যাক',
    description: 'Higher secondary calculus, trigonometry, logarithms and matrices.',
    descriptionBn: 'উচ্চ মাধ্যমিক ক্যালকুলাস, ত্রিকোণমিতি, লগারিদম ও ম্যাট্রিক্স।',
    emoji: '📐',
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    levels: ['higher_secondary'],
    requires: ['pack.school'],
    core: false,
    sizeHintKb: 240,
  },
  ['analysis', 'trigonometry', 'coordinate-geometry', 'indices-logarithms', 'linear-algebra', 'combinatorics'],
  {
    formulaCategories: ['trigonometry', 'coordinate_geometry', 'calculus', 'linear_algebra', 'discrete_math'],
    examIds: ['exam.hsc-math'],
    includeChallenges: true,
  },
);

const COMPETITIVE: ContentPack = pack(
  {
    id: 'pack.competitive',
    name: 'Competitive Exam Pack',
    nameBn: 'প্রতিযোগিতামূলক পরীক্ষা প্যাক',
    description: 'BCS, bank, NTRCA and government recruitment mathematics with previous questions.',
    descriptionBn: 'বিসিএস, ব্যাংক, এনটিআরসিএ ও সরকারি নিয়োগ গণিত — বিগত প্রশ্নসহ।',
    emoji: '🏛️',
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    levels: ['secondary', 'higher_secondary', 'undergraduate'],
    requires: ['pack.school'],
    core: false,
    sizeHintKb: 300,
  },
  ['numbers', 'algebra', 'geometry', 'statistics', 'probability', 'logic', 'real-life'],
  {
    formulaCategories: ['arithmetic', 'financial_math', 'statistics'],
    examIds: [
      'exam.bcs-math',
      'exam.bank-math',
      'exam.ntrca-math',
      'exam.primary-teacher',
      'exam.railway-police',
    ],
  },
);

const ADMISSION: ContentPack = pack(
  {
    id: 'pack.admission',
    name: 'Admission Pack',
    nameBn: 'ভর্তি পরীক্ষা প্যাক',
    description: 'University admission mathematics at speed.',
    descriptionBn: 'দ্রুততার সাথে বিশ্ববিদ্যালয় ভর্তি গণিত।',
    emoji: '🎓',
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    levels: ['higher_secondary'],
    requires: ['pack.higher-math'],
    core: false,
    sizeHintKb: 180,
  },
  ['algebra', 'analysis', 'geometry', 'combinatorics'],
  { examIds: ['exam.admission-math'] },
);

const OLYMPIAD: ContentPack = pack(
  {
    id: 'pack.olympiad',
    name: 'Olympiad Pack',
    nameBn: 'অলিম্পিয়াড প্যাক',
    description: 'Number theory, combinatorics and problem solving beyond the syllabus.',
    descriptionBn: 'সিলেবাসের বাইরে সংখ্যাতত্ত্ব, বিন্যাস-সমাবেশ ও সমস্যা সমাধান।',
    emoji: '🥇',
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    levels: ['secondary', 'higher_secondary', 'advanced'],
    requires: ['pack.school'],
    core: false,
    sizeHintKb: 160,
  },
  ['number-theory', 'combinatorics', 'graph-theory', 'logic'],
  { formulaCategories: ['discrete_math'], examIds: ['exam.olympiad-math'] },
);

const UNIVERSITY: ContentPack = pack(
  {
    id: 'pack.university',
    name: 'University Math Pack',
    nameBn: 'বিশ্ববিদ্যালয় গণিত প্যাক',
    description: 'Real analysis, abstract algebra, topology and advanced number theory.',
    descriptionBn: 'বাস্তব বিশ্লেষণ, বিমূর্ত বীজগণিত, টপোলজি ও উচ্চতর সংখ্যাতত্ত্ব।',
    emoji: '🏛️',
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    levels: ['undergraduate', 'graduate', 'advanced', 'expert'],
    requires: ['pack.higher-math'],
    core: false,
    sizeHintKb: 200,
  },
  ['analysis', 'abstract-algebra', 'topology', 'advanced-number-theory', 'linear-algebra'],
  { formulaCategories: ['calculus', 'linear_algebra'] },
);

const ENGINEERING: ContentPack = pack(
  {
    id: 'pack.engineering',
    name: 'Engineering Math Pack',
    nameBn: 'ইঞ্জিনিয়ারিং গণিত প্যাক',
    description: 'Applied and engineering mathematics, including physics-related maths.',
    descriptionBn: 'প্রয়োগিক ও ইঞ্জিনিয়ারিং গণিত, পদার্থ-সংশ্লিষ্ট গণিতসহ।',
    emoji: '⚙️',
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    levels: ['undergraduate', 'graduate'],
    requires: ['pack.higher-math'],
    core: false,
    sizeHintKb: 150,
  },
  ['applied-math', 'linear-algebra', 'analysis'],
  { formulaCategories: ['physics_math', 'calculus', 'linear_algebra'] },
);

export const CONTENT_PACKS: ContentPack[] = [
  CORE,
  FOUNDATION,
  SCHOOL,
  HIGHER,
  COMPETITIVE,
  ADMISSION,
  OLYMPIAD,
  UNIVERSITY,
  ENGINEERING,
];

export const CORE_PACK_ID = CORE.meta.id;

export function packById(id: string): ContentPack | undefined {
  return CONTENT_PACKS.find((p) => p.meta.id === id);
}

/** Achievements are app-level content rather than pack content. */
export { ACHIEVEMENTS };
