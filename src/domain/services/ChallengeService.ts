import { generateQuestions } from '../../core/question-engine/registry';
import { TOURNAMENT_TIERS, tierForXp, type TournamentTier } from '../../core/constants/categories';
import { dayKey } from '../../core/utils/date';
import { uuid } from '../../core/utils/id';
import { newSyncMeta, touchSyncMeta } from '../models';
import type { Challenge, ChallengeAttempt, ID, MissionState, Question } from '../models';
import type { RepositoryRegistry } from '../repositories';
import { scoreChallenge } from '../rules/scoring';

export interface ChallengeEntry {
  challenge: Challenge;
  /** Locked until the topic reaches the required mastery (spec §34). */
  unlocked: boolean;
  mastery: number;
  bestScore: number;
  attempts: number;
  defeated: boolean;
}

export interface MissionEntry {
  mission: MissionState;
  challenge?: Challenge;
}

export interface TournamentStanding {
  tier: TournamentTier;
  xp: number;
  /** Deterministic synthetic rivals so the ladder works with no server. */
  rivals: { name: string; score: number }[];
  personalBest: number;
  nextTier?: { tier: TournamentTier; xpNeeded: number };
}

/** Boss battles, missions and the offline tournament (spec §34, §33, §35). */
export class ChallengeService {
  constructor(private readonly repos: RepositoryRegistry) {}

  async listBosses(): Promise<ChallengeEntry[]> {
    const [challenges, topicProgress] = await Promise.all([
      this.repos.challenges.getChallenges(),
      this.repos.progress.getTopicProgress(),
    ]);
    const byTopic = new Map(topicProgress.map((p) => [p.topicId, p]));

    const out: ChallengeEntry[] = [];
    for (const challenge of challenges.filter((c) => c.kind === 'boss')) {
      const progress = challenge.topicId ? byTopic.get(challenge.topicId) : undefined;
      const mastery = progress?.mastery ?? 0;
      const attempts = await this.repos.challenges.getChallengeAttempts(challenge.id);
      out.push({
        challenge,
        unlocked: mastery >= challenge.requiredMastery,
        mastery,
        bestScore: attempts.length ? Math.max(...attempts.map((a) => a.score)) : 0,
        attempts: attempts.length,
        defeated: !!progress?.bossDefeatedAt || attempts.some((a) => a.passed),
      });
    }
    return out;
  }

  async getChallenge(id: ID): Promise<Challenge | null> {
    return this.repos.challenges.getChallengeById(id);
  }

  /** Builds the boss question set with the difficulty ramp the spec asks for. */
  async startChallenge(challengeId: ID, seed?: string | number): Promise<{ challenge: Challenge; questions: Question[] } | null> {
    const challenge = await this.repos.challenges.getChallengeById(challengeId);
    if (!challenge) return null;

    const questions = generateQuestions({
      count: challenge.questionCount,
      difficulty: challenge.difficultyStart,
      topicIds: challenge.topicId ? [challenge.topicId] : undefined,
      difficultyRamp: { from: challenge.difficultyStart, to: challenge.difficultyEnd },
      seed: seed ?? challenge.id + ':' + Date.now(),
    });
    await this.repos.questions.upsertQuestions(questions);
    return { challenge, questions };
  }

  async finishChallenge(
    challenge: Challenge,
    correct: number,
    total: number,
    startedAt: number,
    now = Date.now(),
  ): Promise<{ attempt: ChallengeAttempt; passed: boolean; xpEarned: number }> {
    const outcome = scoreChallenge(correct, total);
    const attempt: ChallengeAttempt = {
      ...newSyncMeta(now),
      id: uuid(),
      challengeId: challenge.id,
      startedAt,
      finishedAt: now,
      score: outcome.score,
      correct,
      total,
      passed: outcome.passed,
    };
    await this.repos.challenges.saveChallengeAttempt(attempt);

    let xpEarned = 0;
    if (outcome.passed) {
      xpEarned = challenge.xpReward;
      const profile = await this.repos.users.getProfile();
      const progress = await this.repos.progress.getProgress(profile.id);
      const xp = progress.xp + challenge.xpReward;
      await this.repos.progress.updateProgress({
        ...touchSyncMeta(progress, now),
        xp,
        coins: progress.coins + challenge.coinReward,
        tier: tierForXp(xp),
      });

      // Beating a boss unlocks the next stage for that topic.
      if (challenge.kind === 'boss' && challenge.topicId) {
        const topicProgress = (await this.repos.progress.getTopicProgress(challenge.topicId))[0];
        if (topicProgress && !topicProgress.bossDefeatedAt) {
          await this.repos.progress.upsertTopicProgress({
            ...touchSyncMeta(topicProgress, now),
            bossDefeatedAt: now,
          });
        }
      }
    }

    return { attempt, passed: outcome.passed, xpEarned };
  }

  /* ── missions ──────────────────────────────────────────────────────────── */

  /** Ensures today's and this week's missions exist, then returns them. */
  async getMissions(now = Date.now()): Promise<MissionEntry[]> {
    const today = dayKey(now);
    const week = isoWeekKey(now);
    const month = today.slice(0, 7);
    const challenges = await this.repos.challenges.getChallenges();

    const wanted: { challenge: Challenge; periodKey: string }[] = [];
    for (const challenge of challenges) {
      if (challenge.kind === 'daily_mission') wanted.push({ challenge, periodKey: today });
      else if (challenge.kind === 'weekly_mission') wanted.push({ challenge, periodKey: week });
      else if (challenge.kind === 'monthly_challenge') wanted.push({ challenge, periodKey: month });
    }

    const existing = [
      ...(await this.repos.challenges.getMissions(today)),
      ...(await this.repos.challenges.getMissions(week)),
      ...(await this.repos.challenges.getMissions(month)),
    ];
    const key = (code: string, periodKey: string): string => code + '|' + periodKey;
    const byKey = new Map(existing.map((m) => [key(m.code, m.periodKey), m]));

    const out: MissionEntry[] = [];
    for (const { challenge, periodKey } of wanted) {
      const code = challenge.id;
      let mission = byKey.get(key(code, periodKey));
      if (!mission) {
        mission = {
          ...newSyncMeta(now),
          id: uuid(),
          code,
          periodKey,
          target: Math.max(1, challenge.questionCount),
          progress: 0,
          completed: false,
          claimedAt: null,
        };
        await this.repos.challenges.upsertMission(mission);
      }
      out.push({ mission, challenge });
    }
    return out;
  }

  /** Advances mission progress; returns the missions that just completed. */
  async advanceMissions(
    amountByCode: Readonly<Record<string, number>>,
    now = Date.now(),
  ): Promise<MissionState[]> {
    const entries = await this.getMissions(now);
    const completed: MissionState[] = [];
    for (const { mission } of entries) {
      const delta = amountByCode[mission.code];
      if (!delta) continue;
      const progress = Math.min(mission.target, mission.progress + delta);
      const wasCompleted = mission.completed;
      const isCompleted = progress >= mission.target;
      const updated: MissionState = {
        ...touchSyncMeta(mission, now),
        progress,
        completed: isCompleted,
      };
      await this.repos.challenges.upsertMission(updated);
      if (isCompleted && !wasCompleted) completed.push(updated);
    }
    return completed;
  }

  /** Claims a completed mission's reward once. */
  async claimMission(mission: MissionState, now = Date.now()): Promise<number> {
    if (!mission.completed || mission.claimedAt) return 0;
    const challenge = await this.repos.challenges.getChallengeById(mission.code);
    const xp = challenge?.xpReward ?? 50;
    const coins = challenge?.coinReward ?? 25;

    await this.repos.challenges.upsertMission({ ...touchSyncMeta(mission, now), claimedAt: now });
    const profile = await this.repos.users.getProfile();
    const progress = await this.repos.progress.getProgress(profile.id);
    const newXp = progress.xp + xp;
    await this.repos.progress.updateProgress({
      ...touchSyncMeta(progress, now),
      xp: newXp,
      coins: progress.coins + coins,
      tier: tierForXp(newXp),
    });
    return xp;
  }

  /* ── offline tournament (spec §35) ─────────────────────────────────────── */

  async getTournamentStanding(): Promise<TournamentStanding> {
    const profile = await this.repos.users.getProfile();
    const progress = await this.repos.progress.getProgress(profile.id);
    const tournamentAttempts = await this.repos.challenges.getChallengeAttempts('challenge.tournament-weekly');
    const personalBest = tournamentAttempts.length ? Math.max(...tournamentAttempts.map((a) => a.score)) : 0;

    const tier = tierForXp(progress.xp);
    const tierIndex = TOURNAMENT_TIERS.indexOf(tier);
    const nextTierName = TOURNAMENT_TIERS[tierIndex + 1];

    // Synthetic rivals scale with the tier so the ladder stays meaningful.
    const baseline = 6 + tierIndex * 3;
    const rivals = [
      { name: 'Rahim', score: baseline + 2 },
      { name: 'Sadia', score: baseline + 1 },
      { name: 'Tanvir', score: baseline },
      { name: 'Mitu', score: Math.max(1, baseline - 2) },
    ];

    return {
      tier,
      xp: progress.xp,
      rivals,
      personalBest,
      nextTier: nextTierName
        ? {
            tier: nextTierName,
            xpNeeded: Math.max(0, tierThreshold(nextTierName) - progress.xp),
          }
        : undefined,
    };
  }
}

function tierThreshold(tier: TournamentTier): number {
  const thresholds: Record<TournamentTier, number> = {
    bronze: 0,
    silver: 2500,
    gold: 8000,
    diamond: 20000,
    master: 50000,
  };
  return thresholds[tier];
}

/** ISO-style week key, e.g. `2026-W36`. */
export function isoWeekKey(timestamp: number): string {
  const date = new Date(timestamp);
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return target.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}
