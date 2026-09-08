import { clampDifficulty } from '../../core/constants/difficulty';
import { generateQuestions } from '../../core/question-engine/registry';
import { validateAnswer } from '../../core/question-engine/answerValidator';
import { runSimulation, experimentSpace, type LabExperiment, type SimulationResult } from '../../core/math/probability';
import { samplePoints } from '../../core/math/calculus';
import * as Geometry from '../../core/math/geometry';
import { createRng } from '../../core/utils/random';
import { uuid } from '../../core/utils/id';
import { newSyncMeta } from '../models';
import type { GameDefinition, GameHighScore, GameKind, GameScore, Question } from '../models';
import type { RepositoryRegistry } from '../repositories';
import { scoreGame } from '../rules/scoring';
import { tierForXp } from '../../core/constants/categories';

export interface GameRound {
  question: Question;
  difficulty: number;
}

export interface GameRunState {
  kind: GameKind;
  difficulty: number;
  correct: number;
  wrong: number;
  combo: number;
  maxCombo: number;
  livesLeft: number;
  startedAt: number;
  finished: boolean;
}

export interface GameListEntry {
  game: GameDefinition;
  highScore?: GameHighScore;
}

/** Game session use cases (spec §28) and Math Lab experiments (spec §29). */
export class GameService {
  constructor(private readonly repos: RepositoryRegistry) {}

  async listGames(): Promise<GameListEntry[]> {
    const [games, highScores] = await Promise.all([
      this.repos.games.getGames(),
      this.repos.games.getHighScores(),
    ]);
    const byKind = new Map(highScores.map((h) => [h.gameKind, h]));
    return games.map((game) => ({ game, highScore: byKind.get(game.kind) }));
  }

  async startRun(kind: GameKind, now = Date.now()): Promise<{ game: GameDefinition; state: GameRunState } | null> {
    const game = await this.repos.games.getGameByKind(kind);
    if (!game) return null;
    return {
      game,
      state: {
        kind,
        difficulty: game.startDifficulty,
        correct: 0,
        wrong: 0,
        combo: 0,
        maxCombo: 0,
        livesLeft: game.livesAllowed,
        startedAt: now,
        finished: false,
      },
    };
  }

  /** Draws the next question at the run's current difficulty. */
  async nextRound(game: GameDefinition, state: GameRunState, index: number): Promise<GameRound | null> {
    try {
      const questions = generateQuestions({
        count: 1,
        difficulty: state.difficulty,
        generatorIds: game.generatorIds,
        seed: game.kind + ':' + state.startedAt + ':' + index,
      });
      if (questions.length === 0) return null;
      await this.repos.questions.upsertQuestions(questions);
      return { question: questions[0], difficulty: state.difficulty };
    } catch {
      return null;
    }
  }

  /** Applies one answer to the run state, moving difficulty and lives. */
  answerRound(
    game: GameDefinition,
    state: GameRunState,
    question: Question,
    givenAnswer: string,
  ): { state: GameRunState; isCorrect: boolean } {
    const isCorrect = validateAnswer(question, givenAnswer).isCorrect;
    const combo = isCorrect ? state.combo + 1 : 0;
    const livesLeft = isCorrect ? state.livesLeft : state.livesLeft - 1;
    const difficulty = clampDifficulty(
      state.difficulty + (isCorrect ? game.difficultyStepUp : -game.difficultyStepDown),
    );

    return {
      isCorrect,
      state: {
        ...state,
        correct: state.correct + (isCorrect ? 1 : 0),
        wrong: state.wrong + (isCorrect ? 0 : 1),
        combo,
        maxCombo: Math.max(state.maxCombo, combo),
        livesLeft,
        difficulty,
        finished: game.livesAllowed > 0 && livesLeft <= 0,
      },
    };
  }

  async finishRun(state: GameRunState, now = Date.now()): Promise<GameScore> {
    const score = scoreGame({
      correct: state.correct,
      wrong: state.wrong,
      maxCombo: state.maxCombo,
      difficultyReached: state.difficulty,
      durationMs: now - state.startedAt,
      kind: state.kind,
    });

    const record: GameScore = {
      ...newSyncMeta(now),
      id: uuid(),
      gameKind: state.kind,
      score,
      correct: state.correct,
      wrong: state.wrong,
      maxCombo: state.maxCombo,
      durationMs: now - state.startedAt,
      playedAt: now,
      difficultyReached: state.difficulty,
    };
    await this.repos.games.saveScore(record);

    // Games award a modest XP share so they complement practice, not replace it.
    const profile = await this.repos.users.getProfile();
    const progress = await this.repos.progress.getProgress(profile.id);
    const xp = Math.round(score / 10);
    const newXp = progress.xp + xp;
    await this.repos.progress.updateProgress({
      ...progress,
      xp: newXp,
      coins: progress.coins + Math.round(xp / 3),
      tier: tierForXp(newXp),
      updatedAt: now,
      version: progress.version + 1,
      syncStatus: 'pending',
    });

    return record;
  }

  /* ── Math Lab (spec §29) ─────────────────────────────────────────────── */

  /** Probability Lab: deterministic for a given seed so a run is repeatable. */
  runProbabilityLab(experiment: LabExperiment, trials: number, seed?: string | number): SimulationResult {
    return runSimulation(experiment, trials, createRng(seed ?? Date.now()));
  }

  probabilitySpace(experiment: LabExperiment): { labels: string[]; expected: number[] } {
    return experimentSpace(experiment);
  }

  /**
   * Geometry Lab: recomputes every measurement as the user drags a shape, so
   * the relationship between dimensions and area is visible (spec §29).
   */
  geometryLab(
    shape: 'rectangle' | 'triangle' | 'circle',
    a: number,
    b: number,
  ): { measurements: { label: string; value: number; unit: string }[]; steps: string[] } {
    const safeA = Math.max(0.1, a);
    const safeB = Math.max(0.1, b);

    if (shape === 'circle') {
      const area = Geometry.circleArea(safeA);
      const circumference = Geometry.circleCircumference(safeA);
      return {
        measurements: [
          { label: 'radius', value: safeA, unit: 'units' },
          { label: 'diameter', value: safeA * 2, unit: 'units' },
          { label: 'area', value: area.value, unit: 'sq units' },
          { label: 'circumference', value: circumference.value, unit: 'units' },
        ],
        steps: [...area.steps, ...circumference.steps],
      };
    }

    if (shape === 'triangle') {
      const area = Geometry.triangleArea(safeA, safeB);
      const hypotenuse = Geometry.pythagorasHypotenuse(safeA, safeB);
      return {
        measurements: [
          { label: 'base', value: safeA, unit: 'units' },
          { label: 'height', value: safeB, unit: 'units' },
          { label: 'area', value: area.value, unit: 'sq units' },
          { label: 'hypotenuse', value: hypotenuse.value, unit: 'units' },
          { label: 'perimeter', value: safeA + safeB + hypotenuse.value, unit: 'units' },
        ],
        steps: [...area.steps, ...hypotenuse.steps],
      };
    }

    const area = Geometry.rectangleArea(safeA, safeB);
    const perimeter = Geometry.rectanglePerimeter(safeA, safeB);
    const diagonal = Geometry.pythagorasHypotenuse(safeA, safeB);
    return {
      measurements: [
        { label: 'length', value: safeA, unit: 'units' },
        { label: 'width', value: safeB, unit: 'units' },
        { label: 'area', value: area.value, unit: 'sq units' },
        { label: 'perimeter', value: perimeter.value, unit: 'units' },
        { label: 'diagonal', value: diagonal.value, unit: 'units' },
      ],
      steps: [...area.steps, ...perimeter.steps, ...diagonal.steps],
    };
  }

  /** Function Lab: samples f(x) = ax² + bx + c for plotting. */
  functionLab(a: number, b: number, c: number, from = -10, to = 10, steps = 120) {
    const parts: string[] = [];
    if (a !== 0) parts.push(a + 'x^2');
    if (b !== 0) parts.push((b > 0 && parts.length ? '+ ' : '') + b + 'x');
    if (c !== 0 || parts.length === 0) parts.push((c > 0 && parts.length ? '+ ' : '') + c);
    const expression = parts.join(' ') || '0';
    const points = samplePoints(expression, from, to, steps);
    const vertexX = a === 0 ? null : -b / (2 * a);
    const discriminant = b * b - 4 * a * c;
    return {
      expression,
      points,
      vertex: vertexX === null ? null : { x: vertexX, y: a * vertexX * vertexX + b * vertexX + c },
      discriminant,
      realRootCount: a === 0 ? (b === 0 ? 0 : 1) : discriminant > 0 ? 2 : discriminant === 0 ? 1 : 0,
    };
  }
}
