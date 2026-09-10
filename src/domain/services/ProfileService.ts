import { clampSoundVolume, type FontScale } from '../../core/constants/accessibility';
import type { Language } from '../../core/constants/levels';
import type { DifficultyBand } from '../../core/constants/difficulty';
import { touchSyncMeta } from '../models';
import type { Achievement, ContentStats, InstalledPack, LearningGoal, UnlockedAchievement, UserProfile, UserSettings } from '../models';
import type { RepositoryRegistry } from '../repositories';
import { achievementByCode } from '../../data/content/achievements';

export interface AchievementView {
  achievement: Achievement;
  unlocked?: UnlockedAchievement;
  progress: number;
  target: number;
  ratio: number;
}

export interface ProfileOverview {
  profile: UserProfile;
  settings: UserSettings;
  packs: InstalledPack[];
  contentStats: ContentStats;
  achievements: AchievementView[];
  unseenAchievementCodes: string[];
}

/** Local profile, settings, achievements and content packs (spec §41, §10). */
export class ProfileService {
  constructor(private readonly repos: RepositoryRegistry) {}

  async getOverview(): Promise<ProfileOverview> {
    const [profile, settings, packs, contentStats, catalog, unlocked] = await Promise.all([
      this.repos.users.getProfile(),
      this.repos.users.getSettings(),
      this.repos.packs.getInstalledPacks(),
      this.repos.packs.getContentStats(),
      this.repos.achievements.getCatalog(),
      this.repos.achievements.getUnlocked(),
    ]);

    const unlockedByCode = new Map(unlocked.map((u) => [u.achievementCode, u]));
    const metrics = await this.currentMetrics(profile.id);

    const achievements: AchievementView[] = catalog.map((achievement) => {
      const progress = Math.min(achievement.threshold, metrics[achievement.metric] ?? 0);
      return {
        achievement,
        unlocked: unlockedByCode.get(achievement.code),
        progress,
        target: achievement.threshold,
        ratio: achievement.threshold === 0 ? 0 : Number((progress / achievement.threshold).toFixed(4)),
      };
    });

    return {
      profile,
      settings,
      packs,
      contentStats,
      achievements,
      unseenAchievementCodes: unlocked.filter((u) => !u.seen).map((u) => u.achievementCode),
    };
  }

  async updateProfile(
    changes: Partial<Pick<UserProfile, 'name' | 'avatarEmoji' | 'learningGoal' | 'language' | 'dailyGoalQuestions' | 'dailyGoalMinutes' | 'difficultyPreference'>>,
    now = Date.now(),
  ): Promise<UserProfile> {
    const profile = await this.repos.users.getProfile();
    const updated: UserProfile = { ...touchSyncMeta(profile, now), ...changes };
    await this.repos.users.updateProfile(updated);

    // The language lives in both places so settings stay the single UI source.
    if (changes.language && changes.language !== profile.language) {
      const settings = await this.repos.users.getSettings();
      await this.repos.users.updateSettings({ ...touchSyncMeta(settings, now), language: changes.language });
    }
    return updated;
  }

  async updateSettings(changes: Partial<Omit<UserSettings, 'id'>>, now = Date.now()): Promise<UserSettings> {
    const settings = await this.repos.users.getSettings();
    const updated: UserSettings = { ...touchSyncMeta(settings, now), ...changes };

    if (changes.fontScale) {
      // `largeText` is the retired two-state version of the same preference.
      // Keeping it in step means a downgrade still reads a sensible value.
      updated.largeText = changes.fontScale === 'large' || changes.fontScale === 'xLarge';
    }
    if (changes.soundVolume !== undefined) {
      updated.soundVolume = clampSoundVolume(changes.soundVolume);
    }

    await this.repos.users.updateSettings(updated);

    if (changes.language && changes.language !== settings.language) {
      const profile = await this.repos.users.getProfile();
      await this.repos.users.updateProfile({ ...touchSyncMeta(profile, now), language: changes.language });
    }
    return updated;
  }

  async setLanguage(language: Language): Promise<void> {
    await this.updateSettings({ language });
  }

  async setFontScale(fontScale: FontScale): Promise<void> {
    await this.updateSettings({ fontScale });
  }

  async setSoundEnabled(soundEnabled: boolean): Promise<void> {
    await this.updateSettings({ soundEnabled });
  }

  /** Volume is 0..100; anything outside is clamped rather than rejected. */
  async setSoundVolume(soundVolume: number): Promise<void> {
    await this.updateSettings({ soundVolume });
  }

  async setDifficultyPreference(preference: DifficultyBand | 'adaptive'): Promise<void> {
    await this.updateProfile({ difficultyPreference: preference });
  }

  async setLearningGoal(goal: LearningGoal): Promise<void> {
    await this.updateProfile({ learningGoal: goal });
  }

  async setPackEnabled(packId: string, enabled: boolean): Promise<InstalledPack[]> {
    await this.repos.packs.setPackEnabled(packId, enabled);
    return this.repos.packs.getInstalledPacks();
  }

  async markAchievementsSeen(codes: string[]): Promise<void> {
    await this.repos.achievements.markSeen(codes);
  }

  /** Details for the achievement toast after an unlock. */
  achievementFor(code: string): Achievement | undefined {
    return achievementByCode(code);
  }

  /** Whether onboarding still needs to run (no name chosen yet). */
  async needsOnboarding(): Promise<boolean> {
    const profile = await this.repos.users.getProfile();
    return profile.name.trim().length === 0;
  }

  private async currentMetrics(userId: string): Promise<Record<string, number>> {
    const [progress, topicProgress, streak, thinking, mistakes, lessons, exams, games, activity] =
      await Promise.all([
        this.repos.progress.getProgress(userId),
        this.repos.progress.getTopicProgress(),
        this.repos.progress.getStreak(),
        this.repos.progress.getThinkingScore(),
        this.repos.mistakes.getMistakes({ includeResolved: true, limit: 500 }),
        this.repos.lessons.getCompletedLessons(),
        this.repos.exams.getExamAttempts(undefined, { limit: 200 }),
        this.repos.games.getHighScores(),
        this.repos.progress.getDailyActivity(400),
      ]);

    return {
      questions_solved: progress.questionsSolved,
      questions_correct: progress.questionsCorrect,
      streak_days: streak.currentStreak,
      lessons_completed: lessons.length,
      exams_taken: exams.length,
      topics_mastered: topicProgress.filter((t) => t.mastery >= 0.8).length,
      accuracy_percent:
        progress.questionsSolved >= 50
          ? Math.round((progress.questionsCorrect / progress.questionsSolved) * 100)
          : 0,
      daily_brain_days: activity.filter((d) => d.brainScore > 0).length,
      games_played: games.reduce((acc, g) => acc + g.playCount, 0),
      mistakes_resolved: mistakes.filter((m) => m.resolved).length,
      thinking_score: thinking.score,
      bosses_defeated: topicProgress.filter((t) => t.bossDefeatedAt).length,
    };
  }
}
