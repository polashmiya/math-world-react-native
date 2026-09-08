import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { greetingKey } from '../../core/utils/date';
import { formatDuration } from '../../core/utils/date';
import type { DashboardSummary, Lesson, StudyGoal, Topic } from '../../domain/models';
import type { MissionEntry } from '../../domain/services';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Column,
  FadeInView,
  Loading,
  MasteryRing,
  ProgressBar,
  Pulse,
  Row,
  SectionHeader,
  Spacer,
  StatTile,
  Txt,
} from '../../ui/components';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface HomeData {
  dashboard: DashboardSummary;
  continueTarget: { topic: Topic; lesson?: Lesson } | null;
  dailyTotal: number;
  dailyDone: number;
  missions: MissionEntry[];
  goals: StudyGoal[];
  dueReviews: number;
  openMistakes: number;
}

/** The home dashboard (spec §48). Everything here is one tap from action. */
export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, profile, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);

  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const now = Date.now();
    const [dashboard, continueTarget, daily, missions, goals, dueReviews, mistakes] = await Promise.all([
      services.progress.getDashboard(now),
      services.learning.getContinueTarget(),
      services.dailyBrain.getTodaySet(now),
      services.challenges.getMissions(now),
      services.progress.refreshGoalProgress(now),
      services.repositories.reviews.countDue(now),
      services.repositories.mistakes.getMistakes({ limit: 200 }),
    ]);
    setData({
      dashboard,
      continueTarget,
      dailyTotal: daily.totalQuestions,
      dailyDone: daily.completedToday,
      missions: missions.filter((m) => m.challenge?.kind === 'daily_mission'),
      goals,
      dueReviews,
      openMistakes: mistakes.length,
    });
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Loading label={t('common.loading')} />
      </SafeAreaView>
    );
  }

  const { dashboard, continueTarget } = data;
  const dailyGoal = data.goals.find((g) => g.kind === 'daily_questions');
  const weakTopic = dashboard.weakTopics[0];
  const name = profile?.name?.trim();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: theme.spacing(10) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Greeting and streak */}
        <FadeInView>
          <Row justify="space-between" align="flex-start">
            <View style={{ flex: 1 }}>
              <Txt size="small" color={theme.colors.textMuted}>
                {t(('greeting.' + greetingKey()) as 'greeting.morning')} 👋
              </Txt>
              <Txt size="heading" weight="bold">
                {name && name.length > 0 ? name : t('common.appName')}
              </Txt>
            </View>
            <Card padded={false} style={{ paddingHorizontal: theme.spacing(3), paddingVertical: theme.spacing(2) }}>
              <Row gap={1}>
                {dashboard.currentStreak > 0 ? (
                  <Pulse>
                    <Txt size="bodyLarge">🔥</Txt>
                  </Pulse>
                ) : (
                  <Txt size="bodyLarge">🔥</Txt>
                )}
                <Txt size="bodyLarge" weight="bold">
                  {dashboard.currentStreak}
                </Txt>
              </Row>
            </Card>
          </Row>
        </FadeInView>

        <Spacer size={4} />

        {/* Today's goal */}
        <FadeInView delay={60}>
          <Card accent={theme.colors.primary}>
            <Column gap={3}>
              <Row justify="space-between">
                <Txt size="body" weight="semibold">
                  {t('home.goalToday')}
                </Txt>
                <Badge
                  label={
                    dashboard.currentStreak > 0
                      ? t('home.streakDays', { count: dashboard.currentStreak })
                      : t('home.startStreak')
                  }
                  color={theme.colors.accent}
                />
              </Row>
              <ProgressBar
                ratio={dailyGoal ? dailyGoal.progress / Math.max(1, dailyGoal.target) : 0}
                label={t('home.questionsToday', {
                  done: dailyGoal?.progress ?? 0,
                  target: dailyGoal?.target ?? 20,
                })}
                height={10}
              />
            </Column>
          </Card>
        </FadeInView>

        <Spacer size={4} />

        {/* Continue learning */}
        {continueTarget ? (
          <FadeInView delay={120}>
            <Card
              accent={theme.colors.topic[continueTarget.topic.colorKey]}
              onPress={() =>
                continueTarget.lesson
                  ? navigation.navigate('Lesson', { lessonId: continueTarget.lesson.id })
                  : navigation.navigate('TopicDetail', { topicId: continueTarget.topic.id })
              }
            >
              <Row justify="space-between">
                <Column gap={1} style={{ flex: 1 }}>
                  <Txt size="caption" color={theme.colors.textMuted}>
                    {t('home.continueLearning')}
                  </Txt>
                  <Txt size="bodyLarge" weight="semibold">
                    {continueTarget.topic.emoji}{' '}
                    {pickLocalized(language, continueTarget.topic.name, continueTarget.topic.nameBn)}
                  </Txt>
                  {continueTarget.lesson ? (
                    <Txt size="small" color={theme.colors.textMuted} numberOfLines={2}>
                      {pickLocalized(language, continueTarget.lesson.title, continueTarget.lesson.titleBn)}
                    </Txt>
                  ) : null}
                </Column>
                <Txt size="heading">▶</Txt>
              </Row>
            </Card>
          </FadeInView>
        ) : null}

        <Spacer size={4} />

        {/* Today's Math */}
        <FadeInView delay={160}>
          <Card
            accent={theme.colors.topic.violet}
            onPress={() => navigation.navigate('Tabs', { screen: 'Brain' })}
          >
            <Row justify="space-between">
              <Column gap={1} style={{ flex: 1 }}>
                <Txt size="caption" color={theme.colors.textMuted}>
                  {t('home.dailyMath')}
                </Txt>
                <Txt size="bodyLarge" weight="semibold">
                  🧠 {data.dailyTotal} {t('common.questions')}
                </Txt>
                <ProgressBar
                  ratio={data.dailyTotal === 0 ? 0 : data.dailyDone / data.dailyTotal}
                  color={theme.colors.topic.violet}
                />
              </Column>
            </Row>
          </Card>
        </FadeInView>

        <Spacer size={4} />

        {/* Quick start */}
        <SectionHeader title={t('home.quickStart')} emoji="⚡" />
        <FadeInView delay={200}>
          <Row gap={3} wrap>
            <QuickAction
              label={t('practice.title')}
              emoji="✏️"
              onPress={() =>
                navigation.navigate('PracticeRun', { mode: 'practice', title: t('practice.quickPractice'), count: 10 })
              }
            />
            <QuickAction
              label={t('brain.title')}
              emoji="🧠"
              onPress={() => navigation.navigate('Tabs', { screen: 'Brain' })}
            />
            <QuickAction label={t('exams.title')} emoji="📝" onPress={() => navigation.navigate('Exams')} />
            <QuickAction label={t('solver.title')} emoji="🧮" onPress={() => navigation.navigate('Solver')} />
          </Row>
        </FadeInView>

        <Spacer size={4} />

        {/* Daily mission */}
        {data.missions.length > 0 ? (
          <>
            <SectionHeader
              title={t('home.dailyMission')}
              emoji="🎯"
              action={t('common.seeAll')}
              onAction={() => navigation.navigate('Challenges')}
            />
            <Column gap={2}>
              {data.missions.slice(0, 3).map(({ mission, challenge }) => (
                <Card key={mission.id} padded={false} style={{ padding: theme.spacing(3) }}>
                  <Row justify="space-between">
                    <Column gap={1} style={{ flex: 1 }}>
                      <Txt size="small" weight="medium">
                        {mission.completed ? '✓ ' : ''}
                        {challenge
                          ? pickLocalized(language, challenge.name, challenge.nameBn)
                          : mission.code}
                      </Txt>
                      <ProgressBar
                        ratio={mission.progress / Math.max(1, mission.target)}
                        height={6}
                        color={mission.completed ? theme.colors.success : theme.colors.primary}
                      />
                    </Column>
                    <Txt size="caption" color={theme.colors.textMuted}>
                      {mission.progress}/{mission.target}
                    </Txt>
                  </Row>
                </Card>
              ))}
            </Column>
            <Spacer size={4} />
          </>
        ) : null}

        {/* Weak topic and review */}
        <Row gap={3} wrap>
          <Card
            style={{ flex: 1, minWidth: 150 }}
            onPress={
              weakTopic ? () => navigation.navigate('TopicDetail', { topicId: weakTopic.topicId }) : undefined
            }
          >
            <Column gap={2}>
              <Txt size="caption" color={theme.colors.textMuted}>
                {t('home.weakTopic')}
              </Txt>
              {weakTopic ? (
                <>
                  <Txt size="body" weight="semibold" numberOfLines={1}>
                    {weakTopic.emoji} {pickLocalized(language, weakTopic.topicName, weakTopic.topicNameBn)}
                  </Txt>
                  <MasteryRing ratio={weakTopic.mastery} size={52} />
                </>
              ) : (
                <Txt size="small" color={theme.colors.textMuted}>
                  {t('home.noWeakTopic')}
                </Txt>
              )}
            </Column>
          </Card>

          <Card style={{ flex: 1, minWidth: 150 }} onPress={() => navigation.navigate('Revision')}>
            <Column gap={2}>
              <Txt size="caption" color={theme.colors.textMuted}>
                {t('practice.revision')}
              </Txt>
              <Txt size="title" weight="bold" color={data.dueReviews > 0 ? theme.colors.accent : theme.colors.textMuted}>
                {data.dueReviews}
              </Txt>
              <Txt size="caption" color={theme.colors.textMuted}>
                {t('home.reviewDue', { count: data.dueReviews })}
              </Txt>
            </Column>
          </Card>
        </Row>

        <Spacer size={4} />

        {/* Key stats */}
        <SectionHeader
          title={t('progress.title')}
          emoji="📊"
          action={t('common.seeAll')}
          onAction={() => navigation.navigate('Progress')}
        />
        <FadeInView delay={280}>
          <Row gap={3} wrap>
            <StatTile
              label={t('progress.questionsSolved')}
              value={String(dashboard.questionsSolved)}
              emoji="✅"
              color={theme.colors.success}
            />
            <StatTile
              label={t('common.accuracy')}
              value={Math.round(dashboard.accuracy * 100) + '%'}
              emoji="🎯"
              color={theme.colors.topic.blue}
            />
            <StatTile
              label={t('home.thinkingScore')}
              value={String(dashboard.thinkingScore)}
              emoji="💡"
              color={theme.colors.topic.violet}
              onPress={() => navigation.navigate('Progress')}
            />
            <StatTile
              label={t('progress.averageSpeed')}
              value={dashboard.averageSpeedMs > 0 ? formatDuration(dashboard.averageSpeedMs) : '—'}
              emoji="⏱️"
              color={theme.colors.topic.orange}
            />
          </Row>
        </FadeInView>

        {data.openMistakes > 0 ? (
          <>
            <Spacer size={4} />
            <Button
              label={t('mistakes.count', { count: data.openMistakes })}
              icon="🛠️"
              variant="secondary"
              full
              onPress={() => navigation.navigate('Mistakes')}
            />
          </>
        ) : null}

        <Spacer size={4} />
        <Txt size="caption" color={theme.colors.textMuted} align="center">
          {t('common.offline')}
        </Txt>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  label,
  emoji,
  onPress,
}: {
  label: string;
  emoji: string;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={label}
      style={{ flex: 1, minWidth: 140, alignItems: 'center' }}
    >
      <Column gap={1} style={{ alignItems: 'center' }}>
        <Txt size="heading">{emoji}</Txt>
        <Txt size="small" weight="semibold" align="center">
          {label}
        </Txt>
      </Column>
    </Card>
  );
}
