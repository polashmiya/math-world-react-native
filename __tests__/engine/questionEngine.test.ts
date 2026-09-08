import { ALL_GENERATORS, candidateGenerators, generateQuestions, getGenerator, regenerate } from '../../src/core/question-engine/registry';
import { contextFor, defineGenerator } from '../../src/core/question-engine/types';
import { normalizeAnswer, scoreEstimate, validateAnswer } from '../../src/core/question-engine/answerValidator';
import { nextDifficulty, speedScore, startingDifficulty } from '../../src/core/question-engine/difficultyEngine';
import { RuleBasedMathTutor, renderSolution } from '../../src/core/question-engine/solutionEngine';
import { computeMastery, examReadiness, masteryLabel, overallMastery, pushOutcome } from '../../src/core/adaptive-learning/masteryEngine';
import { scheduleReview, prioritiseQueue, REVIEW_INTERVALS_DAYS } from '../../src/core/spaced-repetition/scheduler';
import { compositeScore, emptyDimensions, updateDimensions, thinkingBand } from '../../src/core/adaptive-learning/thinkingScore';
import { fillPlan, planAdaptiveSet, weakTopicIds } from '../../src/core/adaptive-learning/adaptiveSelector';
import { isChoiceQuestion, type Question, type QuestionAttempt, type ReviewItem, type TopicProgress, type SkillProgress, type Mistake } from '../../src/domain/models';
import { newSyncMeta } from '../../src/domain/models/common';
import { skillExists, topicExists } from '../../src/domain/taxonomy';
import { DIFFICULTY_MAX, DIFFICULTY_MIN } from '../../src/core/constants/difficulty';

const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function attempt(overrides: Partial<QuestionAttempt> = {}): QuestionAttempt {
  return {
    ...newSyncMeta(1_700_000_000_000),
    id: 'a' + Math.random(),
    questionId: 'q1',
    topicId: 'arithmetic',
    skillIds: ['skill.add-subtract'],
    sessionId: null,
    mode: 'practice',
    difficulty: 3,
    isCorrect: true,
    givenAnswer: '5',
    correctAnswer: '5',
    timeSpentMs: 20000,
    hintsUsed: 0,
    estimateValue: null,
    estimateAccuracy: null,
    strategy: null,
    ...overrides,
  };
}

describe('generator registry', () => {
  it('ships a substantial generator library with unique ids', () => {
    expect(ALL_GENERATORS.length).toBeGreaterThanOrEqual(50);
    const ids = ALL_GENERATORS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('references only real topics and skills', () => {
    for (const generator of ALL_GENERATORS) {
      expect(topicExists(generator.topicId)).toBe(true);
      for (const skillId of generator.skillIds) {
        expect(skillExists(skillId)).toBe(true);
      }
    }
  });

  it('declares sane difficulty ranges', () => {
    for (const generator of ALL_GENERATORS) {
      expect(generator.minDifficulty).toBeGreaterThanOrEqual(DIFFICULTY_MIN);
      expect(generator.maxDifficulty).toBeLessThanOrEqual(DIFFICULTY_MAX);
      expect(generator.minDifficulty).toBeLessThanOrEqual(generator.maxDifficulty);
    }
  });
});

describe('every generator produces valid, self-consistent questions', () => {
  const cases: [string, number][] = [];
  for (const generator of ALL_GENERATORS) {
    for (const difficulty of DIFFICULTIES) {
      if (difficulty < generator.minDifficulty || difficulty > generator.maxDifficulty) continue;
      cases.push([generator.id, difficulty]);
    }
  }

  it.each(cases)('%s at difficulty %i', (generatorId, difficulty) => {
    const generator = getGenerator(generatorId)!;
    // Several seeds per generator so branchy generators get every branch hit.
    for (let seed = 0; seed < 12; seed++) {
      const question = generator.generate(contextFor(generatorId + ':' + seed, difficulty));

      expect(question.id.length).toBeGreaterThan(0);
      expect(question.prompt.trim().length).toBeGreaterThan(0);
      expect(question.promptBn?.trim().length ?? 0).toBeGreaterThan(0);
      expect(question.difficulty).toBe(difficulty);
      expect(question.source).toBe('generated');
      expect(question.generatorId).toBe(generatorId);
      expect(question.solutionSteps.length).toBeGreaterThan(0);
      expect(question.points).toBeGreaterThan(0);
      expect(question.estimatedTimeSeconds).toBeGreaterThan(0);

      // Solution steps must be ordered 1..n.
      question.solutionSteps.forEach((s, i) => {
        expect(s.order).toBe(i + 1);
        expect(s.detail.trim().length).toBeGreaterThan(0);
      });

      if (isChoiceQuestion(question) || question.questionType === 'true_false') {
        const options = question.options ?? [];
        expect(options.length).toBeGreaterThanOrEqual(2);
        expect(new Set(options.map((o) => o.text)).size).toBe(options.length);
        expect(options.some((o) => o.id === question.correctAnswer)).toBe(true);
      } else {
        // Free-text types (numeric, word_problem, estimation, ...) must never
        // gain an option list: that silently rewrites `correctAnswer` into an
        // internal option id (e.g. "opt2") that no typed answer can ever
        // match, marking every genuinely correct answer wrong.
        expect(question.options).toBeUndefined();
      }

      // The validator must accept the question's own answer.
      const own = validateAnswer(question, question.correctAnswer);
      expect(own.isCorrect).toBe(true);

      // For free-text answers whose canonical form is a plain number (not a
      // ratio, expression or other composite string), a plain re-typed value
      // of that number must also be accepted -- not just the raw stored field.
      if (
        (question.questionType === 'numeric' || question.questionType === 'word_problem') &&
        Number.isFinite(Number(question.correctAnswer))
      ) {
        const retyped = validateAnswer(question, String(Number(question.correctAnswer)));
        expect(retyped.isCorrect).toBe(true);
      }

      // ...and reject an obviously wrong one.
      const wrongCandidate = isChoiceQuestion(question)
        ? (question.options ?? []).find((o) => o.id !== question.correctAnswer)?.id
        : 'definitely-not-the-answer-42424242';
      if (wrongCandidate) {
        expect(validateAnswer(question, wrongCandidate).isCorrect).toBe(false);
      }
    }
  });
});

describe('defineGenerator option building', () => {
  it('keeps the literal correctAnswer for free-text types even when choices are supplied', () => {
    const generator = defineGenerator(
      {
        id: 'test.numeric-with-choices',
        topicId: 'arithmetic',
        skillIds: [],
        questionType: 'numeric',
        minDifficulty: 1,
        maxDifficulty: 9,
        name: 'Test',
        nameBn: 'পরীক্ষা',
      },
      () => ({
        prompt: '9 + 4 = ?',
        promptBn: '৯ + ৪ = ?',
        correctAnswer: '13',
        choices: ['12', '14', '15'],
        params: {},
        solutionSteps: [{ order: 1, detail: '13' }],
      }),
    );

    const question = generator.generate(contextFor('seed', 3));
    expect(question.correctAnswer).toBe('13');
    expect(question.options).toBeUndefined();
    expect(validateAnswer(question, '13').isCorrect).toBe(true);
  });

  it('still builds options with a remapped correctAnswer for real choice types', () => {
    const generator = defineGenerator(
      {
        id: 'test.mcq-with-choices',
        topicId: 'arithmetic',
        skillIds: [],
        questionType: 'mcq',
        minDifficulty: 1,
        maxDifficulty: 9,
        name: 'Test',
        nameBn: 'পরীক্ষা',
      },
      () => ({
        prompt: '9 + 4 = ?',
        promptBn: '৯ + ৪ = ?',
        correctAnswer: '13',
        choices: ['12', '14', '15'],
        params: {},
        solutionSteps: [{ order: 1, detail: '13' }],
      }),
    );

    const question = generator.generate(contextFor('seed', 3));
    expect(question.options?.length).toBe(4);
    const matched = question.options?.find((o) => o.id === question.correctAnswer);
    expect(matched?.text).toBe('13');
    expect(validateAnswer(question, '13').isCorrect).toBe(true);
  });
});

describe('deterministic generation', () => {
  it('produces identical questions for identical seeds', () => {
    const first = generateQuestions({ count: 8, difficulty: 4, seed: 'abc' });
    const second = generateQuestions({ count: 8, difficulty: 4, seed: 'abc' });
    expect(first.map((q) => q.id)).toEqual(second.map((q) => q.id));
    expect(first.map((q) => q.prompt)).toEqual(second.map((q) => q.prompt));
  });

  it('produces different questions for different seeds', () => {
    const first = generateQuestions({ count: 8, difficulty: 4, seed: 'abc' });
    const second = generateQuestions({ count: 8, difficulty: 4, seed: 'xyz' });
    expect(first.map((q) => q.id)).not.toEqual(second.map((q) => q.id));
  });

  it('returns unique questions within a batch', () => {
    const batch = generateQuestions({ count: 20, difficulty: 5, seed: 7 });
    expect(new Set(batch.map((q) => q.id)).size).toBe(batch.length);
  });

  it('honours topic, skill and exam filters', () => {
    const topical = generateQuestions({ count: 6, difficulty: 3, topicIds: ['percentage'], seed: 1 });
    expect(topical.every((q) => q.topicId === 'percentage')).toBe(true);

    const exam = generateQuestions({ count: 6, difficulty: 5, examIds: ['exam.bcs-math'], seed: 2 });
    expect(exam.every((q) => q.examIds.includes('exam.bcs-math'))).toBe(true);

    const brain = generateQuestions({ count: 6, difficulty: 3, brainCategories: ['money_math'], seed: 3 });
    expect(brain.every((q) => q.brainCategory === 'money_math')).toBe(true);
  });

  it('ramps difficulty for boss battles', () => {
    const battle = generateQuestions({
      count: 8,
      difficulty: 5,
      seed: 'boss',
      difficultyRamp: { from: 2, to: 8 },
    });
    expect(battle[0].difficulty).toBeLessThan(battle[battle.length - 1].difficulty);
  });

  it('never returns an empty pool for a reachable request', () => {
    expect(candidateGenerators({ count: 1, difficulty: 9, topicIds: ['place-value'] }).length).toBeGreaterThan(0);
  });

  it('replays a generated question exactly', () => {
    const generator = ALL_GENERATORS[0];
    const original = generator.generate(contextFor('replay-seed', 3));
    const replayed = regenerate(generator.id, 3, 'replay-seed');
    expect(replayed?.id).toBe(original.id);
    expect(replayed?.prompt).toBe(original.prompt);
    expect(regenerate('does.not.exist', 3, 'x')).toBeNull();
  });
});

describe('answer validation', () => {
  const numeric: Question = {
    id: 'q-num',
    topicId: 'arithmetic',
    skillIds: [],
    difficulty: 3,
    questionType: 'numeric',
    curriculumIds: ['bangladesh'],
    examIds: [],
    tags: [],
    prompt: '2 + 2',
    correctAnswer: '4',
    solutionSteps: [{ order: 1, detail: '4' }],
    source: 'static',
    questionVersion: 1,
    contentVersion: 1,
  };

  it('normalises Bangla digits, currency and spacing', () => {
    expect(normalizeAnswer(' ৳ ১,২৩৪ ')).toBe('1234');
    expect(validateAnswer(numeric, '৪').isCorrect).toBe(true);
    expect(validateAnswer(numeric, ' 4 ').isCorrect).toBe(true);
    expect(validateAnswer(numeric, '4.0').isCorrect).toBe(true);
  });

  it('accepts equivalent fractions and decimals', () => {
    const q = { ...numeric, correctAnswer: '3/4' };
    expect(validateAnswer(q, '0.75').isCorrect).toBe(true);
    expect(validateAnswer(q, '6/8').isCorrect).toBe(true);
    expect(validateAnswer(q, '75%').isCorrect).toBe(true);
    expect(validateAnswer(q, '0.7').isCorrect).toBe(false);
  });

  it('flags a near miss without accepting it', () => {
    const q = { ...numeric, correctAnswer: '100' };
    const result = validateAnswer(q, '103');
    expect(result.isCorrect).toBe(false);
    expect(result.nearMiss).toBe(true);
  });

  it('uses a relative tolerance for estimation questions', () => {
    const q: Question = { ...numeric, questionType: 'estimation', correctAnswer: '1000' };
    expect(validateAnswer(q, '1020').isCorrect).toBe(true);
    expect(validateAnswer(q, '1400').isCorrect).toBe(false);
  });

  it('compares expressions structurally', () => {
    const q: Question = { ...numeric, questionType: 'expression', correctAnswer: '2x + 2' };
    expect(validateAnswer(q, '2(x + 1)').isCorrect).toBe(true);
    expect(validateAnswer(q, '2x + 3').isCorrect).toBe(false);
  });

  it('rejects an empty answer', () => {
    expect(validateAnswer(numeric, '   ').isCorrect).toBe(false);
    expect(validateAnswer(numeric, '').reason).toBe('empty');
  });

  it('accepts an option letter, id or text', () => {
    const mcq: Question = {
      ...numeric,
      questionType: 'mcq',
      options: [
        { id: 'opt0', text: 'four' },
        { id: 'opt1', text: 'five' },
      ],
      correctAnswer: 'opt1',
    };
    expect(validateAnswer(mcq, 'opt1').isCorrect).toBe(true);
    expect(validateAnswer(mcq, 'five').isCorrect).toBe(true);
    expect(validateAnswer(mcq, 'b').isCorrect).toBe(true);
    expect(validateAnswer(mcq, 'four').isCorrect).toBe(false);
  });

  it('scores Think First estimates', () => {
    const q = { ...numeric, correctAnswer: '200' };
    expect(scoreEstimate(q, 200)).toBe(1);
    expect(scoreEstimate(q, 195)).toBe(1);
    // A double-or-nothing estimate scores zero; anything closer scores partially.
    expect(scoreEstimate(q, 400)).toBe(0);
    expect(scoreEstimate(q, 240)).toBeGreaterThan(0);
    expect(scoreEstimate(q, 240)).toBeLessThan(1);
    expect(scoreEstimate(q, 300)).toBeLessThan(scoreEstimate(q, 240));
  });
});

describe('difficulty engine', () => {
  it('holds difficulty while warming up', () => {
    const decision = nextDifficulty({ attempts: [attempt()], currentDifficulty: 4 });
    expect(decision.reason).toBe('warmup');
    expect(decision.nextDifficulty).toBe(4);
  });

  it('raises difficulty for fast, accurate work', () => {
    const attempts = Array.from({ length: 6 }, () => attempt({ isCorrect: true, timeSpentMs: 8000 }));
    const decision = nextDifficulty({ attempts, currentDifficulty: 4 });
    expect(decision.nextDifficulty).toBeGreaterThan(4);
  });

  it('lowers difficulty after a run of mistakes', () => {
    const attempts = Array.from({ length: 6 }, () => attempt({ isCorrect: false, timeSpentMs: 60000 }));
    const decision = nextDifficulty({ attempts, currentDifficulty: 6 });
    expect(decision.nextDifficulty).toBeLessThan(6);
    expect(decision.reason).toBe('struggling');
  });

  it('consolidates when answers are right but very slow', () => {
    const attempts = Array.from({ length: 6 }, () => attempt({ isCorrect: true, timeSpentMs: 200000 }));
    const decision = nextDifficulty({ attempts, currentDifficulty: 5 });
    expect(decision.nextDifficulty).toBe(5);
    expect(decision.reason).toBe('slow_down');
  });

  it('never leaves the 1..9 band', () => {
    const struggling = Array.from({ length: 8 }, () => attempt({ isCorrect: false }));
    expect(nextDifficulty({ attempts: struggling, currentDifficulty: 1 }).nextDifficulty).toBe(1);
    const flying = Array.from({ length: 8 }, () => attempt({ isCorrect: true, timeSpentMs: 3000 }));
    expect(nextDifficulty({ attempts: flying, currentDifficulty: 9 }).nextDifficulty).toBe(9);
  });

  it('respects an explicit difficulty preference', () => {
    expect(startingDifficulty(3, 7)).toBe(7);
    expect(startingDifficulty(3, 'adaptive', 0)).toBe(3);
    expect(startingDifficulty(3, 'adaptive', 1)).toBe(6);
  });

  it('scores speed against the expected budget', () => {
    expect(speedScore(1000, 5)).toBeGreaterThan(speedScore(100000, 5));
    expect(speedScore(0, 5)).toBe(0);
  });
});

describe('mastery engine', () => {
  it('reports zero mastery with no attempts', () => {
    expect(computeMastery({ attempts: [] }).mastery).toBe(0);
  });

  it('does not equate a few easy right answers with mastery', () => {
    const easy = Array.from({ length: 4 }, () => attempt({ difficulty: 1, isCorrect: true }));
    const result = computeMastery({ attempts: easy, now: 1_700_000_000_000 });
    expect(result.accuracy).toBe(1);
    expect(result.mastery).toBeLessThan(0.8);
  });

  it('rewards sustained hard, fast, correct work', () => {
    const strong = Array.from({ length: 30 }, () =>
      attempt({ difficulty: 8, isCorrect: true, timeSpentMs: 20000 }),
    );
    const result = computeMastery({ attempts: strong, now: 1_700_000_000_000 });
    expect(result.mastery).toBeGreaterThan(0.8);
  });

  it('penalises inconsistency at equal accuracy', () => {
    const steady = [true, true, true, true, false, false, false, false].map((c) =>
      attempt({ isCorrect: c }),
    );
    const jagged = [true, false, true, false, true, false, true, false].map((c) =>
      attempt({ isCorrect: c }),
    );
    const a = computeMastery({ attempts: steady, now: 1_700_000_000_000 });
    const b = computeMastery({ attempts: jagged, now: 1_700_000_000_000 });
    expect(a.accuracy).toBe(b.accuracy);
    expect(a.consistency).toBeGreaterThan(b.consistency);
  });

  it('decays with time since practice', () => {
    const attempts = Array.from({ length: 20 }, () => attempt({ isCorrect: true }));
    const fresh = computeMastery({ attempts, lastPracticedAt: 1_700_000_000_000, now: 1_700_000_000_000 });
    const stale = computeMastery({
      attempts,
      lastPracticedAt: 1_700_000_000_000,
      now: 1_700_000_000_000 + 120 * 86400000,
    });
    expect(stale.mastery).toBeLessThan(fresh.mastery);
  });

  it('keeps the rolling outcome window bounded', () => {
    let window = '';
    for (let i = 0; i < 40; i++) window = pushOutcome(window, i % 2 === 0);
    expect(window.length).toBe(20);
  });

  it('labels progress in both languages', () => {
    expect(masteryLabel(0, 0).key).toBe('new');
    expect(masteryLabel(0.2, 5).key).toBe('learning');
    expect(masteryLabel(0.9, 30).key).toBe('mastered');
    expect(masteryLabel(0.9, 30).bn.length).toBeGreaterThan(0);
  });

  it('rolls up overall mastery weighted by volume', () => {
    const progress: TopicProgress[] = [
      { ...newSyncMeta(), id: '1', topicId: 'a', attempts: 100, correct: 90, totalTimeMs: 0, mastery: 0.9, bestDifficulty: 5, lastPracticedAt: null, bossDefeatedAt: null },
      { ...newSyncMeta(), id: '2', topicId: 'b', attempts: 2, correct: 0, totalTimeMs: 0, mastery: 0.1, bestDifficulty: 1, lastPracticedAt: null, bossDefeatedAt: null },
    ];
    const overall = overallMastery(progress);
    expect(overall).toBeGreaterThan(0.8);
    expect(overallMastery([])).toBe(0);
  });

  it('measures exam readiness including coverage', () => {
    const progress: TopicProgress[] = [
      { ...newSyncMeta(), id: '1', topicId: 'percentage', attempts: 20, correct: 18, totalTimeMs: 0, mastery: 0.9, bestDifficulty: 6, lastPracticedAt: null, bossDefeatedAt: null },
    ];
    const partial = examReadiness(['percentage', 'average', 'number-theory'], progress);
    const full = examReadiness(['percentage'], progress);
    expect(full).toBeGreaterThan(partial);
    expect(examReadiness([], progress)).toBe(0);
  });
});

describe('spaced repetition', () => {
  const base = { stage: 0, repetitions: 0, lapses: 0, ease: 2.2 };
  const now = 1_700_000_000_000;

  it('advances up the ladder on success', () => {
    const first = scheduleReview({ item: base, isCorrect: true, speed: 0.9, now });
    expect(first.stage).toBeGreaterThan(0);
    const second = scheduleReview({ item: first, isCorrect: true, speed: 0.9, now });
    expect(second.stage).toBeGreaterThan(first.stage);
    expect(second.dueAt).toBeGreaterThan(first.dueAt);
  });

  it('brings a lapsed item back within a day', () => {
    const far = scheduleReview({ item: { ...base, stage: 5 }, isCorrect: true, now });
    const lapsed = scheduleReview({ item: far, isCorrect: false, now });
    expect(lapsed.stage).toBeLessThanOrEqual(1);
    expect(lapsed.dueAt - now).toBeLessThanOrEqual(2 * 86400000);
    expect(lapsed.lapses).toBe(1);
  });

  it('caps the stage at the top of the ladder', () => {
    let item = base;
    for (let i = 0; i < 10; i++) item = scheduleReview({ item, isCorrect: true, speed: 1, now });
    expect(item.stage).toBe(REVIEW_INTERVALS_DAYS.length - 1);
  });

  it('prioritises the most-lapsed, most-overdue items', () => {
    const mk = (id: string, dueAt: number, lapses: number): ReviewItem => ({
      ...newSyncMeta(),
      id,
      itemType: 'question',
      itemId: id,
      topicId: 'arithmetic',
      stage: 1,
      dueAt,
      lastReviewedAt: null,
      repetitions: 1,
      lapses,
      ease: 2.2,
      snapshot: null,
    });
    const queue = prioritiseQueue(
      [mk('a', now - 1000, 0), mk('b', now - 10, 3), mk('c', now + 100000, 5)],
      now,
    );
    expect(queue.map((i) => i.id)).toEqual(['b', 'a']);
  });
});

describe('mathematical thinking score', () => {
  it('starts at zero and improves with correct work', () => {
    let dimensions = emptyDimensions();
    expect(compositeScore(dimensions)).toBe(0);
    for (let i = 0; i < 40; i++) {
      dimensions = updateDimensions(dimensions, [
        { attempt: attempt({ topicId: 'arithmetic', difficulty: 6, isCorrect: true, timeSpentMs: 15000 }) },
      ]);
    }
    expect(dimensions.calculation).toBeGreaterThan(500);
    expect(compositeScore(dimensions)).toBeGreaterThan(0);
  });

  it('routes brain categories to their dimension', () => {
    const dimensions = updateDimensions(emptyDimensions(), [
      { attempt: attempt({ isCorrect: true }), brainCategory: 'probability' },
    ]);
    expect(dimensions.probability).toBeGreaterThan(0);
    expect(dimensions.calculation).toBe(0);
  });

  it('bands the score in both languages', () => {
    expect(thinkingBand(50).key).toBe('developing');
    expect(thinkingBand(900).key).toBe('exceptional');
    expect(thinkingBand(500).bn.length).toBeGreaterThan(0);
  });
});

describe('adaptive selection', () => {
  const topicProgress: TopicProgress[] = [
    { ...newSyncMeta(), id: '1', topicId: 'percentage', attempts: 10, correct: 3, totalTimeMs: 0, mastery: 0.25, bestDifficulty: 3, lastPracticedAt: null, bossDefeatedAt: null },
    { ...newSyncMeta(), id: '2', topicId: 'arithmetic', attempts: 20, correct: 19, totalTimeMs: 0, mastery: 0.92, bestDifficulty: 6, lastPracticedAt: null, bossDefeatedAt: null },
  ];
  const skillProgress: SkillProgress[] = [
    { ...newSyncMeta(), id: '1', skillId: 'skill.percent-of', topicId: 'percentage', attempts: 8, correct: 2, totalTimeMs: 0, mastery: 0.2, recentOutcomes: '00100', lastPracticedAt: null },
  ];
  const mistake: Mistake = {
    ...newSyncMeta(),
    id: 'm1',
    questionId: 'q-bad',
    topicId: 'percentage',
    skillIds: ['skill.percent-of'],
    difficulty: 4,
    mistakeCount: 3,
    lastMistakeAt: 1,
    correctStreak: 0,
    resolved: false,
    questionSnapshot: '{}',
    reason: null,
  };
  const review: ReviewItem = {
    ...newSyncMeta(),
    id: 'r1',
    itemType: 'question',
    itemId: 'q-review',
    topicId: 'percentage',
    stage: 1,
    dueAt: 1,
    lastReviewedAt: null,
    repetitions: 1,
    lapses: 1,
    ease: 2.2,
    snapshot: '{}',
  };

  const input = {
    count: 12,
    recentAttempts: Array.from({ length: 6 }, () => attempt({ isCorrect: true, timeSpentMs: 9000 })),
    topicProgress,
    skillProgress,
    openMistakes: [mistake],
    dueReviews: [review],
    currentDifficulty: 4,
    seed: 'plan',
    now: 1_700_000_000_000,
  };

  it('reserves slots for reviews and mistakes', () => {
    const plan = planAdaptiveSet(input);
    expect(plan.slots).toHaveLength(12);
    expect(plan.slots.filter((s) => s.kind === 'review')).toHaveLength(1);
    expect(plan.slots.filter((s) => s.kind === 'mistake')).toHaveLength(1);
    expect(plan.weakSkillIds).toContain('skill.percent-of');
  });

  it('raises the target difficulty when the learner is flying', () => {
    expect(planAdaptiveSet(input).targetDifficulty).toBeGreaterThan(4);
  });

  it('fills the generated slots', () => {
    const plan = planAdaptiveSet(input);
    const filled = fillPlan(plan, input);
    const fresh = filled.filter((s) => !s.itemId);
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((s) => !!s.question)).toBe(true);
    const ids = fresh.map((s) => s.question!.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('identifies weak topics', () => {
    expect(weakTopicIds(topicProgress)).toEqual(['percentage']);
  });
});

describe('rule-based tutor', () => {
  const question = ALL_GENERATORS[0].generate(contextFor('tutor', 3));

  it('explains using the engine-produced steps only', async () => {
    const tutor = new RuleBasedMathTutor('en');
    const explanation = await tutor.explain(question);
    expect(explanation).toContain('1.');
    expect(explanation).toContain('Answer:');
  });

  it('gives progressively deeper hints', async () => {
    const tutor = new RuleBasedMathTutor('en');
    const first = await tutor.giveHint(question, 1);
    const deep = await tutor.giveHint(question, 5);
    expect(first.length).toBeGreaterThan(0);
    expect(deep.length).toBeGreaterThan(0);
  });

  it('explains a mistake with both answers', async () => {
    const tutor = new RuleBasedMathTutor('en');
    const text = await tutor.explainMistake(
      attempt({ questionId: question.id, givenAnswer: 'wrong-answer', isCorrect: false }),
      question,
    );
    expect(text).toContain('Your answer: wrong-answer');
    expect(text).toContain('Correct answer:');
  });

  it('renders solutions in Bangla when asked', () => {
    const rendered = renderSolution(question, 'bn');
    expect(rendered.steps.length).toBeGreaterThan(0);
    expect(rendered.answer.length).toBeGreaterThan(0);
  });
});
