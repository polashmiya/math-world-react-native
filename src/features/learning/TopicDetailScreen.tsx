import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { masteryLabel } from '../../core/adaptive-learning/masteryEngine';
import type { LessonWithState } from '../../domain/services';
import type { Skill, Topic, TopicProgress } from '../../domain/models';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Column,
  Divider,
  Loading,
  MasteryRing,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  StatTile,
  Txt,
} from '../../ui/components';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Detail {
  topic: Topic | null;
  skills: Skill[];
  lessons: LessonWithState[];
  progress?: TopicProgress;
  practiceTopicIds: string[];
  bossChallengeId?: string;
  bossUnlocked: boolean;
  bossDefeated: boolean;
  prerequisites: Topic[];
}

/** Topic detail: lessons, skills, practice entry points and the boss battle. */
export function TopicDetailScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'TopicDetail'>>();
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);
  const [detail, setDetail] = useState<Detail | null>(null);

  const load = useCallback(async () => {
    const base = await services.learning.getTopicDetail(route.params.topicId);
    const bosses = await services.challenges.listBosses();
    const boss = bosses.find((b) => b.challenge.topicId === route.params.topicId);
    const allTopics = await services.repositories.topics.getTopics();
    const prerequisites = (base.topic?.prerequisiteTopicIds ?? [])
      .map((id) => allTopics.find((topic) => topic.id === id))
      .filter((topic): topic is Topic => !!topic);

    setDetail({
      ...base,
      bossChallengeId: boss?.challenge.id,
      bossUnlocked: boss?.unlocked ?? false,
      bossDefeated: boss?.defeated ?? false,
      prerequisites,
    });
  }, [services, route.params.topicId]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  useEffect(() => {
    if (detail?.topic) {
      navigation.setOptions({
        title: pickLocalized(language, detail.topic.name, detail.topic.nameBn),
      });
    }
  }, [detail, navigation, language]);

  if (!detail) return <Loading label={t('common.loading')} />;
  if (!detail.topic) {
    return (
      <Screen>
        <Txt>{t('common.error')}</Txt>
      </Screen>
    );
  }

  const { topic, progress } = detail;
  const accent = theme.colors.topic[topic.colorKey];
  const mastery = progress?.mastery ?? 0;
  const label = masteryLabel(mastery, progress?.attempts ?? 0);
  const accuracy = progress && progress.attempts > 0 ? progress.correct / progress.attempts : 0;

  return (
    <Screen scroll>
      <Card accent={accent}>
        <Row gap={4}>
          <Txt size="display">{topic.emoji}</Txt>
          <Column gap={1} style={{ flex: 1 }}>
            <Txt size="title" weight="bold">
              {pickLocalized(language, topic.name, topic.nameBn)}
            </Txt>
            <Txt size="small" color={theme.colors.textMuted}>
              {pickLocalized(language, topic.description ?? '', topic.descriptionBn ?? '')}
            </Txt>
          </Column>
          <MasteryRing ratio={mastery} size={64} />
        </Row>
        <Spacer size={3} />
        <Row gap={2} wrap>
          <Badge label={pickLocalized(language, label.en, label.bn)} color={accent} />
          <Badge label={t('common.difficulty') + ' ' + topic.baseDifficulty} />
        </Row>
      </Card>

      <Spacer size={4} />

      {detail.prerequisites.length > 0 && mastery < 0.4 ? (
        <>
          <Card style={{ borderColor: theme.colors.warning }}>
            <Column gap={2}>
              <Txt size="small" weight="semibold" color={theme.colors.warning}>
                {t('learn.prerequisites')}
              </Txt>
              <Row gap={2} wrap>
                {detail.prerequisites.map((prerequisite) => (
                  <Button
                    key={prerequisite.id}
                    label={
                      prerequisite.emoji + ' ' + pickLocalized(language, prerequisite.name, prerequisite.nameBn)
                    }
                    size="sm"
                    variant="secondary"
                    onPress={() => navigation.push('TopicDetail', { topicId: prerequisite.id })}
                  />
                ))}
              </Row>
            </Column>
          </Card>
          <Spacer size={4} />
        </>
      ) : null}

      <Button
        label={t('learn.practiceTopic')}
        icon="✏️"
        full
        size="lg"
        onPress={() =>
          navigation.navigate('PracticeRun', {
            mode: 'practice',
            title: pickLocalized(language, topic.name, topic.nameBn),
            topicIds: detail.practiceTopicIds,
            count: 10,
          })
        }
      />

      <Spacer size={4} />

      {progress && progress.attempts > 0 ? (
        <>
          <Row gap={3} wrap>
            <StatTile label={t('common.questions')} value={String(progress.attempts)} emoji="📝" />
            <StatTile label={t('common.accuracy')} value={Math.round(accuracy * 100) + '%'} emoji="🎯" />
            <StatTile label={t('learn.mastery')} value={Math.round(mastery * 100) + '%'} emoji="🏅" />
          </Row>
          <Spacer size={4} />
        </>
      ) : null}

      <SectionHeader title={t('learn.lessons')} emoji="📖" />
      {detail.lessons.length === 0 ? (
        <Card>
          <Txt size="small" color={theme.colors.textMuted}>
            {t('learn.noLessons')}
          </Txt>
        </Card>
      ) : (
        <Column gap={2}>
          {detail.lessons.map(({ lesson, completed, masteryScore }) => (
            <Card
              key={lesson.id}
              onPress={() => navigation.navigate('Lesson', { lessonId: lesson.id })}
              padded={false}
              style={{ padding: theme.spacing(3) }}
            >
              <Row gap={3}>
                <Txt size="title">{completed ? '✅' : '📖'}</Txt>
                <Column gap={1} style={{ flex: 1 }}>
                  <Txt size="body" weight="semibold">
                    {pickLocalized(language, lesson.title, lesson.titleBn)}
                  </Txt>
                  <Txt size="caption" color={theme.colors.textMuted} numberOfLines={2}>
                    {pickLocalized(language, lesson.summary, lesson.summaryBn)}
                  </Txt>
                  <Txt size="caption" color={theme.colors.textMuted}>
                    {lesson.estimatedMinutes} {t('common.minutes')}
                  </Txt>
                  {completed && masteryScore !== undefined ? (
                    <ProgressBar ratio={masteryScore} height={5} color={theme.colors.success} />
                  ) : null}
                </Column>
              </Row>
            </Card>
          ))}
        </Column>
      )}

      <Spacer size={4} />

      {detail.skills.length > 0 ? (
        <>
          <SectionHeader title={t('learn.skills')} emoji="🎯" />
          <Card>
            <Column gap={2}>
              {detail.skills.map((skill, index) => (
                <View key={skill.id}>
                  {index > 0 ? <Divider /> : null}
                  <Row justify="space-between" style={{ paddingVertical: theme.spacing(2) }}>
                    <Txt size="small" style={{ flex: 1 }}>
                      {pickLocalized(language, skill.name, skill.nameBn)}
                    </Txt>
                    <Button
                      label={t('common.start')}
                      size="sm"
                      variant="ghost"
                      onPress={() =>
                        navigation.navigate('PracticeRun', {
                          mode: 'practice',
                          title: pickLocalized(language, skill.name, skill.nameBn),
                          skillIds: [skill.id],
                          count: 8,
                        })
                      }
                    />
                  </Row>
                </View>
              ))}
            </Column>
          </Card>
          <Spacer size={4} />
        </>
      ) : null}

      {detail.bossChallengeId ? (
        <Card accent={theme.colors.topic.rose} disabled={!detail.bossUnlocked}>
          <Row justify="space-between">
            <Column gap={1} style={{ flex: 1 }}>
              <Txt size="body" weight="semibold">
                👾 {t('learn.bossBattle')}
              </Txt>
              <Txt size="caption" color={theme.colors.textMuted}>
                {detail.bossDefeated
                  ? t('challenges.defeated')
                  : detail.bossUnlocked
                    ? '10 ' + t('common.questions')
                    : t('challenges.requiresMastery', { percent: '50%' })}
              </Txt>
            </Column>
            <Button
              label={detail.bossDefeated ? t('common.retry') : t('common.start')}
              size="sm"
              variant={detail.bossDefeated ? 'secondary' : 'primary'}
              disabled={!detail.bossUnlocked}
              onPress={() => navigation.navigate('BossBattle', { challengeId: detail.bossChallengeId! })}
            />
          </Row>
        </Card>
      ) : null}
    </Screen>
  );
}
