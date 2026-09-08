import { CURRENT_CONTENT_VERSION } from '../../domain/models/common';
import type { Curriculum, Skill, Subject, Topic } from '../../domain/models';
import { TAXONOMY_SKILLS, TAXONOMY_TOPICS } from '../../domain/taxonomy';

export const CURRICULUM_ID = 'curriculum.bangladesh';
export const SUBJECT_ID = 'subject.mathematics';

/**
 * The curriculum is intentionally one dimension among several: the same topic
 * tree is shared by every curriculum, and exam/level/difficulty are separate
 * attributes (spec §11).
 */
export const CURRICULUMS: Curriculum[] = [
  {
    id: CURRICULUM_ID,
    code: 'bangladesh',
    name: 'Bangladesh',
    nameBn: 'বাংলাদেশ',
    description: 'National curriculum plus competitive exam syllabuses.',
    descriptionBn: 'জাতীয় শিক্ষাক্রম ও প্রতিযোগিতামূলক পরীক্ষার সিলেবাস।',
    contentVersion: CURRENT_CONTENT_VERSION,
  },
  {
    id: 'curriculum.international',
    code: 'international',
    name: 'International',
    nameBn: 'আন্তর্জাতিক',
    description: 'Level-based mathematics independent of any single board.',
    descriptionBn: 'কোনো নির্দিষ্ট বোর্ড নির্ভর নয়, স্তরভিত্তিক গণিত।',
    contentVersion: CURRENT_CONTENT_VERSION,
  },
];

export const SUBJECTS: Subject[] = [
  {
    id: SUBJECT_ID,
    curriculumId: CURRICULUM_ID,
    name: 'Mathematics',
    nameBn: 'গণিত',
    slug: 'mathematics',
    orderIndex: 0,
    contentVersion: CURRENT_CONTENT_VERSION,
  },
];

/** Builds the persisted topic rows from the taxonomy source of truth. */
export function buildTopics(): Topic[] {
  return TAXONOMY_TOPICS.map((t, index) => ({
    id: t.id,
    subjectId: SUBJECT_ID,
    parentId: t.parentId,
    name: t.name,
    nameBn: t.nameBn,
    slug: t.id,
    level: t.level,
    baseDifficulty: t.baseDifficulty,
    orderIndex: index,
    emoji: t.emoji,
    colorKey: t.colorKey,
    description: t.description,
    descriptionBn: t.descriptionBn,
    prerequisiteTopicIds: t.prerequisiteTopicIds,
    contentVersion: CURRENT_CONTENT_VERSION,
  }));
}

export function buildSkills(): Skill[] {
  return TAXONOMY_SKILLS.map((s, index) => ({
    id: s.id,
    topicId: s.topicId,
    name: s.name,
    nameBn: s.nameBn,
    slug: s.id.replace('skill.', ''),
    description: undefined,
    descriptionBn: undefined,
    orderIndex: index,
    contentVersion: CURRENT_CONTENT_VERSION,
  }));
}
