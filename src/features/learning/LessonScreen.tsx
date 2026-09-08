import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { LESSON_SECTION_LABELS } from '../../domain/models';
import type { Lesson, LessonSection } from '../../domain/models';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Column,
  Loading,
  MathText,
  ProgressBar,
  Row,
  Screen,
  Spacer,
  Txt,
  LessonVisualView,
} from '../../ui/components';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * A lesson walks through concept → visual → examples → practice → challenge →
 * mastery test, one section at a time (spec §32).
 */
export function LessonScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'Lesson'>>();
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const invalidate = useAppStore((state) => state.invalidateData);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [completed, setCompleted] = useState(false);
  const [index, setIndex] = useState(0);

  const load = useCallback(async () => {
    const found = await services.learning.getLesson(route.params.lessonId);
    setLesson(found?.lesson ?? null);
    setCompleted(found?.completed ?? false);
  }, [services, route.params.lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (lesson) {
      navigation.setOptions({ title: pickLocalized(language, lesson.title, lesson.titleBn) });
    }
  }, [lesson, navigation, language]);

  const section = useMemo<LessonSection | null>(() => lesson?.sections[index] ?? null, [lesson, index]);

  if (!lesson) return <Loading label={t('common.loading')} />;
  if (!section) {
    return (
      <Screen>
        <Txt>{t('common.error')}</Txt>
      </Screen>
    );
  }

  const total = lesson.sections.length;
  const isLast = index === total - 1;
  const meta = LESSON_SECTION_LABELS[section.kind];
  const isPracticeSection =
    section.kind === 'practice' || section.kind === 'challenge' || section.kind === 'mastery_test';

  const startPractice = (): void => {
    const isMastery = section.kind === 'mastery_test';
    navigation.navigate('PracticeRun', {
      mode: 'lesson',
      title: pickLocalized(language, meta.en, meta.bn),
      generatorIds: lesson.practiceGeneratorIds,
      topicIds: [lesson.topicId],
      count: isMastery ? 10 : section.kind === 'challenge' ? 5 : 8,
      difficulty: section.kind === 'challenge' ? 7 : undefined,
      lessonId: isMastery ? lesson.id : undefined,
    });
  };

  const finishLesson = async (): Promise<void> => {
    await services.learning.completeLesson(lesson, completed ? 1 : 0.7);
    invalidate();
    navigation.goBack();
  };

  return (
    <Screen scroll>
      <ProgressBar
        ratio={(index + 1) / total}
        label={t('learn.sectionOf', { index: index + 1, total })}
      />
      <Spacer size={4} />

      <Card accent={theme.colors.primary}>
        <Column gap={3}>
          <Row gap={2}>
            <Txt size="title">{meta.emoji}</Txt>
            <Column gap={0} style={{ flex: 1 }}>
              <Txt size="caption" color={theme.colors.textMuted}>
                {pickLocalized(language, meta.en, meta.bn)}
              </Txt>
              <Txt size="bodyLarge" weight="semibold">
                {pickLocalized(language, section.title, section.titleBn)}
              </Txt>
            </Column>
          </Row>

          <Txt size="body">{pickLocalized(language, section.body, section.bodyBn)}</Txt>

          {section.expression ? (
            <Card
              padded={false}
              style={{
                backgroundColor: theme.colors.surfaceAlt,
                padding: theme.spacing(3),
                borderWidth: 0,
              }}
            >
              <MathText align="center">{section.expression}</MathText>
            </Card>
          ) : null}

          {section.visual ? (
            <Column gap={2}>
              <LessonVisualView
                kind={section.visual.kind}
                values={section.visual.values}
                labels={section.visual.labels}
              />
              {section.visual.caption ? (
                <Txt size="caption" color={theme.colors.textMuted} align="center">
                  {pickLocalized(language, section.visual.caption, section.visual.captionBn)}
                </Txt>
              ) : null}
            </Column>
          ) : null}
        </Column>
      </Card>

      <Spacer size={4} />

      {isPracticeSection ? (
        <Button
          label={section.kind === 'mastery_test' ? t('learn.masteryTest') : t('common.start')}
          icon={section.kind === 'challenge' ? '🔥' : '✏️'}
          full
          size="lg"
          onPress={startPractice}
        />
      ) : null}

      <Spacer size={3} />

      <Row gap={3}>
        <Button
          label={t('common.back')}
          variant="secondary"
          disabled={index === 0}
          onPress={() => setIndex((value) => Math.max(0, value - 1))}
          style={{ flex: 1 }}
        />
        {isLast ? (
          <Button
            label={completed ? t('common.done') : t('learn.lessonComplete')}
            variant="success"
            onPress={finishLesson}
            style={{ flex: 1 }}
          />
        ) : (
          <Button
            label={t('common.next')}
            onPress={() => setIndex((value) => Math.min(total - 1, value + 1))}
            style={{ flex: 1 }}
          />
        )}
      </Row>

      <Spacer size={4} />

      <Row gap={2} wrap justify="center">
        {lesson.sections.map((item, itemIndex) => (
          <Badge
            key={item.kind + itemIndex}
            label={LESSON_SECTION_LABELS[item.kind].emoji}
            color={itemIndex === index ? theme.colors.primary : theme.colors.textMuted}
            soft={itemIndex !== index}
          />
        ))}
      </Row>

      {completed ? (
        <>
          <Spacer size={3} />
          <Txt size="caption" align="center" color={theme.colors.success}>
            ✓ {t('learn.lessonComplete')}
          </Txt>
        </>
      ) : null}
    </Screen>
  );
}
