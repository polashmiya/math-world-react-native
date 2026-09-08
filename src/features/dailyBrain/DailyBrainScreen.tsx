import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { BRAIN_CATEGORY_META } from '../../core/constants/categories';
import type { BrainCategoryProgress } from '../../domain/models';
import type { DailySet } from '../../domain/services';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Column,
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

/** Daily Brain Math (spec §20): everyday thinking, personalised to weaknesses. */
export function DailyBrainScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);

  const [set, setSet] = useState<DailySet | null>(null);
  const [categories, setCategories] = useState<BrainCategoryProgress[]>([]);

  const load = useCallback(async () => {
    const [today, progress] = await Promise.all([
      services.dailyBrain.getTodaySet(),
      services.dailyBrain.getCategoryProgress(),
    ]);
    setSet(today);
    setCategories(progress);
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  if (!set) return <Loading label={t('common.loading')} />;

  const startBlock = async (index: number): Promise<void> => {
    const block = set.blocks[index];
    await services.dailyBrain.prepareBlock(block);
    navigation.navigate('PracticeRun', {
      mode: 'daily_brain',
      title: pickLocalized(language, block.label.en, block.label.bn),
      sourceIds: block.questions.map((question) => question.id),
    });
  };

  const startAll = async (): Promise<void> => {
    const ids: string[] = [];
    for (const block of set.blocks) {
      await services.dailyBrain.prepareBlock(block);
      ids.push(...block.questions.map((question) => question.id));
    }
    if (ids.length === 0) return;
    navigation.navigate('PracticeRun', {
      mode: 'daily_brain',
      title: t('brain.todaysMath'),
      sourceIds: ids,
    });
  };

  const done = set.progress >= 1;

  return (
    <Screen scroll>
      <Card accent={theme.colors.topic.violet}>
        <Column gap={3}>
          <Row justify="space-between" align="flex-start">
            <Column gap={1} style={{ flex: 1 }}>
              <Txt size="title" weight="bold">
                🧠 {t('brain.todaysMath')}
              </Txt>
              <Txt size="small" color={theme.colors.textMuted}>
                {t('brain.subtitle')}
              </Txt>
            </Column>
            <MasteryRing ratio={set.progress} size={64} />
          </Row>
          <ProgressBar
            ratio={set.progress}
            color={theme.colors.topic.violet}
            height={10}
            label={set.completedToday + ' / ' + set.totalQuestions + ' ' + t('common.questions')}
          />
          <Button
            label={done ? t('brain.allDone') : t('common.start')}
            icon={done ? '✅' : '▶'}
            full
            size="lg"
            disabled={set.blocks.length === 0}
            onPress={() => void startAll()}
          />
        </Column>
      </Card>

      <Spacer size={4} />

      <Row gap={3} wrap>
        <StatTile label={t('brain.brainScore')} value={String(set.brainScore)} emoji="⚡" />
        <StatTile label={t('common.questions')} value={String(set.totalQuestions)} emoji="🔢" />
      </Row>

      <Spacer size={4} />

      <SectionHeader title={t('brain.todaysMath')} emoji="📋" />
      <Column gap={2}>
        {set.blocks.map((block, index) => (
          <Card key={block.category} padded={false} style={{ padding: theme.spacing(3) }}>
            <Row justify="space-between">
              <Row gap={3} style={{ flex: 1 }}>
                <Txt size="title">{block.emoji}</Txt>
                <Column gap={1} style={{ flex: 1 }}>
                  <Row gap={2} wrap>
                    <Txt size="body" weight="semibold">
                      {pickLocalized(language, block.label.en, block.label.bn)}
                    </Txt>
                    {block.focused ? (
                      <Badge label={t('brain.focus')} color={theme.colors.accent} />
                    ) : null}
                  </Row>
                  <Txt size="caption" color={theme.colors.textMuted}>
                    {block.questions.length} {t('common.questions')}
                  </Txt>
                </Column>
              </Row>
              <Button label={t('brain.startBlock')} size="sm" onPress={() => void startBlock(index)} />
            </Row>
          </Card>
        ))}
      </Column>

      <Spacer size={4} />

      <SectionHeader title={t('brain.categoryProgress')} emoji="📈" />
      <Card>
        <Column gap={3}>
          {categories.map((entry) => {
            const meta = BRAIN_CATEGORY_META[entry.category];
            return (
              <Column key={entry.category} gap={1}>
                <Row justify="space-between">
                  <Txt size="small">
                    {meta.emoji} {pickLocalized(language, meta.en, meta.bn)}
                  </Txt>
                  <Txt size="caption" color={theme.colors.textMuted}>
                    {entry.attempts > 0 ? Math.round(entry.mastery * 100) + '%' : '—'}
                  </Txt>
                </Row>
                <ProgressBar ratio={entry.mastery} height={6} />
              </Column>
            );
          })}
        </Column>
      </Card>
    </Screen>
  );
}
