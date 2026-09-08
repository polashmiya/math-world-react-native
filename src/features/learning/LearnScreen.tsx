import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { ACADEMIC_LEVEL_LABELS, ACADEMIC_LEVELS, type AcademicLevel } from '../../core/constants/levels';
import type { SkillTreeNode } from '../../domain/services';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Card,
  ChipRow,
  Column,
  EmptyState,
  Loading,
  MasteryRing,
  Row,
  SectionHeader,
  Spacer,
  Txt,
} from '../../ui/components';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type LevelFilter = 'all' | AcademicLevel;

/** The Learn tab: the whole skill tree, filterable by academic level (spec §31). */
export function LearnScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);

  const [nodes, setNodes] = useState<SkillTreeNode[] | null>(null);
  const [level, setLevel] = useState<LevelFilter>('all');

  const load = useCallback(async () => {
    setNodes(await services.learning.getFlatSkillTree());
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const filtered = useMemo(() => {
    if (!nodes) return [];
    if (level === 'all') return nodes;
    return nodes.filter((node) => node.topic.level === level);
  }, [nodes, level]);

  const levelOptions = useMemo<LevelFilter[]>(() => ['all', ...ACADEMIC_LEVELS], []);

  if (!nodes) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Loading label={t('common.loading')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: theme.spacing(4), paddingTop: theme.spacing(3) }}>
        <SectionHeader title={t('learn.skillTree')} emoji="🌳" />
        <ChipRow
          options={levelOptions}
          value={level}
          onChange={setLevel}
          labelFor={(option) =>
            option === 'all'
              ? t('common.all')
              : pickLocalized(language, ACADEMIC_LEVEL_LABELS[option].en, ACADEMIC_LEVEL_LABELS[option].bn)
          }
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.topic.id}
        // Windowed rendering keeps a 70-topic tree cheap on low-end devices.
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={9}
        removeClippedSubviews
        contentContainerStyle={{ padding: theme.spacing(4), gap: theme.spacing(2), paddingBottom: theme.spacing(10) }}
        ListEmptyComponent={<EmptyState title={t('common.empty')} emoji="🌳" />}
        renderItem={({ item }) => (
          <TopicRow
            node={item}
            indent={level === 'all' ? item.depth : 0}
            onPress={() => navigation.navigate('TopicDetail', { topicId: item.topic.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

function TopicRow({
  node,
  indent,
  onPress,
}: {
  node: SkillTreeNode;
  indent: number;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const accent = theme.colors.topic[node.topic.colorKey];

  return (
    <View style={{ marginLeft: indent * theme.spacing(4) }}>
      <Card onPress={onPress} accent={accent} padded={false} style={{ padding: theme.spacing(3) }}>
        <Row gap={3}>
          <Txt size="title">{node.topic.emoji}</Txt>
          <Column gap={1} style={{ flex: 1 }}>
            <Row gap={2} wrap>
              <Txt size="body" weight="semibold" numberOfLines={1}>
                {pickLocalized(language, node.topic.name, node.topic.nameBn)}
              </Txt>
              {!node.unlocked ? <Badge label={t('common.locked')} color={theme.colors.textMuted} /> : null}
              {node.progress?.bossDefeatedAt ? <Badge label="👾" color={theme.colors.success} /> : null}
            </Row>
            <Txt size="caption" color={theme.colors.textMuted}>
              {pickLocalized(language, node.label.en, node.label.bn)}
              {node.lessonCount > 0
                ? ' · ' + node.completedLessonCount + '/' + node.lessonCount + ' ' + t('learn.lessons')
                : ''}
            </Txt>
          </Column>
          <MasteryRing ratio={node.mastery} size={44} thickness={5} />
        </Row>
      </Card>
    </View>
  );
}
