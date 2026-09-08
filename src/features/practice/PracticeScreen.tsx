import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { DIFFICULTY_BANDS, type DifficultyBand } from '../../core/constants/difficulty';
import type { Topic } from '../../domain/models';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  ChipRow,
  Column,
  Loading,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  Stepper,
  Txt,
} from '../../ui/components';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DifficultyChoice = 'adaptive' | DifficultyBand;

/** Practice hub: quick practice, per-topic practice, mistakes and revision. */
export function PracticeScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);

  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<DifficultyChoice>('adaptive');

  const load = useCallback(async () => {
    const [allTopics, mistakes, due, bookmarks] = await Promise.all([
      services.repositories.topics.getTopics(),
      services.repositories.mistakes.getMistakes({ limit: 300 }),
      services.repositories.reviews.countDue(Date.now()),
      services.repositories.bookmarks.getBookmarks('question'),
    ]);
    // Only leaf-ish topics make good practice targets.
    const parentIds = new Set(allTopics.map((topic) => topic.parentId).filter(Boolean) as string[]);
    setTopics(allTopics.filter((topic) => !parentIds.has(topic.id) || topic.parentId !== null));
    setMistakeCount(mistakes.length);
    setDueCount(due);
    setBookmarkCount(bookmarks.length);
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  if (!topics) return <Loading label={t('common.loading')} />;

  const difficultyValue = difficulty === 'adaptive' ? undefined : DIFFICULTY_BANDS.indexOf(difficulty) + 1;

  const startQuick = (topicIds?: string[], title?: string): void => {
    navigation.navigate('PracticeRun', {
      mode: 'practice',
      title: title ?? t('practice.quickPractice'),
      count,
      topicIds,
      difficulty: difficultyValue,
    });
  };

  return (
    <Screen scroll>
      <SectionHeader title={t('practice.quickPractice')} emoji="⚡" />
      <Card>
        <Column gap={3}>
          <Stepper
            label={t('common.questions')}
            value={count}
            onChange={setCount}
            min={5}
            max={40}
            step={5}
          />
          <Column gap={2}>
            <Txt size="small" color={theme.colors.textMuted}>
              {t('practice.chooseDifficulty')}
            </Txt>
            <ChipRow<DifficultyChoice>
              options={['adaptive', ...DIFFICULTY_BANDS]}
              value={difficulty}
              onChange={setDifficulty}
              labelFor={(option) =>
                option === 'adaptive' ? t('practice.adaptive') : option.replace('_', ' ')
              }
            />
          </Column>
          <Button label={t('common.start')} icon="▶" full size="lg" onPress={() => startQuick()} />
        </Column>
      </Card>

      <Spacer size={4} />

      <Row gap={3} wrap>
        <Card style={{ flex: 1, minWidth: 150 }} onPress={() => navigation.navigate('Mistakes')}>
          <Column gap={1}>
            <Txt size="title">🛠️</Txt>
            <Txt size="body" weight="semibold">
              {t('practice.mistakes')}
            </Txt>
            <Badge
              label={String(mistakeCount)}
              color={mistakeCount > 0 ? theme.colors.danger : theme.colors.textMuted}
            />
          </Column>
        </Card>
        <Card style={{ flex: 1, minWidth: 150 }} onPress={() => navigation.navigate('Revision')}>
          <Column gap={1}>
            <Txt size="title">🔁</Txt>
            <Txt size="body" weight="semibold">
              {t('practice.revision')}
            </Txt>
            <Badge
              label={String(dueCount)}
              color={dueCount > 0 ? theme.colors.accent : theme.colors.textMuted}
            />
          </Column>
        </Card>
        <Card style={{ flex: 1, minWidth: 150 }} onPress={() => navigation.navigate('Bookmarks')}>
          <Column gap={1}>
            <Txt size="title">🔖</Txt>
            <Txt size="body" weight="semibold">
              {t('practice.bookmarks')}
            </Txt>
            <Badge label={String(bookmarkCount)} color={theme.colors.info} />
          </Column>
        </Card>
        <Card style={{ flex: 1, minWidth: 150 }} onPress={() => navigation.navigate('SkillTree')}>
          <Column gap={1}>
            <Txt size="title">🌳</Txt>
            <Txt size="body" weight="semibold">
              {t('learn.skillTree')}
            </Txt>
          </Column>
        </Card>
      </Row>

      <Spacer size={4} />

      <SectionHeader title={t('practice.byTopic')} emoji="📚" />
      <Column gap={2}>
        {topics.map((topic) => (
          <Card
            key={topic.id}
            padded={false}
            style={{ padding: theme.spacing(3) }}
            accent={theme.colors.topic[topic.colorKey]}
            onPress={() => startQuick([topic.id], pickLocalized(language, topic.name, topic.nameBn))}
          >
            <Row justify="space-between">
              <Row gap={2} style={{ flex: 1 }}>
                <Txt size="bodyLarge">{topic.emoji}</Txt>
                <Txt size="body" numberOfLines={1} style={{ flex: 1 }}>
                  {pickLocalized(language, topic.name, topic.nameBn)}
                </Txt>
              </Row>
              <Txt size="small" color={theme.colors.textMuted}>
                ▶
              </Txt>
            </Row>
          </Card>
        ))}
      </Column>
    </Screen>
  );
}
