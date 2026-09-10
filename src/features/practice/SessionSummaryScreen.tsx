import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { formatDuration } from '../../core/utils/date';
import {
  Button,
  Card,
  Celebration,
  Column,
  FadeInView,
  MasteryRing,
  Row,
  Screen,
  Spacer,
  StatTile,
  Txt,
} from '../../ui/components';
import { useSound } from '../../ui/sound';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Shown after any practice run: accuracy, XP and what to do next. */
export function SessionSummaryScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'SessionSummary'>>();
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t } = useApp();
  const { play } = useSound();
  const invalidate = useAppStore((state) => state.invalidateData);
  const [savedLesson, setSavedLesson] = useState(false);
  const announced = useRef(false);

  const { answered, correct, xp, bestStreak, averageTimeMs, title, lessonId } = route.params;
  const accuracy = answered === 0 ? 0 : correct / answered;

  useEffect(() => {
    navigation.setOptions({ title: t('practice.sessionComplete') });
  }, [navigation, t]);

  // The payoff chime. A clean run gets the longer one — the whole point of the
  // sparkle is that it is rare enough to be worth chasing.
  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    play(answered > 0 && correct === answered ? 'perfect' : 'complete');
  }, [answered, correct, play]);

  // A mastery test that passes marks the lesson complete.
  useEffect(() => {
    const run = async (): Promise<void> => {
      if (!lessonId || savedLesson) return;
      if (accuracy < 0.8) return;
      const found = await services.learning.getLesson(lessonId);
      if (!found) return;
      await services.learning.completeLesson(found.lesson, accuracy);
      setSavedLesson(true);
      play('unlock');
      invalidate();
    };
    void run();
  }, [lessonId, accuracy, services, savedLesson, invalidate, play]);

  const message =
    accuracy >= 0.9
      ? '🌟'
      : accuracy >= 0.7
        ? '👍'
        : accuracy >= 0.5
          ? '💪'
          : '🌱';

  return (
    <Screen scroll>
      <FadeInView>
        <Card accent={theme.colors.primary}>
          <Column gap={3} style={{ alignItems: 'center' }}>
            {accuracy >= 0.7 ? <Celebration count={20} /> : null}
            <Txt size="display">{message}</Txt>
            <Txt size="title" weight="bold">
              {t('practice.sessionComplete')}
            </Txt>
            <Txt size="small" color={theme.colors.textMuted}>
              {title}
            </Txt>
            <MasteryRing ratio={accuracy} size={96} thickness={9} />
            <Txt size="bodyLarge" weight="semibold" color={theme.colors.accent}>
              {t('practice.xpEarned', { xp })}
            </Txt>
          </Column>
        </Card>
      </FadeInView>

      <Spacer size={4} />

      <FadeInView delay={120}>
        <Row gap={3} wrap>
          <StatTile
            label={t('common.correct')}
            value={correct + ' / ' + answered}
            emoji="✅"
            color={theme.colors.success}
          />
          <StatTile
            label={t('common.accuracy')}
            value={Math.round(accuracy * 100) + '%'}
            emoji="🎯"
            color={theme.colors.topic.blue}
          />
          <StatTile
            label={t('progress.averageSpeed')}
            value={averageTimeMs > 0 ? formatDuration(averageTimeMs) : '—'}
            emoji="⏱️"
            color={theme.colors.topic.teal}
          />
          <StatTile
            label={t('common.streak')}
            value={String(bestStreak)}
            emoji="🔥"
            color={theme.colors.accent}
          />
        </Row>
      </FadeInView>

      {savedLesson ? (
        <>
          <Spacer size={4} />
          <Card style={{ backgroundColor: theme.colors.successSoft, borderWidth: 0 }}>
            <Txt size="small" color={theme.colors.success}>
              ✓ {t('learn.lessonComplete')}
            </Txt>
          </Card>
        </>
      ) : null}

      <Spacer size={5} />

      <Column gap={3}>
        <Button
          label={t('practice.keepGoing')}
          icon="▶"
          full
          size="lg"
          sound="start"
          onPress={() =>
            navigation.replace('PracticeRun', {
              mode: 'practice',
              title: t('practice.quickPractice'),
              count: 10,
            })
          }
        />
        <Button
          label={t('common.done')}
          variant="secondary"
          full
          onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
        />
      </Column>
    </Screen>
  );
}
