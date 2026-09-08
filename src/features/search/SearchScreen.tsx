import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import type { SearchResult, SearchResultKind, SearchResults } from '../../domain/services';
import type { TranslationKey } from '../../i18n';
import {
  Badge,
  Card,
  Column,
  EmptyState,
  Field,
  Loading,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  Txt,
} from '../../ui/components';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const KIND_ORDER: SearchResultKind[] = [
  'topic',
  'lesson',
  'formula',
  'exam',
  'game',
  'challenge',
  'skill',
  'question',
];

const KIND_KEYS: Record<SearchResultKind, TranslationKey> = {
  topic: 'search.kindTopic',
  lesson: 'search.kindLesson',
  question: 'search.kindQuestion',
  formula: 'search.kindFormula',
  exam: 'search.kindExam',
  game: 'search.kindGame',
  skill: 'search.kindSkill',
  challenge: 'search.kindChallenge',
};
/** Offline global search across every content kind (spec §37). */
export function SearchScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: t('search.title') });
  }, [navigation, t]);

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (query.trim().length < 2) {
        setResults(null);
        return;
      }
      setSearching(true);
      const found = await services.search.search(query, language);
      if (!cancelled) {
        setResults(found);
        setSearching(false);
      }
    };
    // Debounce keeps typing smooth on low-end devices.
    const timer = setTimeout(() => void run(), 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, services, language]);

  const open = (result: SearchResult): void => {
    switch (result.kind) {
      case 'topic':
        navigation.navigate('TopicDetail', { topicId: result.id });
        break;
      case 'lesson':
        navigation.navigate('Lesson', { lessonId: result.id });
        break;
      case 'formula':
        navigation.navigate('FormulaDetail', { formulaId: result.id });
        break;
      case 'exam':
        navigation.navigate('ExamDetail', { examId: result.id });
        break;
      case 'game':
        navigation.navigate('Games');
        break;
      case 'challenge':
        navigation.navigate('Challenges');
        break;
      case 'skill':
        navigation.navigate('PracticeRun', {
          mode: 'practice',
          title: result.title,
          skillIds: [result.id],
          count: 8,
        });
        break;
      case 'question':
        navigation.navigate('PracticeRun', {
          mode: 'practice',
          title: result.title,
          sourceIds: [result.id],
        });
        break;
      default:
        break;
    }
  };

  return (
    <Screen scroll>
      <Field
        value={query}
        onChangeText={setQuery}
        placeholder={t('search.placeholder')}
        autoFocus
      />
      <Spacer size={4} />

      {searching ? <Loading /> : null}

      {results && results.total === 0 && !searching ? (
        <EmptyState emoji="🔍" title={t('search.noResults', { query: results.query })} />
      ) : null}

      {results && results.total > 0 ? (
        <>
          <Txt size="caption" color={theme.colors.textMuted}>
            {t('search.resultsFor', { query: results.query })} · {results.total}
          </Txt>
          <Spacer size={3} />
          {KIND_ORDER.map((kind) => {
            const list = results.byKind[kind];
            if (list.length === 0) return null;
            return (
              <Column key={kind} gap={2} style={{ marginBottom: theme.spacing(4) }}>
                <SectionHeader title={t(KIND_KEYS[kind])} />
                {list.slice(0, 8).map((result) => (
                  <Card
                    key={kind + result.id}
                    padded={false}
                    style={{ padding: theme.spacing(3) }}
                    onPress={() => open(result)}
                  >
                    <Row gap={3}>
                      <Txt size="bodyLarge">{result.emoji}</Txt>
                      <Column gap={1} style={{ flex: 1 }}>
                        <Txt size="small" weight="semibold" numberOfLines={2}>
                          {result.title}
                        </Txt>
                        {result.subtitle ? (
                          <Txt size="caption" color={theme.colors.textMuted} numberOfLines={2}>
                            {result.subtitle}
                          </Txt>
                        ) : null}
                      </Column>
                    </Row>
                  </Card>
                ))}
                {list.length > 8 ? (
                  <Badge label={'+' + (list.length - 8)} color={theme.colors.textMuted} />
                ) : null}
              </Column>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}
