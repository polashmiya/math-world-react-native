import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import type { Mistake, Question } from '../../domain/models';
import type { MistakeGroup } from '../../domain/services';
import { questionPrompt, renderSolution } from '../../core/question-engine/solutionEngine';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Column,
  EmptyState,
  Loading,
  MathText,
  Row,
  Screen,
  SectionHeader,
  SolutionSteps,
  Spacer,
  Txt,
} from '../../ui/components';
import { useSound } from '../../ui/sound';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** The mistake bank (spec §18): grouped by topic, retryable, explainable. */
export function MistakesScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const { play } = useSound();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);
  const invalidate = useAppStore((state) => state.invalidateData);

  const [groups, setGroups] = useState<MistakeGroup[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ mistake: Mistake; question: Question }[] | null>(null);
  const [openSolution, setOpenSolution] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{ id: string; text: string } | null>(null);

  const load = useCallback(async () => {
    setGroups(await services.progress.getMistakeGroups());
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  useEffect(() => {
    navigation.setOptions({ title: t('mistakes.title') });
  }, [navigation, t]);

  const openGroup = async (topicId: string): Promise<void> => {
    if (expanded === topicId) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(topicId);
    setDetail(await services.progress.getMistakeQuestions(topicId, 30));
  };

  const explain = async (mistake: Mistake, question: Question): Promise<void> => {
    play('reveal');
    const attempts = await services.repositories.attempts.getAttempts({
      questionIds: [question.id],
      isCorrect: false,
      limit: 1,
    });
    const text = attempts[0]
      ? await services.repositories.tutor.explainMistake(attempts[0], question)
      : await services.repositories.tutor.explain(question);
    setExplanation({ id: mistake.id, text });
  };

  if (!groups) return <Loading label={t('common.loading')} />;

  if (groups.length === 0) {
    return (
      <Screen>
        <EmptyState emoji="🎉" title={t('practice.noMistakes')} />
      </Screen>
    );
  }

  const totalMistakes = groups.reduce((acc, group) => acc + group.count, 0);

  return (
    <Screen scroll>
      <Card accent={theme.colors.danger}>
        <Row justify="space-between">
          <Column gap={1}>
            <Txt size="body" weight="semibold">
              {t('mistakes.count', { count: totalMistakes })}
            </Txt>
            <Txt size="caption" color={theme.colors.textMuted}>
              {t('mistakes.resolved')}
            </Txt>
          </Column>
          <Button
            label={t('mistakes.retry')}
            icon="🛠️"
            onPress={async () => {
              const all = await services.progress.getMistakeQuestions(undefined, 15);
              if (all.length === 0) return;
              navigation.navigate('PracticeRun', {
                mode: 'mistake_review',
                title: t('mistakes.title'),
                sourceIds: all.map((item) => item.question.id),
              });
            }}
          />
        </Row>
      </Card>

      <Spacer size={4} />

      {groups.map((group) => (
        <Column key={group.topicId} gap={2} style={{ marginBottom: theme.spacing(3) }}>
          <Card onPress={() => void openGroup(group.topicId)} padded={false} style={{ padding: theme.spacing(3) }}>
            <Row justify="space-between">
              <Row gap={2} style={{ flex: 1 }}>
                <Txt size="bodyLarge">{group.emoji}</Txt>
                <Txt size="body" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                  {pickLocalized(language, group.topicName, group.topicNameBn)}
                </Txt>
              </Row>
              <Row gap={2}>
                <Badge label={String(group.count)} color={theme.colors.danger} />
                <Txt size="small" color={theme.colors.textMuted}>
                  {expanded === group.topicId ? '▲' : '▼'}
                </Txt>
              </Row>
            </Row>
          </Card>

          {expanded === group.topicId ? (
            detail === null ? (
              <Loading />
            ) : (
              <Column gap={2}>
                <Button
                  label={t('mistakes.retry') + ' (' + detail.length + ')'}
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    navigation.navigate('PracticeRun', {
                      mode: 'mistake_review',
                      title: pickLocalized(language, group.topicName, group.topicNameBn),
                      sourceIds: detail.map((item) => item.question.id),
                    })
                  }
                />
                {detail.map(({ mistake, question }) => {
                  const solution = renderSolution(question, language);
                  return (
                    <Card key={mistake.id}>
                      <Column gap={2}>
                        <Row justify="space-between">
                          <Badge
                            label={mistake.mistakeCount + '×'}
                            color={theme.colors.danger}
                          />
                          <Txt size="caption" color={theme.colors.textMuted}>
                            {t('common.difficulty')} {question.difficulty}
                          </Txt>
                        </Row>
                        <MathText size="body">{questionPrompt(question, language)}</MathText>

                        <Row gap={2} wrap>
                          <Button
                            label={t('mistakes.reviewSolution')}
                            size="sm"
                            variant="secondary"
                            onPress={() => setOpenSolution(openSolution === mistake.id ? null : mistake.id)}
                          />
                          <Button
                            label={t('mistakes.whyWrong')}
                            size="sm"
                            variant="ghost"
                            onPress={() => void explain(mistake, question)}
                          />
                          <Button
                            label={t('mistakes.similar')}
                            size="sm"
                            variant="ghost"
                            onPress={() =>
                              navigation.navigate('PracticeRun', {
                                mode: 'practice',
                                title: t('mistakes.similar'),
                                topicIds: [question.topicId],
                                skillIds: question.skillIds,
                                difficulty: question.difficulty,
                                count: 5,
                              })
                            }
                          />
                          <Button
                            label={t('mistakes.remove')}
                            size="sm"
                            variant="ghost"
                            onPress={async () => {
                              await services.progress.removeMistake(mistake);
                              invalidate();
                              await openGroup(group.topicId);
                              await openGroup(group.topicId);
                            }}
                          />
                        </Row>

                        {openSolution === mistake.id ? (
                          <SolutionSteps
                            steps={solution.steps}
                            explanation={solution.explanation}
                            answerLabel={t('solver.answer')}
                            answer={solution.answer}
                          />
                        ) : null}

                        {explanation?.id === mistake.id ? (
                          <Card
                            padded={false}
                            style={{
                              backgroundColor: theme.colors.infoSoft,
                              padding: theme.spacing(3),
                              borderWidth: 0,
                            }}
                          >
                            <Txt size="small">{explanation.text}</Txt>
                          </Card>
                        ) : null}
                      </Column>
                    </Card>
                  );
                })}
              </Column>
            )
          ) : null}
        </Column>
      ))}
    </Screen>
  );
}

/** The spaced-repetition revision queue (spec §19). */
export function RevisionScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);

  const [queue, setQueue] = useState<{ dueNow: number; questions: Question[] } | null>(null);

  const load = useCallback(async () => {
    const result = await services.progress.getRevisionQueue(Date.now(), 25);
    setQueue({ dueNow: result.dueNow, questions: result.questions });
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  useEffect(() => {
    navigation.setOptions({ title: t('practice.revision') });
  }, [navigation, t]);

  if (!queue) return <Loading label={t('common.loading')} />;

  if (queue.questions.length === 0) {
    return (
      <Screen>
        <EmptyState emoji="✅" title={t('practice.noRevision')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Card accent={theme.colors.accent}>
        <Row justify="space-between">
          <Column gap={1}>
            <Txt size="body" weight="semibold">
              🔁 {queue.dueNow} {t('common.questions')}
            </Txt>
            <Txt size="caption" color={theme.colors.textMuted}>
              {t('practice.revision')}
            </Txt>
          </Column>
          <Button
            label={t('common.start')}
            onPress={() =>
              navigation.navigate('PracticeRun', {
                mode: 'revision',
                title: t('practice.revision'),
                sourceIds: queue.questions.map((question) => question.id),
              })
            }
          />
        </Row>
      </Card>

      <Spacer size={4} />
      <SectionHeader title={t('progress.revisionQueue')} emoji="📋" />
      <Column gap={2}>
        {queue.questions.map((question) => (
          <Card key={question.id} padded={false} style={{ padding: theme.spacing(3) }}>
            <Column gap={1}>
              <Txt size="caption" color={theme.colors.textMuted}>
                {t('common.difficulty')} {question.difficulty}
              </Txt>
              <MathText size="small">{questionPrompt(question, language)}</MathText>
            </Column>
          </Card>
        ))}
      </Column>
    </Screen>
  );
}
