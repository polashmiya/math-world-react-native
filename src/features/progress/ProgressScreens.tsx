import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { THINKING_DIMENSION_LABELS, type ThinkingDimension } from '../../core/constants/categories';
import { formatDuration } from '../../core/utils/date';
import type { DashboardSummary, StudyGoal } from '../../domain/models';
import type { AchievementView, StudyPlanBlock } from '../../domain/services';
import { levelProgress } from '../../domain/rules/xp';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  BarChart,
  Button,
  Card,
  Column,
  EmptyState,
  Loading,
  MasteryRing,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  StatTile,
  Stepper,
  Txt,
} from '../../ui/components';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** The progress dashboard (spec §36) plus the thinking score (spec §30). */
export function ProgressScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [thinking, setThinking] = useState<Awaited<ReturnType<typeof services.progress.getThinkingProfile>> | null>(
    null,
  );
  const [goals, setGoals] = useState<StudyGoal[]>([]);

  const load = useCallback(async () => {
    const [summary, profile, goalList] = await Promise.all([
      services.progress.getDashboard(),
      services.progress.getThinkingProfile(),
      services.progress.refreshGoalProgress(),
    ]);
    setDashboard(summary);
    setThinking(profile);
    setGoals(goalList);
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  useEffect(() => {
    navigation.setOptions({ title: t('progress.title') });
  }, [navigation, t]);

  if (!dashboard || !thinking) return <Loading label={t('common.loading')} />;

  const level = levelProgress(dashboard.xp);

  return (
    <Screen scroll>
      <Card accent={theme.colors.primary}>
        <Row justify="space-between" align="flex-start">
          <Column gap={2} style={{ flex: 1 }}>
            <Txt size="caption" color={theme.colors.textMuted}>
              {t('common.level')} {level.level} · {dashboard.tier.toUpperCase()}
            </Txt>
            <ProgressBar
              ratio={level.ratio}
              label={level.into + ' / ' + level.needed + ' ' + t('common.xp')}
              height={10}
            />
            <Row gap={2} wrap>
              <Badge label={'🪙 ' + dashboard.coins} color={theme.colors.accent} />
              <Badge label={'🔥 ' + dashboard.currentStreak} color={theme.colors.danger} />
            </Row>
          </Column>
          <MasteryRing ratio={dashboard.overallMastery} size={74} />
        </Row>
      </Card>

      <Spacer size={4} />

      <Row gap={3} wrap>
        <StatTile label={t('progress.questionsSolved')} value={String(dashboard.questionsSolved)} emoji="✅" />
        <StatTile label={t('common.accuracy')} value={Math.round(dashboard.accuracy * 100) + '%'} emoji="🎯" />
        <StatTile label={t('progress.topicsMastered')} value={String(dashboard.topicsMastered)} emoji="🏅" />
        <StatTile
          label={t('progress.averageSpeed')}
          value={dashboard.averageSpeedMs > 0 ? formatDuration(dashboard.averageSpeedMs) : '—'}
          emoji="⏱️"
        />
        <StatTile label={t('progress.longestStreak')} value={String(dashboard.longestStreak)} emoji="📅" />
        <StatTile
          label={t('progress.examReadiness')}
          value={Math.round(dashboard.examReadiness * 100) + '%'}
          emoji="📝"
          onPress={() => navigation.navigate('Exams')}
        />
      </Row>

      <Spacer size={4} />

      <SectionHeader title={t('progress.last7Days')} emoji="📈" />
      <Card>
        <BarChart
          data={dashboard.last7Days.map((day) => ({
            label: day.day.slice(5),
            value: day.questionsAnswered,
            color: day.goalMet ? theme.colors.success : theme.colors.primary,
          }))}
          height={130}
        />
      </Card>

      <Spacer size={4} />

      <SectionHeader title={t('progress.thinkingScore')} emoji="💡" />
      <Card accent={theme.colors.topic.violet}>
        <Column gap={3}>
          <Row justify="space-between">
            <Column gap={1}>
              <Txt size="display" weight="bold" color={theme.colors.topic.violet}>
                {thinking.score}
              </Txt>
              <Badge
                label={pickLocalized(language, thinking.band.en, thinking.band.bn)}
                color={theme.colors.topic.violet}
              />
            </Column>
            <Txt size="caption" color={theme.colors.textMuted} style={{ flex: 1, textAlign: 'right' }}>
              {t('progress.thinkingNote')}
            </Txt>
          </Row>
          <Column gap={2}>
            {thinking.dimensions.map((dimension) => {
              const meta = THINKING_DIMENSION_LABELS[dimension.key as ThinkingDimension];
              return (
                <Column key={dimension.key} gap={1}>
                  <Row justify="space-between">
                    <Txt size="small">{meta ? pickLocalized(language, meta.en, meta.bn) : dimension.key}</Txt>
                    <Txt size="caption" color={theme.colors.textMuted}>
                      {dimension.value}
                    </Txt>
                  </Row>
                  <ProgressBar ratio={dimension.value / 1000} height={6} color={theme.colors.topic.violet} />
                </Column>
              );
            })}
          </Column>
        </Column>
      </Card>

      <Spacer size={4} />

      {dashboard.weakTopics.length > 0 ? (
        <>
          <SectionHeader title={t('progress.weakTopics')} emoji="⚠️" />
          <Column gap={2}>
            {dashboard.weakTopics.map((topic) => (
              <Card
                key={topic.topicId}
                padded={false}
                style={{ padding: theme.spacing(3) }}
                onPress={() => navigation.navigate('TopicDetail', { topicId: topic.topicId })}
              >
                <Row justify="space-between">
                  <Row gap={2} style={{ flex: 1 }}>
                    <Txt size="bodyLarge">{topic.emoji}</Txt>
                    <Column gap={1} style={{ flex: 1 }}>
                      <Txt size="small" weight="semibold">
                        {pickLocalized(language, topic.topicName, topic.topicNameBn)}
                      </Txt>
                      <ProgressBar ratio={topic.mastery} height={5} color={theme.colors.warning} />
                    </Column>
                  </Row>
                  <Txt size="caption" color={theme.colors.textMuted}>
                    {Math.round(topic.mastery * 100)}%
                  </Txt>
                </Row>
              </Card>
            ))}
          </Column>
          <Spacer size={4} />
        </>
      ) : null}

      {dashboard.strongTopics.length > 0 ? (
        <>
          <SectionHeader title={t('progress.strongTopics')} emoji="💪" />
          <Card>
            <Column gap={2}>
              {dashboard.strongTopics.map((topic) => (
                <Row key={topic.topicId} justify="space-between">
                  <Txt size="small">
                    {topic.emoji} {pickLocalized(language, topic.topicName, topic.topicNameBn)}
                  </Txt>
                  <Txt size="small" color={theme.colors.success}>
                    {Math.round(topic.mastery * 100)}%
                  </Txt>
                </Row>
              ))}
            </Column>
          </Card>
          <Spacer size={4} />
        </>
      ) : null}

      <SectionHeader title={t('progress.goals')} emoji="🎯" />
      <Card>
        <Column gap={3}>
          {goals.map((goal) => (
            <Column key={goal.id} gap={1}>
              <Row justify="space-between">
                <Txt size="small">
                  {goal.kind === 'daily_questions'
                    ? t('profile.dailyQuestions')
                    : goal.kind === 'daily_minutes'
                      ? t('profile.dailyMinutes')
                      : goal.kind}
                </Txt>
                <Txt size="caption" color={theme.colors.textMuted}>
                  {goal.progress} / {goal.target}
                </Txt>
              </Row>
              <ProgressBar
                ratio={goal.progress / Math.max(1, goal.target)}
                height={6}
                color={goal.progress >= goal.target ? theme.colors.success : theme.colors.primary}
              />
            </Column>
          ))}
        </Column>
      </Card>

      <Spacer size={4} />

      <Column gap={3}>
        <Button
          label={t('progress.studyPlan')}
          icon="🗓️"
          variant="secondary"
          full
          onPress={() => navigation.navigate('StudyPlan')}
        />
        <Button
          label={t('progress.achievements')}
          icon="🏆"
          variant="secondary"
          full
          onPress={() => navigation.navigate('Achievements')}
        />
        <Button
          label={t('progress.mistakeBank')}
          icon="🛠️"
          variant="secondary"
          full
          onPress={() => navigation.navigate('Mistakes')}
        />
      </Column>
    </Screen>
  );
}

/** The adaptive study planner (spec §40). */
export function StudyPlanScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';

  const [minutes, setMinutes] = useState(30);
  const [plan, setPlan] = useState<StudyPlanBlock[] | null>(null);

  const load = useCallback(async () => {
    setPlan(await services.progress.getStudyPlan(minutes));
  }, [services, minutes]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    navigation.setOptions({ title: t('progress.studyPlan') });
  }, [navigation, t]);

  if (!plan) return <Loading label={t('common.loading')} />;

  const open = (block: StudyPlanBlock): void => {
    switch (block.kind) {
      case 'learn':
        if (block.topicId) navigation.navigate('TopicDetail', { topicId: block.topicId });
        else navigation.navigate('Tabs', { screen: 'Learn' });
        break;
      case 'practice':
        navigation.navigate('PracticeRun', {
          mode: 'practice',
          title: pickLocalized(language, block.label.en, block.label.bn),
          topicIds: block.topicId ? [block.topicId] : undefined,
          count: Math.max(5, Math.round(block.minutes)),
        });
        break;
      case 'mistakes':
        navigation.navigate('Mistakes');
        break;
      case 'brain':
        navigation.navigate('Tabs', { screen: 'Brain' });
        break;
      case 'exam':
        navigation.navigate('Exams');
        break;
      default:
        break;
    }
  };

  return (
    <Screen scroll>
      <Card>
        <Stepper
          label={t('progress.availableMinutes')}
          value={minutes}
          onChange={setMinutes}
          min={10}
          max={180}
          step={10}
          suffix={t('common.minutes')}
        />
      </Card>

      <Spacer size={4} />

      <Column gap={2}>
        {plan.map((block, index) => (
          <Card
            key={block.kind + index}
            accent={theme.colors.primary}
            padded={false}
            style={{ padding: theme.spacing(3) }}
            onPress={() => open(block)}
          >
            <Row justify="space-between">
              <Column gap={1} style={{ flex: 1 }}>
                <Txt size="body" weight="semibold">
                  {pickLocalized(language, block.label.en, block.label.bn)}
                </Txt>
                <Txt size="caption" color={theme.colors.textMuted}>
                  {pickLocalized(language, block.detail.en, block.detail.bn)}
                </Txt>
              </Column>
              <Badge label={block.minutes + ' ' + t('common.minutes')} color={theme.colors.primary} />
            </Row>
          </Card>
        ))}
      </Column>
    </Screen>
  );
}

/** Achievements with progress towards the locked ones (spec §33). */
export function AchievementsScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);
  const [views, setViews] = useState<AchievementView[] | null>(null);

  const load = useCallback(async () => {
    const overview = await services.profile.getOverview();
    setViews(overview.achievements);
    if (overview.unseenAchievementCodes.length > 0) {
      await services.profile.markAchievementsSeen(overview.unseenAchievementCodes);
    }
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  useEffect(() => {
    navigation.setOptions({ title: t('progress.achievements') });
  }, [navigation, t]);

  if (!views) return <Loading label={t('common.loading')} />;
  if (views.length === 0) return <EmptyState title={t('common.empty')} />;

  const unlocked = views.filter((view) => view.unlocked);
  const locked = views.filter((view) => !view.unlocked);

  const renderView = (view: AchievementView): React.JSX.Element => (
    <Card
      key={view.achievement.id}
      padded={false}
      style={{ padding: theme.spacing(3) }}
      accent={view.unlocked ? theme.colors.success : undefined}
    >
      <Row gap={3}>
        <Txt size="title">{view.unlocked ? view.achievement.emoji : '🔒'}</Txt>
        <Column gap={1} style={{ flex: 1 }}>
          <Txt size="body" weight="semibold">
            {pickLocalized(language, view.achievement.name, view.achievement.nameBn)}
          </Txt>
          <Txt size="caption" color={theme.colors.textMuted}>
            {pickLocalized(language, view.achievement.description, view.achievement.descriptionBn)}
          </Txt>
          {!view.unlocked ? (
            <>
              <ProgressBar ratio={view.ratio} height={5} />
              <Txt size="caption" color={theme.colors.textMuted}>
                {view.progress} / {view.target}
              </Txt>
            </>
          ) : (
            <Badge label={'+' + view.achievement.xpReward + ' ' + t('common.xp')} color={theme.colors.accent} />
          )}
        </Column>
      </Row>
    </Card>
  );

  return (
    <Screen scroll>
      <SectionHeader title={t('common.unlocked') + ' (' + unlocked.length + ')'} emoji="🏆" />
      {unlocked.length === 0 ? (
        <Card>
          <Txt size="small" color={theme.colors.textMuted}>
            {t('common.empty')}
          </Txt>
        </Card>
      ) : (
        <Column gap={2}>{unlocked.map(renderView)}</Column>
      )}

      <Spacer size={4} />
      <SectionHeader title={t('common.locked') + ' (' + locked.length + ')'} emoji="🔒" />
      <Column gap={2}>{locked.map(renderView)}</Column>
    </Screen>
  );
}
