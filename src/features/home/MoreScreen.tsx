import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useApp, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import type { TranslationKey } from '../../i18n';
import { Card, Column, Row, Screen, SectionHeader, Spacer, Txt } from '../../ui/components';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Entry {
  route: keyof RootStackParamList;
  emoji: string;
  labelKey: TranslationKey;
  detailKey?: TranslationKey;
}

const SECTIONS: { titleKey: TranslationKey; emoji: string; entries: Entry[] }[] = [
  {
    titleKey: 'exams.title',
    emoji: '📝',
    entries: [
      { route: 'Exams', emoji: '🏛️', labelKey: 'exams.title', detailKey: 'exams.mockExam' },
      { route: 'Challenges', emoji: '👾', labelKey: 'challenges.title', detailKey: 'challenges.bosses' },
    ],
  },
  {
    titleKey: 'games.title',
    emoji: '🎮',
    entries: [
      { route: 'Games', emoji: '🎮', labelKey: 'games.title' },
      { route: 'Lab', emoji: '🔬', labelKey: 'lab.title', detailKey: 'lab.probability' },
    ],
  },
  {
    titleKey: 'solver.title',
    emoji: '🧮',
    entries: [
      { route: 'Solver', emoji: '🧮', labelKey: 'solver.title', detailKey: 'solver.subtitle' },
      { route: 'Formulas', emoji: '🧾', labelKey: 'formulas.title' },
      { route: 'Search', emoji: '🔍', labelKey: 'search.title' },
    ],
  },
  {
    titleKey: 'progress.title',
    emoji: '📊',
    entries: [
      { route: 'Progress', emoji: '📊', labelKey: 'progress.title' },
      { route: 'StudyPlan', emoji: '🗓️', labelKey: 'progress.studyPlan' },
      { route: 'Achievements', emoji: '🏆', labelKey: 'progress.achievements' },
      { route: 'Mistakes', emoji: '🛠️', labelKey: 'mistakes.title' },
      { route: 'Revision', emoji: '🔁', labelKey: 'practice.revision' },
      { route: 'Bookmarks', emoji: '🔖', labelKey: 'bookmarks.title' },
      { route: 'SkillTree', emoji: '🌳', labelKey: 'learn.skillTree' },
    ],
  },
  {
    titleKey: 'profile.title',
    emoji: '👤',
    entries: [{ route: 'Profile', emoji: '👤', labelKey: 'profile.title' }],
  },
];

/** The "More" tab: every secondary destination in one predictable list. */
export function MoreScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const { t } = useApp();

  return (
    <Screen scroll>
      {SECTIONS.map((section) => (
        <Column key={section.titleKey} gap={2} style={{ marginBottom: theme.spacing(4) }}>
          <SectionHeader title={t(section.titleKey)} emoji={section.emoji} />
          {section.entries.map((entry) => (
            <Card
              key={entry.route}
              padded={false}
              style={{ padding: theme.spacing(3) }}
              onPress={() => navigation.navigate(entry.route as never)}
            >
              <Row justify="space-between">
                <Row gap={3} style={{ flex: 1 }}>
                  <Txt size="bodyLarge">{entry.emoji}</Txt>
                  <Column gap={1} style={{ flex: 1 }}>
                    <Txt size="body" weight="medium">
                      {t(entry.labelKey)}
                    </Txt>
                    {entry.detailKey ? (
                      <Txt size="caption" color={theme.colors.textMuted} numberOfLines={1}>
                        {t(entry.detailKey)}
                      </Txt>
                    ) : null}
                  </Column>
                </Row>
                <Txt size="small" color={theme.colors.textMuted}>
                  ›
                </Txt>
              </Row>
            </Card>
          ))}
        </Column>
      ))}

      <Spacer size={2} />
      <Txt size="caption" color={theme.colors.textMuted} align="center">
        {t('common.appName')} · {t('common.offline')}
      </Txt>
    </Screen>
  );
}
