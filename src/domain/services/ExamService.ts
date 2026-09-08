import { generateQuestions } from '../../core/question-engine/registry';
import { validateAnswer } from '../../core/question-engine/answerValidator';
import { createRng } from '../../core/utils/random';
import { uuid } from '../../core/utils/id';
import { examReadiness } from '../../core/adaptive-learning/masteryEngine';
import { newSyncMeta } from '../models';
import type {
  Exam,
  ExamAttempt,
  ExamResult,
  ExamRuntimeQuestion,
  ExamSessionSnapshot,
  ID,
  Question,
} from '../models';
import type { RepositoryRegistry } from '../repositories';
import { offlinePercentile, scoreExam } from '../rules/scoring';

export interface StartExamOptions {
  /** Restrict to previous-year questions when a year is chosen (spec §24). */
  year?: number;
  seed?: string | number;
  /** Adaptive difficulty for the "Quick 10" style blueprint. */
  adaptiveDifficulty?: number;
}

export interface ExamListEntry {
  exam: Exam;
  attempts: number;
  bestScore: number;
  lastScore?: number;
  readiness: number;
}

/**
 * The generic Exam Engine (spec §25). It reads a blueprint and fills it from
 * the static bank first, then from generators, so a new exam is pure content.
 */
export class ExamService {
  constructor(private readonly repos: RepositoryRegistry) {}

  async listExams(): Promise<ExamListEntry[]> {
    const [exams, topicProgress] = await Promise.all([
      this.repos.exams.getExams(),
      this.repos.progress.getTopicProgress(),
    ]);

    const out: ExamListEntry[] = [];
    for (const exam of exams) {
      const attempts = await this.repos.exams.getExamAttempts(exam.id, { limit: 100 });
      const scores = attempts.map((a) => a.score);
      const topicIds = Array.from(new Set(exam.sections.flatMap((s) => s.topicIds)));
      out.push({
        exam,
        attempts: attempts.length,
        bestScore: scores.length ? Math.max(...scores) : 0,
        lastScore: attempts[0]?.score,
        readiness: examReadiness(topicIds, topicProgress),
      });
    }
    return out;
  }

  /** Builds a paper from the blueprint. */
  async startExam(examId: ID, options: StartExamOptions = {}): Promise<ExamSessionSnapshot | null> {
    const exam = await this.repos.exams.getExamById(examId);
    if (!exam) return null;

    const seed = options.seed ?? Date.now();
    const rng = createRng(String(seed) + ':' + examId);
    const runtime: ExamRuntimeQuestion[] = [];
    const usedIds = new Set<ID>();

    for (const section of exam.sections) {
      const needed = section.questionCount;

      // 1. Static bank, honouring the year filter for previous-question mode.
      const staticPool = await this.repos.questions.getRandomQuestions({
        examIds: [exam.id],
        topicIds: section.topicIds.length ? section.topicIds : undefined,
        difficultyMin: section.difficultyMin,
        difficultyMax: section.difficultyMax,
        years: options.year ? [options.year] : undefined,
        excludeQuestionIds: Array.from(usedIds),
        limit: needed,
        seed: String(seed) + ':' + section.id,
      });

      const chosen: Question[] = [];
      for (const question of staticPool) {
        if (chosen.length >= needed) break;
        if (usedIds.has(question.id)) continue;
        chosen.push(question);
        usedIds.add(question.id);
      }

      // 2. Generators fill whatever the bank could not supply.
      if (chosen.length < needed) {
        try {
          const generated = generateQuestions({
            count: needed - chosen.length,
            difficulty:
              options.adaptiveDifficulty ??
              Math.round((section.difficultyMin + section.difficultyMax) / 2),
            topicIds: section.topicIds.length ? section.topicIds : undefined,
            skillIds: section.skillIds.length ? section.skillIds : undefined,
            examIds: section.generatorIds.length === 0 ? [exam.id] : undefined,
            generatorIds: section.generatorIds.length ? section.generatorIds : undefined,
            difficultyRamp: { from: section.difficultyMin, to: section.difficultyMax },
            seed: String(seed) + ':gen:' + section.id,
            excludeIds: Array.from(usedIds),
          });
          for (const question of generated) {
            if (chosen.length >= needed) break;
            if (usedIds.has(question.id)) continue;
            chosen.push(question);
            usedIds.add(question.id);
          }
        } catch {
          // A section that cannot be filled is simply shorter; the paper still runs.
        }
      }

      for (const question of chosen) {
        runtime.push({
          question: exam.shuffleOptions ? shuffleOptions(question, rng) : question,
          sectionId: section.id,
          index: 0,
          state: 'unseen',
          timeSpentMs: 0,
        });
      }
    }

    const ordered = exam.shuffleQuestions ? rng.shuffle(runtime) : runtime;
    ordered.forEach((item, index) => {
      item.index = index;
    });

    await this.repos.questions.upsertQuestions(
      ordered.map((r) => r.question).filter((q) => q.source === 'generated'),
    );

    return {
      examId: exam.id,
      attemptId: uuid(),
      startedAt: Date.now(),
      durationSeconds: exam.durationSeconds,
      questions: ordered,
      currentIndex: 0,
    };
  }

  /** Scores the paper, saves the attempt and returns the analysis. */
  async submitExam(snapshot: ExamSessionSnapshot, now = Date.now()): Promise<ExamResult | null> {
    const exam = await this.repos.exams.getExamById(snapshot.examId);
    if (!exam) return null;

    const topics = await this.repos.topics.getTopics();
    const topicNames: Record<ID, string> = {};
    for (const topic of topics) topicNames[topic.id] = topic.name;

    const result = scoreExam({
      exam,
      attemptId: snapshot.attemptId,
      questions: snapshot.questions,
      topicNames,
      isCorrect: (runtime) =>
        validateAnswer(runtime.question, runtime.givenAnswer ?? '').isCorrect,
    });

    const previous = await this.repos.exams.getExamAttempts(exam.id, { limit: 50 });
    result.percentile = offlinePercentile(
      result.finalScore,
      previous.map((a) => a.score),
      result.maxScore,
    );

    const attempt: ExamAttempt = {
      ...newSyncMeta(now),
      id: snapshot.attemptId,
      examId: exam.id,
      startedAt: snapshot.startedAt,
      finishedAt: now,
      score: result.finalScore,
      maxScore: result.maxScore,
      accuracy: result.accuracy,
      totalQuestions: result.totalQuestions,
      correct: result.correct,
      wrong: result.wrong,
      skipped: result.skipped,
      totalTimeMs: result.totalTimeMs,
      resultJson: JSON.stringify(result),
    };
    await this.repos.exams.saveExamAttempt(attempt);

    const profile = await this.repos.users.getProfile();
    const progress = await this.repos.progress.getProgress(profile.id);
    await this.repos.progress.updateProgress({
      ...progress,
      examsTaken: progress.examsTaken + 1,
      updatedAt: now,
      version: progress.version + 1,
      syncStatus: 'pending',
    });

    return result;
  }

  async getAttemptResult(attemptId: ID): Promise<ExamResult | null> {
    const attempt = await this.repos.exams.getExamAttemptById(attemptId);
    if (!attempt) return null;
    try {
      return JSON.parse(attempt.resultJson) as ExamResult;
    } catch {
      return null;
    }
  }

  async getHistory(examId?: ID): Promise<ExamAttempt[]> {
    return this.repos.exams.getExamAttempts(examId, { limit: 50 });
  }

  /** Weak-topic and speed analysis across every attempt at one exam (spec §24). */
  async getExamAnalysis(examId: ID): Promise<{
    attempts: number;
    averageScore: number;
    bestScore: number;
    averageAccuracy: number;
    averageTimeMs: number;
    weakTopics: { topicId: ID; topicName: string; accuracy: number }[];
    strongTopics: { topicId: ID; topicName: string; accuracy: number }[];
  }> {
    const attempts = await this.repos.exams.getExamAttempts(examId, { limit: 50 });
    if (attempts.length === 0) {
      return {
        attempts: 0,
        averageScore: 0,
        bestScore: 0,
        averageAccuracy: 0,
        averageTimeMs: 0,
        weakTopics: [],
        strongTopics: [],
      };
    }

    const totals = new Map<ID, { name: string; total: number; correct: number }>();
    for (const attempt of attempts) {
      let parsed: ExamResult | null = null;
      try {
        parsed = JSON.parse(attempt.resultJson) as ExamResult;
      } catch {
        continue;
      }
      for (const row of parsed.breakdown ?? []) {
        const bucket = totals.get(row.topicId) ?? { name: row.topicName, total: 0, correct: 0 };
        bucket.total += row.total;
        bucket.correct += row.correct;
        totals.set(row.topicId, bucket);
      }
    }

    const rows = Array.from(totals.entries()).map(([topicId, bucket]) => ({
      topicId,
      topicName: bucket.name,
      accuracy: bucket.total === 0 ? 0 : Number((bucket.correct / bucket.total).toFixed(4)),
    }));
    const sorted = rows.slice().sort((a, b) => a.accuracy - b.accuracy);

    return {
      attempts: attempts.length,
      averageScore: Number((attempts.reduce((a, b) => a + b.score, 0) / attempts.length).toFixed(2)),
      bestScore: Math.max(...attempts.map((a) => a.score)),
      averageAccuracy: Number(
        (attempts.reduce((a, b) => a + b.accuracy, 0) / attempts.length).toFixed(4),
      ),
      averageTimeMs: Math.round(
        attempts.reduce((a, b) => a + b.totalTimeMs, 0) / Math.max(1, attempts.length),
      ),
      weakTopics: sorted.slice(0, 5),
      strongTopics: sorted.slice().reverse().slice(0, 5),
    };
  }
}

function shuffleOptions(question: Question, rng: ReturnType<typeof createRng>): Question {
  if (!question.options || question.options.length < 2) return question;
  return { ...question, options: rng.shuffle(question.options) };
}
