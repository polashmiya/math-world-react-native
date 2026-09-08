import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import type { Formula } from '../../domain/models';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Column,
  Divider,
  EmptyState,
  Field,
  Loading,
  MathText,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  Txt,
} from '../../ui/components';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** The offline formula library, grouped and searchable (spec §27). */
export function FormulasScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';

  const [groups, setGroups] = useState<
    { category: string; label: string; formulas: Formula[] }[] | null
  >(null);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Formula[] | null>(null);

  const load = useCallback(async () => {
    setGroups(await services.search.getFormulaLibrary(language));
  }, [services, language]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    navigation.setOptions({ title: t('formulas.title') });
  }, [navigation, t]);

  useEffect(() => {
    const run = async (): Promise<void> => {
      if (query.trim().length < 2) {
        setMatches(null);
        return;
      }
      setMatches(await services.repositories.formulas.searchFormulas(query));
    };
    void run();
  }, [query, services]);

  if (!groups) return <Loading label={t('common.loading')} />;

  const renderRow = (formula: Formula): React.JSX.Element => (
    <Card
      key={formula.id}
      padded={false}
      style={{ padding: theme.spacing(3) }}
      onPress={() => navigation.navigate('FormulaDetail', { formulaId: formula.id })}
    >
      <Column gap={1}>
        <Txt size="body" weight="semibold">
          {pickLocalized(language, formula.name, formula.nameBn)}
        </Txt>
        <MathText size="small" color={theme.colors.primary}>
          {formula.expression}
        </MathText>
      </Column>
    </Card>
  );

  return (
    <Screen scroll>
      <Field value={query} onChangeText={setQuery} placeholder={t('formulas.searchHint')} />
      <Spacer size={4} />

      {matches !== null ? (
        matches.length === 0 ? (
          <EmptyState emoji="🔍" title={t('search.noResults', { query })} />
        ) : (
          <Column gap={2}>{matches.map(renderRow)}</Column>
        )
      ) : (
        groups.map((group) => (
          <Column key={group.category} gap={2} style={{ marginBottom: theme.spacing(4) }}>
            <SectionHeader title={group.label} emoji="🧾" />
            {group.formulas.map(renderRow)}
          </Column>
        ))
      )}
    </Screen>
  );
}

/** One formula: meaning, variables, worked example, related and pitfalls. */
export function FormulaDetailScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'FormulaDetail'>>();
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const invalidate = useAppStore((state) => state.invalidateData);

  const [formula, setFormula] = useState<Formula | null>(null);
  const [related, setRelated] = useState<Formula[]>([]);
  const [bookmarked, setBookmarked] = useState(false);

  const load = useCallback(async () => {
    const found = await services.repositories.formulas.getFormulaById(route.params.formulaId);
    setFormula(found);
    if (found) {
      const relatedList: Formula[] = [];
      for (const id of found.relatedFormulaIds) {
        const item = await services.repositories.formulas.getFormulaById(id);
        if (item) relatedList.push(item);
      }
      setRelated(relatedList);
      setBookmarked(await services.search.isBookmarked('formula', found.id));
    }
  }, [services, route.params.formulaId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (formula) navigation.setOptions({ title: pickLocalized(language, formula.name, formula.nameBn) });
  }, [formula, navigation, language]);

  if (!formula) return <Loading label={t('common.loading')} />;

  const toggleBookmark = async (): Promise<void> => {
    const next = await services.search.toggleBookmark(
      'formula',
      formula.id,
      pickLocalized(language, formula.name, formula.nameBn),
    );
    setBookmarked(next);
    invalidate();
  };

  return (
    <Screen scroll>
      <Card accent={theme.colors.primary}>
        <Column gap={3}>
          <Txt size="title" weight="bold">
            {pickLocalized(language, formula.name, formula.nameBn)}
          </Txt>
          <Card
            padded={false}
            style={{ backgroundColor: theme.colors.surfaceAlt, padding: theme.spacing(4), borderWidth: 0 }}
          >
            <MathText size="title" align="center">
              {formula.expression}
            </MathText>
          </Card>
          <Txt size="body">{pickLocalized(language, formula.meaning, formula.meaningBn)}</Txt>
          <Row gap={2} wrap>
            {formula.tags.map((tag) => (
              <Badge key={tag} label={tag} />
            ))}
          </Row>
          <Button
            label={bookmarked ? t('bookmarks.remove') : t('bookmarks.add')}
            icon={bookmarked ? '🔖' : '☆'}
            variant="secondary"
            size="sm"
            onPress={() => void toggleBookmark()}
          />
        </Column>
      </Card>

      <Spacer size={4} />

      {formula.variables.length > 0 ? (
        <>
          <SectionHeader title={t('formulas.variables')} emoji="🔤" />
          <Card>
            <Column gap={2}>
              {formula.variables.map((variable, index) => (
                <Column key={variable.symbol + index} gap={1}>
                  {index > 0 ? <Divider /> : null}
                  <Row gap={3} align="flex-start" style={{ paddingTop: index > 0 ? theme.spacing(2) : 0 }}>
                    <MathText size="body" color={theme.colors.primary}>
                      {variable.symbol}
                    </MathText>
                    <Txt size="small" style={{ flex: 1 }}>
                      {pickLocalized(language, variable.meaning, variable.meaningBn)}
                    </Txt>
                  </Row>
                </Column>
              ))}
            </Column>
          </Card>
          <Spacer size={4} />
        </>
      ) : null}

      <SectionHeader title={t('formulas.example')} emoji="📝" />
      <Card>
        <MathText size="body">{pickLocalized(language, formula.example, formula.exampleBn)}</MathText>
      </Card>

      <Spacer size={4} />

      {formula.commonMistakes.length > 0 ? (
        <>
          <SectionHeader title={t('formulas.mistakes')} emoji="⚠️" />
          <Card style={{ borderColor: theme.colors.warning }}>
            <Column gap={2}>
              {(language === 'bn' && formula.commonMistakesBn.length > 0
                ? formula.commonMistakesBn
                : formula.commonMistakes
              ).map((mistake, index) => (
                <Row key={'mistake-' + index} gap={2} align="flex-start">
                  <Txt size="small" color={theme.colors.warning}>
                    •
                  </Txt>
                  <Txt size="small" style={{ flex: 1 }}>
                    {mistake}
                  </Txt>
                </Row>
              ))}
            </Column>
          </Card>
          <Spacer size={4} />
        </>
      ) : null}

      {related.length > 0 ? (
        <>
          <SectionHeader title={t('formulas.related')} emoji="🔗" />
          <Column gap={2}>
            {related.map((item) => (
              <Card
                key={item.id}
                padded={false}
                style={{ padding: theme.spacing(3) }}
                onPress={() => navigation.push('FormulaDetail', { formulaId: item.id })}
              >
                <Column gap={1}>
                  <Txt size="small" weight="semibold">
                    {pickLocalized(language, item.name, item.nameBn)}
                  </Txt>
                  <MathText size="small" color={theme.colors.textMuted}>
                    {item.expression}
                  </MathText>
                </Column>
              </Card>
            ))}
          </Column>
        </>
      ) : null}
    </Screen>
  );
}

/** Bookmarks across every content type (spec §38). */
export function BookmarksScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t } = useApp();
  const dataVersion = useAppStore((state) => state.dataVersion);
  const [bookmarks, setBookmarks] = useState<Awaited<ReturnType<typeof services.search.getBookmarks>> | null>(
    null,
  );

  const load = useCallback(async () => {
    setBookmarks(await services.search.getBookmarks());
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  useEffect(() => {
    navigation.setOptions({ title: t('bookmarks.title') });
  }, [navigation, t]);

  if (!bookmarks) return <Loading label={t('common.loading')} />;

  if (bookmarks.length === 0) {
    return (
      <Screen>
        <EmptyState emoji="🔖" title={t('bookmarks.empty')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Column gap={2}>
        {bookmarks.map((bookmark) => (
          <Card
            key={bookmark.id}
            padded={false}
            style={{ padding: theme.spacing(3) }}
            onPress={
              bookmark.itemType === 'formula'
                ? () => navigation.navigate('FormulaDetail', { formulaId: bookmark.itemId })
                : bookmark.itemType === 'lesson'
                  ? () => navigation.navigate('Lesson', { lessonId: bookmark.itemId })
                  : bookmark.itemType === 'topic'
                    ? () => navigation.navigate('TopicDetail', { topicId: bookmark.itemId })
                    : undefined
            }
          >
            <Row justify="space-between">
              <Column gap={1} style={{ flex: 1 }}>
                <Badge label={bookmark.itemType} />
                <Txt size="small" numberOfLines={2}>
                  {bookmark.label}
                </Txt>
              </Column>
              <Button
                label="✕"
                size="sm"
                variant="ghost"
                onPress={async () => {
                  await services.repositories.bookmarks.removeBookmark(bookmark.itemType, bookmark.itemId);
                  await load();
                }}
              />
            </Row>
          </Card>
        ))}
      </Column>
    </Screen>
  );
}
