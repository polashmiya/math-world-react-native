import { uuid } from '../../core/utils/id';
import { buildTopicTree, flattenTopicTree, newSyncMeta, topicIdsWithDescendants } from '../models';
import type { CompletedLesson, ID, Lesson, Skill, Topic, TopicNode, TopicProgress } from '../models';
import type { RepositoryRegistry } from '../repositories';
import { masteryLabel } from '../../core/adaptive-learning/masteryEngine';

export interface TopicWithProgress {
  topic: Topic;
  progress?: TopicProgress;
  mastery: number;
  attempts: number;
  /** False while a prerequisite topic is still unmastered (skill-tree gating). */
  unlocked: boolean;
  label: ReturnType<typeof masteryLabel>;
  lessonCount: number;
  completedLessonCount: number;
}

export interface SkillTreeNode extends TopicWithProgress {
  depth: number;
  children: SkillTreeNode[];
}

export interface LessonWithState {
  lesson: Lesson;
  completed: boolean;
  completedAt?: number;
  masteryScore?: number;
}

/** Learning use cases: the skill tree, topic detail and lessons (spec §31, §32). */
export class LearningService {
  constructor(private readonly repos: RepositoryRegistry) {}

  async getSkillTree(): Promise<SkillTreeNode[]> {
    const [topics, progress, lessons, completed] = await Promise.all([
      this.repos.topics.getTopics(),
      this.repos.progress.getTopicProgress(),
      this.repos.lessons.getLessons(),
      this.repos.lessons.getCompletedLessons(),
    ]);

    const byTopic = new Map(progress.map((p) => [p.topicId, p]));
    const lessonCounts = new Map<ID, number>();
    for (const lesson of lessons) {
      lessonCounts.set(lesson.topicId, (lessonCounts.get(lesson.topicId) ?? 0) + 1);
    }
    const completedByTopic = new Map<ID, number>();
    for (const done of completed) {
      completedByTopic.set(done.topicId, (completedByTopic.get(done.topicId) ?? 0) + 1);
    }

    const decorate = (node: TopicNode, depth: number): SkillTreeNode => {
      const entry = byTopic.get(node.id);
      const mastery = entry?.mastery ?? 0;
      return {
        topic: node,
        progress: entry,
        mastery,
        attempts: entry?.attempts ?? 0,
        unlocked: node.prerequisiteTopicIds.every((id) => (byTopic.get(id)?.mastery ?? 0) >= 0.4),
        label: masteryLabel(mastery, entry?.attempts ?? 0),
        lessonCount: lessonCounts.get(node.id) ?? 0,
        completedLessonCount: completedByTopic.get(node.id) ?? 0,
        depth,
        children: node.children.map((child) => decorate(child, depth + 1)),
      };
    };

    return buildTopicTree(topics).map((root) => decorate(root, 0));
  }

  /** Flat list for a FlatList-friendly, indentation-aware render. */
  async getFlatSkillTree(): Promise<SkillTreeNode[]> {
    const tree = await this.getSkillTree();
    const out: SkillTreeNode[] = [];
    const walk = (nodes: SkillTreeNode[]): void => {
      for (const node of nodes) {
        out.push(node);
        walk(node.children);
      }
    };
    walk(tree);
    return out;
  }

  async getTopicDetail(topicId: ID): Promise<{
    topic: Topic | null;
    skills: Skill[];
    lessons: LessonWithState[];
    progress?: TopicProgress;
    childTopicIds: ID[];
    practiceTopicIds: ID[];
  }> {
    const [topic, skills, lessons, completed, progress, allTopics] = await Promise.all([
      this.repos.topics.getTopicById(topicId),
      this.repos.topics.getSkills(topicId),
      this.repos.lessons.getLessons(topicId),
      this.repos.lessons.getCompletedLessons(),
      this.repos.progress.getTopicProgress(topicId),
      this.repos.topics.getTopics(),
    ]);

    const completedById = new Map(completed.map((c) => [c.lessonId, c]));
    return {
      topic,
      skills,
      lessons: lessons.map((lesson) => {
        const done = completedById.get(lesson.id);
        return {
          lesson,
          completed: !!done,
          completedAt: done?.completedAt,
          masteryScore: done?.masteryScore,
        };
      }),
      progress: progress[0],
      childTopicIds: allTopics.filter((t) => t.parentId === topicId).map((t) => t.id),
      // Practice draws from the topic and everything under it.
      practiceTopicIds: topicIdsWithDescendants(allTopics, topicId),
    };
  }

  async getLesson(lessonId: ID): Promise<LessonWithState | null> {
    const lesson = await this.repos.lessons.getLessonById(lessonId);
    if (!lesson) return null;
    const completed = await this.repos.lessons.getCompletedLessons();
    const done = completed.find((c) => c.lessonId === lessonId);
    return { lesson, completed: !!done, completedAt: done?.completedAt, masteryScore: done?.masteryScore };
  }

  async completeLesson(lesson: Lesson, masteryScore: number, now = Date.now()): Promise<CompletedLesson> {
    const record: CompletedLesson = {
      ...newSyncMeta(now),
      id: uuid(),
      lessonId: lesson.id,
      topicId: lesson.topicId,
      completedAt: now,
      masteryScore: Number(Math.max(0, Math.min(1, masteryScore)).toFixed(4)),
    };
    await this.repos.lessons.markLessonCompleted(record);

    const profile = await this.repos.users.getProfile();
    const progress = await this.repos.progress.getProgress(profile.id);
    const completed = await this.repos.lessons.getCompletedLessons();
    await this.repos.progress.updateProgress({
      ...progress,
      lessonsCompleted: completed.length,
      updatedAt: now,
      syncStatus: 'pending',
      version: progress.version + 1,
    });
    return record;
  }

  /** "Continue learning": the most recent unfinished lesson, else the first one. */
  async getContinueTarget(): Promise<{ topic: Topic; lesson?: Lesson } | null> {
    const [progress, lessons, completed, topics] = await Promise.all([
      this.repos.progress.getTopicProgress(),
      this.repos.lessons.getLessons(),
      this.repos.lessons.getCompletedLessons(),
      this.repos.topics.getTopics(),
    ]);

    const completedIds = new Set(completed.map((c) => c.lessonId));
    const recent = progress
      .filter((p) => p.lastPracticedAt)
      .sort((a, b) => (b.lastPracticedAt ?? 0) - (a.lastPracticedAt ?? 0));

    for (const entry of recent) {
      const topic = topics.find((t) => t.id === entry.topicId);
      if (!topic) continue;
      const lesson = lessons.find((l) => l.topicId === topic.id && !completedIds.has(l.id));
      if (lesson) return { topic, lesson };
    }

    const firstUnfinished = lessons.find((l) => !completedIds.has(l.id));
    if (firstUnfinished) {
      const topic = topics.find((t) => t.id === firstUnfinished.topicId);
      if (topic) return { topic, lesson: firstUnfinished };
    }

    const firstTopic = topics.find((t) => t.parentId !== null);
    return firstTopic ? { topic: firstTopic } : null;
  }

  /** Topic ids ordered for the "Learn" tab: roots first, then depth order. */
  async getOrderedTopicIds(): Promise<ID[]> {
    const topics = await this.repos.topics.getTopics();
    return flattenTopicTree(buildTopicTree(topics)).map((entry) => entry.topic.id);
  }
}
