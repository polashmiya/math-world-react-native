import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { PracticeRunParams, RootStackParamList } from '../../app/navigation/types';
import { isChoiceQuestion, optionLabel, type Question } from '../../domain/models';
import { hintsFor, questionPrompt, renderSolution, optionText } from '../../core/question-engine/solutionEngine';
import type { SubmitAnswerResult } from '../../domain/services';
import { summariseSession } from '../../domain/rules/scoring';
import { achievementByCode } from '../../data/content/achievements';
import { pickLocalized } from '../../i18n';
import { formatDuration } from '../../core/utils/date';
import {
  Badge,
  Button,
  Card,
  Celebration,
  Column,
  DifficultyPill,
  ErrorState,
  FadeInView,
  Field,
  Loading,
  MathText,
  OptionButton,
  ProgressBar,
  Row,
  SectionHeader,
  SolutionSteps,
  Spacer,
  Txt,
} from '../../ui/components';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Phase = 'think' | 'answer' | 'feedback';

interface Outcome {
  isCorrect: boolean;
  timeSpentMs: number;
  xp: number;
}

/**
 * The practice runner. It owns the question loop and Think First mode, and
 * hands every answer to `PracticeService`, which updates all derived state.
 */
export function PracticeRunScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'PracticeRun'>>();
  const params: PracticeRunParams = route.params;
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const thinkFirstEnabled = settings?.thinkFirstEnabled ?? true;

  const pushToast = useAppStore((state) => state.pushToast);
  const invalidate = useAppStore((state) => state.invalidateData);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [origins, setOrigins] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [estimate, setEstimate] = useState('');
  const [hintLevel, setHintLevel] = useState(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitAnswerResult | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const questionStartedAt = useRef(Date.now());
  const sessionStartedAt = useRef(Date.now());

  const load = useCallback(async () => {
    setError(null);
    try {
      if (params.sourceIds && params.sourceIds.length > 0) {
        // Mistake and revision runs replay the exact questions the user saw.
        const restored: Question[] = [];
        for (const id of params.sourceIds) {
          const question = await services.repositories.questions.getQuestionById(id);
          if (question) restored.push(question);
        }
        if (restored.length === 0) {
          setError(t('common.empty'));
          setQuestions([]);
          return;
        }
        setQuestions(restored);
        setOrigins(restored.map(() => (params.mode === 'revision' ? 'review' : 'mistake')));
        setSessionId(null);
        return;
      }

      const set = await services.practice.getPracticeQuestions({
        mode: params.mode,
        count: params.count ?? 10,
        topicIds: params.topicIds,
        skillIds: params.skillIds,
        examIds: params.examIds,
        generatorIds: params.generatorIds,
        brainCategories: params.brainCategories,
        difficulty: params.difficulty,
      });
      setQuestions(set.questions);
      setOrigins(set.origins);
      setSessionId(set.sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setQuestions([]);
    }
  }, [params, services, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    navigation.setOptions({ title: params.title });
  }, [navigation, params.title]);

  const question = questions?.[index] ?? null;

  // Reset per-question state whenever the question changes.
  useEffect(() => {
    if (!question) return;
    questionStartedAt.current = Date.now();
    setAnswer('');
    setSelectedOption(null);
    setEstimate('');
    setHintLevel(0);
    setHintText(null);
    setResult(null);
    const wantsThinkFirst =
      thinkFirstEnabled &&
      !isChoiceQuestion(question) &&
      (question.questionType === 'estimation' ||
        question.questionType === 'word_problem' ||
        question.questionType === 'numeric');
    setPhase(wantsThinkFirst ? 'think' : 'answer');
  }, [question, thinkFirstEnabled]);

  const solution = useMemo(
    () => (question ? renderSolution(question, language) : null),
    [question, language],
  );

  const submit = async (): Promise<void> => {
    if (!question || submitting) return;
    const given = isChoiceQuestion(question) || question.questionType === 'true_false'
      ? (selectedOption ?? '')
      : answer;
    if (given.trim().length === 0) return;

    setSubmitting(true);
    try {
      const submitted = await services.practice.submitAnswer({
        sessionId,
        question,
        givenAnswer: given,
        timeSpentMs: Date.now() - questionStartedAt.current,
        hintsUsed: hintLevel,
        mode: params.mode,
        estimateValue: estimate.trim().length > 0 ? Number(estimate) : null,
        strategy: null,
      });

      setResult(submitted);
      setPhase('feedback');
      setOutcomes((previous) => [
        ...previous,
        {
          isCorrect: submitted.isCorrect,
          timeSpentMs: submitted.attempt.timeSpentMs,
          xp: submitted.xpEarned,
        },
      ]);

      if (submitted.newLevel) {
        pushToast({ kind: 'success', title: t('common.level') + ' ' + submitted.newLevel + ' 🎉' });
      }
      for (const code of submitted.unlockedAchievementCodes) {
        const achievement = achievementByCode(code);
        if (achievement) {
          pushToast({
            kind: 'achievement',
            title: achievement.emoji + ' ' + pickLocalized(language, achievement.name, achievement.nameBn),
            detail: pickLocalized(language, achievement.description, achievement.descriptionBn),
          });
        }
      }
      if (submitted.mistakeResolved) {
        pushToast({ kind: 'success', title: t('mistakes.resolved') });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const showHint = async (): Promise<void> => {
    if (!question) return;
    const nextLevel = hintLevel + 1;
    setHintLevel(nextLevel);
    setHintText(await services.repositories.tutor.giveHint(question, nextLevel));
  };

  const advance = (): void => {
    if (!questions) return;
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    const summary = summariseSession(outcomes);
    invalidate();
    navigation.replace('SessionSummary', {
      answered: summary.answered,
      correct: summary.correct,
      xp: summary.xpEarned,
      bestStreak: summary.bestStreak,
      averageTimeMs: summary.averageTimeMs,
      title: params.title,
      lessonId: params.lessonId,
    });
  };

  if (!questions) return <Loading label={t('common.loading')} />;

  if (error || questions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ padding: theme.spacing(4) }}>
          <ErrorState
            title={t('common.error')}
            detail={error ?? t('common.empty')}
            onRetry={() => void load()}
            retryLabel={t('common.retry')}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!question || !solution) return <Loading />;

  const hints = hintsFor(question, language);
  const choice = isChoiceQuestion(question) || question.questionType === 'true_false';
  const origin = origins[index];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: theme.spacing(4), paddingTop: theme.spacing(2) }}>
        <ProgressBar ratio={(index + 1) / questions.length} height={6} />
        <Spacer size={2} />
        <Row justify="space-between">
          <Txt size="caption" color={theme.colors.textMuted}>
            {index + 1} / {questions.length}
          </Txt>
          <Row gap={2}>
            <DifficultyPill difficulty={question.difficulty} />
            {origin && origin !== 'fresh' ? (
              <Badge
                label={
                  origin === 'review'
                    ? t('practice.fromReview')
                    : origin === 'mistake'
                      ? t('practice.fromMistake')
                      : t('practice.fromWeakSkill')
                }
                color={theme.colors.accent}
              />
            ) : null}
          </Row>
        </Row>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: theme.spacing(10) }}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView key={question.id}>
          <Card>
            <MathText size="bodyLarge">{questionPrompt(question, language)}</MathText>
          </Card>
        </FadeInView>

        <Spacer size={4} />

        {/* Think First: estimate before the exact answer (spec §21) */}
        {phase === 'think' ? (
          <Card accent={theme.colors.topic.violet}>
            <Column gap={3}>
              <Row gap={2}>
                <Txt size="bodyLarge">🤔</Txt>
                <Txt size="body" weight="semibold">
                  {t('practice.thinkFirst')}
                </Txt>
              </Row>
              <Column gap={2}>
                <Txt size="small" color={theme.colors.textMuted}>
                  {t('practice.yourEstimate')}
                </Txt>
                <Field
                  value={estimate}
                  onChangeText={setEstimate}
                  keyboardType="decimal-pad"
                  placeholder="______"
                  mono
                />
              </Column>
              <Button
                label={t('practice.solveNow')}
                full
                onPress={() => setPhase('answer')}
                disabled={estimate.trim().length === 0}
              />
            </Column>
          </Card>
        ) : null}

        {/* Answer input */}
        {phase !== 'think' ? (
          choice ? (
            <Column gap={2}>
              {(question.options ?? []).map((option, optionIndex) => {
                const isSelected = selectedOption === option.id;
                const isAnswer = option.id === question.correctAnswer;
                const state =
                  phase === 'feedback'
                    ? isAnswer
                      ? 'correct'
                      : isSelected
                        ? 'wrong'
                        : 'idle'
                    : isSelected
                      ? 'selected'
                      : 'idle';
                return (
                  <OptionButton
                    key={option.id}
                    label={optionLabel(optionIndex)}
                    text={optionText(option, language)}
                    state={state}
                    disabled={phase === 'feedback'}
                    onPress={() => setSelectedOption(option.id)}
                  />
                );
              })}
            </Column>
          ) : (
            <Column gap={2}>
              <Txt size="small" color={theme.colors.textMuted}>
                {t('practice.yourAnswer')}
              </Txt>
              <Field
                value={phase === 'feedback' ? (result?.attempt.givenAnswer ?? answer) : answer}
                onChangeText={setAnswer}
                placeholder={t('practice.typeAnswer')}
                keyboardType={question.questionType === 'short_answer' ? 'default' : 'decimal-pad'}
                mono
                onSubmitEditing={() => void submit()}
              />
            </Column>
          )
        ) : null}

        {/* Hints */}
        {phase === 'answer' && hints.length + question.solutionSteps.length > 0 ? (
          <>
            <Spacer size={3} />
            <Row gap={3} align="flex-start">
              <Button label={t('practice.hint') + (hintLevel > 0 ? ' ' + hintLevel : '')} icon="💡" size="sm" variant="secondary" onPress={() => void showHint()} />
            </Row>
            {hintText ? (
              <>
                <Spacer size={2} />
                <Card
                  padded={false}
                  style={{ backgroundColor: theme.colors.warningSoft, padding: theme.spacing(3), borderWidth: 0 }}
                >
                  <Txt size="small">{hintText}</Txt>
                </Card>
              </>
            ) : null}
          </>
        ) : null}

        {/* Feedback and solution */}
        {phase === 'feedback' && result ? (
          <FadeInView key={'feedback-' + question.id} distance={10}>
            <Spacer size={4} />
            <Card
              accent={result.isCorrect ? theme.colors.success : theme.colors.danger}
              style={{
                backgroundColor: result.isCorrect ? theme.colors.successSoft : theme.colors.dangerSoft,
              }}
            >
              <Column gap={2}>
                {result.isCorrect ? <Celebration count={12} /> : null}
                <Row justify="space-between">
                  <Txt size="bodyLarge" weight="bold" color={result.isCorrect ? theme.colors.success : theme.colors.danger}>
                    {result.isCorrect ? '✓ ' + t('common.correct') : '✕ ' + t('common.wrong')}
                  </Txt>
                  <Badge label={t('practice.xpEarned', { xp: result.xpEarned })} color={theme.colors.accent} />
                </Row>
                {!result.isCorrect ? (
                  <Txt size="small">
                    {result.nearMiss
                      ? t('practice.soClose')
                      : t('practice.correctAnswerIs', { answer: result.expectedAnswer })}
                  </Txt>
                ) : null}
                {result.estimateAccuracy !== null ? (
                  <Txt size="small" color={theme.colors.textMuted}>
                    {t('practice.estimateClose', {
                      percent: Math.round(result.estimateAccuracy * 100) + '%',
                    })}
                  </Txt>
                ) : null}
              </Column>
            </Card>

            <Spacer size={4} />
            <SectionHeader title={t('practice.solution')} emoji="🧮" />
            <Card>
              <SolutionSteps
                steps={solution.steps}
                explanation={solution.explanation}
                answerLabel={t('solver.answer')}
                answer={solution.answer}
              />
            </Card>
          </FadeInView>
        ) : null}
      </ScrollView>

      <View
        style={{
          padding: theme.spacing(4),
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        {phase === 'feedback' ? (
          <Button
            label={index + 1 < questions.length ? t('common.next') : t('common.finish')}
            full
            size="lg"
            onPress={advance}
          />
        ) : (
          <Button
            label={t('common.check')}
            full
            size="lg"
            loading={submitting}
            disabled={phase === 'think' || (choice ? selectedOption === null : answer.trim().length === 0)}
            onPress={() => void submit()}
          />
        )}
        <Spacer size={2} />
        <Txt size="caption" color={theme.colors.textMuted} align="center">
          {outcomes.filter((o) => o.isCorrect).length} / {outcomes.length} {t('common.correct')}
          {outcomes.length > 0
            ? ' · ' + formatDuration(outcomes.reduce((a, o) => a + o.timeSpentMs, 0) / outcomes.length)
            : ''}
        </Txt>
      </View>
    </SafeAreaView>
  );
}
