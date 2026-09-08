import type { AcademicLevel, CurriculumCode } from '../../core/constants/levels';
import type { ID } from './common';

export interface Curriculum {
  id: ID;
  code: CurriculumCode;
  name: string;
  nameBn: string;
  description?: string;
  descriptionBn?: string;
  contentVersion: number;
}

export interface Subject {
  id: ID;
  curriculumId: ID;
  name: string;
  nameBn: string;
  slug: string;
  orderIndex: number;
  contentVersion: number;
}

/**
 * Topics form the skill tree (spec §31). A subtopic is simply a topic with a
 * `parentId`, which keeps the tree arbitrarily deep without extra tables.
 */
export interface Topic {
  id: ID;
  subjectId: ID;
  parentId?: ID | null;
  name: string;
  nameBn: string;
  slug: string;
  level: AcademicLevel;
  /** Suggested starting difficulty; the adaptive engine overrides this. */
  baseDifficulty: number;
  orderIndex: number;
  emoji: string;
  colorKey: TopicColorKey;
  description?: string;
  descriptionBn?: string;
  /** Topic ids that should be mastered first (skill-tree gating). */
  prerequisiteTopicIds: ID[];
  contentVersion: number;
}

export type TopicColorKey =
  | 'blue'
  | 'violet'
  | 'green'
  | 'amber'
  | 'rose'
  | 'teal'
  | 'indigo'
  | 'orange';

export interface Skill {
  id: ID;
  topicId: ID;
  name: string;
  nameBn: string;
  slug: string;
  description?: string;
  descriptionBn?: string;
  orderIndex: number;
  contentVersion: number;
}

export interface TopicNode extends Topic {
  children: TopicNode[];
}

/** Builds the topic tree from a flat list; ignores dangling parents safely. */
export function buildTopicTree(topics: readonly Topic[]): TopicNode[] {
  const nodes = new Map<ID, TopicNode>();
  for (const t of topics) nodes.set(t.id, { ...t, children: [] });

  const roots: TopicNode[] = [];
  for (const t of topics) {
    const node = nodes.get(t.id)!;
    const parent = t.parentId ? nodes.get(t.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (list: TopicNode[]): void => {
    list.sort((a, b) => a.orderIndex - b.orderIndex || a.name.localeCompare(b.name));
    for (const n of list) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

export function flattenTopicTree(nodes: readonly TopicNode[], depth = 0): { topic: TopicNode; depth: number }[] {
  const out: { topic: TopicNode; depth: number }[] = [];
  for (const n of nodes) {
    out.push({ topic: n, depth });
    out.push(...flattenTopicTree(n.children, depth + 1));
  }
  return out;
}

/** All descendant ids including the topic itself — used to widen practice pools. */
export function topicIdsWithDescendants(topics: readonly Topic[], rootId: ID): ID[] {
  const byParent = new Map<ID | null, Topic[]>();
  for (const t of topics) {
    const key = t.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(t);
    byParent.set(key, list);
  }
  const out: ID[] = [];
  const walk = (id: ID): void => {
    out.push(id);
    for (const child of byParent.get(id) ?? []) walk(child.id);
  };
  walk(rootId);
  return out;
}
