import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { EXAM_FAMILIES, type ExamFamily } from '../../core/constants/levels';
import { formatDuration } from '../../core/utils/date';
import { optionText, questionPrompt } from '../../core/question-engine/solutionEngine';
import { isChoiceQuestion, optionLabel } from '../../domain/models';
import type { Exam, ExamAttempt, ExamResult, ExamSessionSnapshot } from '../../domain/models';
import type { ExamListEntry } from '../../domain/services';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  ChipRow,
  Column,
  Countdown,
  DifficultyPill,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  MasteryRing,
  MathText,
  OptionButton,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  StatTile,
  Txt,
} from '../../ui/components';
import { useSound } from '../../ui/sound';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FamilyFilter = 'all' | ExamFamily;

const FAMILY_LABELS: Record<ExamFamily, { en: string; bn: string }> = {
  school: { en: 'School', bn: 'স্কুল' },
  admission: { en: 'Admission', bn: 'ভর্তি' },
  bcs: { en: 'BCS', bn: 'বিসিএস' },
  bank: { en: 'Bank', bn: 'ব্যাংক' },
  ntrca: { en: 'NTRCA', bn: 'এনটিআরসিএ' },
  govt: { en: 'Government', bn: 'সরকারি' },
  olympiad: { en: 'Olympiad', bn: 'অলিম্পিয়াড' },
  custom: { en: 'Custom', bn: 'কাস্টম' },
};

/** The Competitive Exam Hub (spec §23). */
export function ExamsScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);

  const [entries, setEntries] = useState<ExamListEntry[] | null>(null);
  const [family, setFamily] = useState<FamilyFilter>('all');

  const load = useCallback(async () => {
    setEntries(await services.exams.listExams());
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  useEffect(() => {
    navigation.setOptions({ title: t('exams.title') });
  }, [navigation, t]);

  if (!entries) return <Loading label={t('common.loading')} />;

  const filtered = family === 'all' ? entries : entries.filter((entry) => entry.exam.family === family);

  return (
    <Screen scroll>
      <ChipRow<FamilyFilter>
        options={['all', ...EXAM_FAMILIES]}
        value={family}
        onChange={setFamily}
        labelFor={(option) =>
          option === 'all' ? t('common.all') : pickLocalized(language, FAMILY_LABELS[option].en, FAMILY_LABELS[option].bn)
        }
      />
      <Spacer size={3} />

      <Column gap={3}>
        {filtered.map(({ exam, attempts, bestScore, readiness }) => (
          <Card
            key={exam.id}
            accent={theme.colors.primary}
            onPress={() => navigation.navigate('ExamDetail', { examId: exam.id })}
          >
            <Row gap={3} align="flex-start">
              <Txt size="display">{exam.emoji}</Txt>
              <Column gap={2} style={{ flex: 1 }}>
                <Txt size="bodyLarge" weight="semibold">
                  {pickLocalized(language, exam.name, exam.nameBn)}
                </Txt>
                <Txt size="caption" color={theme.colors.textMuted} numberOfLines={2}>
                  {pickLocalized(language, exam.description, exam.descriptionBn)}
                </Txt>
                <Row gap={2} wrap>
                  <Badge label={exam.totalQuestions + ' ' + t('common.questions')} />
                  <Badge label={Math.round(exam.durationSeconds / 60) + ' ' + t('common.minutes')} />
                  {exam.negativeMarkPerWrong > 0 ? (
                    <Badge label={'−' + exam.negativeMarkPerWrong} color={theme.colors.danger} />
                  ) : null}
                  {attempts > 0 ? (
                    <Badge label={t('exams.bestScore', { score: bestScore })} color={theme.colors.success} />
                  ) : null}
                </Row>
              </Column>
              <MasteryRing ratio={readiness} size={48} thickness={5} />
            </Row>
          </Card>
        ))}
      </Column>
    </Screen>
  );
}

/** Exam detail: choose a mock exam or a previous-year paper (spec §24). */
export function ExamDetailScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'ExamDetail'>>();
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';

  const [exam, setExam] = useState<Exam | null>(null);
  const [history, setHistory] = useState<ExamAttempt[]>([]);
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof services.exams.getExamAnalysis>> | null>(null);
  const [year, setYear] = useState<number | 'all'>('all');

  const load = useCallback(async () => {
    const [found, attempts, examAnalysis] = await Promise.all([
      services.repositories.exams.getExamById(route.params.examId),
      services.exams.getHistory(route.params.examId),
      services.exams.getExamAnalysis(route.params.examId),
    ]);
    setExam(found);
    setHistory(attempts);
    setAnalysis(examAnalysis);
  }, [services, route.params.examId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (exam) navigation.setOptions({ title: pickLocalized(language, exam.name, exam.nameBn) });
  }, [exam, navigation, language]);

  if (!exam) return <Loading label={t('common.loading')} />;

  return (
    <Screen scroll>
      <Card accent={theme.colors.primary}>
        <Column gap={3}>
          <Row gap={3}>
            <Txt size="display">{exam.emoji}</Txt>
            <Column gap={1} style={{ flex: 1 }}>
              <Txt size="title" weight="bold">
                {pickLocalized(language, exam.name, exam.nameBn)}
              </Txt>
              <Txt size="small" color={theme.colors.textMuted}>
                {pickLocalized(language, exam.description, exam.descriptionBn)}
              </Txt>
            </Column>
          </Row>
          <Row gap={3} wrap>
            <StatTile label={t('common.questions')} value={String(exam.totalQuestions)} emoji="📝" />
            <StatTile
              label={t('common.minutes')}
              value={String(Math.round(exam.durationSeconds / 60))}
              emoji="⏱️"
            />
          </Row>
          <Txt size="caption" color={exam.negativeMarkPerWrong > 0 ? theme.colors.danger : theme.colors.textMuted}>
            {exam.negativeMarkPerWrong > 0
              ? t('exams.negativeMarking', { value: exam.negativeMarkPerWrong })
              : t('exams.noNegativeMarking')}
          </Txt>
        </Column>
      </Card>

      <Spacer size={4} />

      {exam.years.length > 0 ? (
        <>
          <SectionHeader title={t('exams.previousQuestions')} emoji="📚" />
          <ChipRow<string>
            options={['all', ...exam.years.map(String)]}
            value={String(year)}
            onChange={(next) => setYear(next === 'all' ? 'all' : Number(next))}
            labelFor={(option) => (option === 'all' ? t('exams.allYears') : option)}
          />
          <Spacer size={3} />
        </>
      ) : null}

      <Button
        label={t('exams.startExam')}
        icon="▶"
        full
        size="lg"
        onPress={() =>
          navigation.navigate('ExamRun', {
            examId: exam.id,
            year: year === 'all' ? undefined : year,
          })
        }
      />

      <Spacer size={4} />

      <SectionHeader title={t('exams.analysis')} emoji="🧩" />
      <Card>
        <Column gap={2}>
          {exam.sections.map((section) => (
            <Row key={section.id} justify="space-between">
              <Txt size="small" style={{ flex: 1 }}>
                {pickLocalized(language, section.name, section.nameBn)}
              </Txt>
              <Row gap={2}>
                <Badge label={String(section.questionCount)} />
                <DifficultyPill difficulty={section.difficultyMax} />
              </Row>
            </Row>
          ))}
        </Column>
      </Card>

      {analysis && analysis.attempts > 0 ? (
        <>
          <Spacer size={4} />
          <SectionHeader title={t('exams.analysis')} emoji="📊" />
          <Row gap={3} wrap>
            <StatTile label={t('exams.attempts', { count: analysis.attempts })} value={String(analysis.attempts)} emoji="🔁" />
            <StatTile label={t('exams.score')} value={String(analysis.averageScore)} emoji="🎯" />
            <StatTile label={t('common.accuracy')} value={Math.round(analysis.averageAccuracy * 100) + '%'} emoji="✅" />
            <StatTile label={t('exams.averageTime')} value={formatDuration(analysis.averageTimeMs)} emoji="⏱️" />
          </Row>

          {analysis.weakTopics.length > 0 ? (
            <>
              <Spacer size={3} />
              <Card style={{ borderColor: theme.colors.warning }}>
                <Column gap={2}>
                  <Txt size="small" weight="semibold" color={theme.colors.warning}>
                    {t('exams.weakTopics')}
                  </Txt>
                  {analysis.weakTopics.map((topic) => (
                    <Row key={topic.topicId} justify="space-between">
                      <Txt size="small">{topic.topicName}</Txt>
                      <Txt size="small" color={theme.colors.textMuted}>
                        {Math.round(topic.accuracy * 100)}%
                      </Txt>
                    </Row>
                  ))}
                </Column>
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      {history.length > 0 ? (
        <>
          <Spacer size={4} />
          <SectionHeader title={t('exams.history')} emoji="🗂️" />
          <Column gap={2}>
            {history.slice(0, 10).map((attempt) => (
              <Card
                key={attempt.id}
                padded={false}
                style={{ padding: theme.spacing(3) }}
                onPress={() => navigation.navigate('ExamResult', { attemptId: attempt.id })}
              >
                <Row justify="space-between">
                  <Column gap={1}>
                    <Txt size="small" weight="semibold">
                      {attempt.score} / {attempt.maxScore}
                    </Txt>
                    <Txt size="caption" color={theme.colors.textMuted}>
                      {new Date(attempt.startedAt).toLocaleDateString()} ·{' '}
                      {Math.round(attempt.accuracy * 100)}% {t('common.accuracy')}
                    </Txt>
                  </Column>
                  <Txt size="small" color={theme.colors.textMuted}>
                    ▶
                  </Txt>
                </Row>
              </Card>
            ))}
          </Column>
        </>
      ) : null}
    </Screen>
  );
}

/** The exam runner: navigation, marking for review, timer and submission. */
export function ExamRunScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'ExamRun'>>();
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const invalidate = useAppStore((state) => state.invalidateData);
  const { play } = useSound();

  const [snapshot, setSnapshot] = useState<ExamSessionSnapshot | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [typed, setTyped] = useState('');
  const [showNav, setShowNav] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questionStartedAt = useRef(Date.now());
  const timeSpent = useRef<Record<string, number>>({});

  useEffect(() => {
    const run = async (): Promise<void> => {
      try {
        const [built, found] = await Promise.all([
          services.exams.startExam(route.params.examId, { year: route.params.year }),
          services.repositories.exams.getExamById(route.params.examId),
        ]);
        if (!built) {
          setError(t('common.error'));
          return;
        }
        setSnapshot(built);
        setExam(found);
        play('start');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    };
    void run();
  }, [services, route.params.examId, route.params.year, play, t]);

  useEffect(() => {
    navigation.setOptions({ title: t('exams.mockExam'), headerBackVisible: false });
  }, [navigation, t]);

  const current = snapshot?.questions[index];

  useEffect(() => {
    if (!current) return;
    questionStartedAt.current = Date.now();
    setTyped(answers[current.question.id] ?? '');
  }, [current, answers]);

  const recordTime = useCallback((): void => {
    if (!current) return;
    const spent = Date.now() - questionStartedAt.current;
    timeSpent.current[current.question.id] = (timeSpent.current[current.question.id] ?? 0) + spent;
  }, [current]);

  const go = (nextIndex: number): void => {
    recordTime();
    setIndex(Math.max(0, Math.min((snapshot?.questions.length ?? 1) - 1, nextIndex)));
    setShowNav(false);
  };

  const setAnswer = (questionId: string, value: string): void => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
  };

  const submit = useCallback(async (): Promise<void> => {
    if (!snapshot || submitting) return;
    setSubmitting(true);
    recordTime();
    try {
      const filled: ExamSessionSnapshot = {
        ...snapshot,
        questions: snapshot.questions.map((runtime) => ({
          ...runtime,
          givenAnswer: answers[runtime.question.id],
          state: answers[runtime.question.id] ? 'answered' : 'skipped',
          timeSpentMs: timeSpent.current[runtime.question.id] ?? 0,
        })),
      };
      const result = await services.exams.submitExam(filled);
      invalidate();
      if (result) {
        navigation.replace('ExamResult', { attemptId: result.attemptId });
      } else {
        setError(t('common.error'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }, [snapshot, submitting, answers, services, invalidate, navigation, t, recordTime]);

  const confirmSubmit = (): void => {
    Alert.alert(t('exams.submitExam'), t('exams.confirmSubmit'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.submit'), onPress: () => void submit() },
    ]);
  };

  if (error) {
    return (
      <Screen>
        <ErrorState title={t('common.error')} detail={error} onRetry={() => navigation.goBack()} retryLabel={t('common.back')} />
      </Screen>
    );
  }
  if (!snapshot || !exam || !current) return <Loading label={t('common.loading')} />;

  const answeredCount = Object.values(answers).filter((value) => value.length > 0).length;
  const choice = isChoiceQuestion(current.question) || current.question.questionType === 'true_false';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: theme.spacing(4), paddingTop: theme.spacing(2) }}>
        <Row justify="space-between" align="flex-start">
          <Column gap={1}>
            <Txt size="caption" color={theme.colors.textMuted}>
              {index + 1} / {snapshot.questions.length} · {answeredCount} {t('common.done')}
            </Txt>
            <DifficultyPill difficulty={current.question.difficulty} />
          </Column>
          <Countdown
            seconds={snapshot.durationSeconds}
            label={t('games.timeLeft')}
            onExpire={() => void submit()}
          />
        </Row>
        <Spacer size={2} />
        <ProgressBar ratio={(index + 1) / snapshot.questions.length} height={5} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: theme.spacing(8) }}
      >
        {showNav ? (
          <Card>
            <Column gap={3}>
              <Txt size="body" weight="semibold">
                {t('exams.questionNav')}
              </Txt>
              <Row gap={2} wrap>
                {snapshot.questions.map((runtime, runtimeIndex) => {
                  const isAnswered = !!answers[runtime.question.id];
                  const isMarked = marked[runtime.question.id];
                  return (
                    <Button
                      key={runtime.question.id}
                      label={String(runtimeIndex + 1)}
                      size="sm"
                      variant={
                        runtimeIndex === index
                          ? 'primary'
                          : isMarked
                            ? 'danger'
                            : isAnswered
                              ? 'success'
                              : 'secondary'
                      }
                      onPress={() => go(runtimeIndex)}
                    />
                  );
                })}
              </Row>
            </Column>
          </Card>
        ) : (
          <>
            <Card>
              <MathText size="bodyLarge">{questionPrompt(current.question, language)}</MathText>
            </Card>
            <Spacer size={4} />
            {choice ? (
              <Column gap={2}>
                {(current.question.options ?? []).map((option, optionIndex) => (
                  <OptionButton
                    key={option.id}
                    label={optionLabel(optionIndex)}
                    text={optionText(option, language)}
                    state={answers[current.question.id] === option.id ? 'selected' : 'idle'}
                    onPress={() => setAnswer(current.question.id, option.id)}
                  />
                ))}
              </Column>
            ) : (
              <Column gap={2}>
                <Txt size="small" color={theme.colors.textMuted}>
                  {t('practice.yourAnswer')}
                </Txt>
                <Field
                  value={typed}
                  onChangeText={(value) => {
                    setTyped(value);
                    setAnswer(current.question.id, value);
                  }}
                  placeholder={t('practice.typeAnswer')}
                  keyboardType="decimal-pad"
                  mono
                />
              </Column>
            )}
          </>
        )}
      </ScrollView>

      <View
        style={{
          padding: theme.spacing(4),
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          gap: theme.spacing(2),
        }}
      >
        <Row gap={2}>
          <Button
            label={t('common.back')}
            variant="secondary"
            size="sm"
            disabled={index === 0}
            onPress={() => go(index - 1)}
            style={{ flex: 1 }}
          />
          <Button
            label={marked[current.question.id] ? t('exams.marked') : t('exams.markForReview')}
            variant={marked[current.question.id] ? 'danger' : 'ghost'}
            size="sm"
            onPress={() =>
              setMarked((previous) => ({
                ...previous,
                [current.question.id]: !previous[current.question.id],
              }))
            }
            style={{ flex: 1 }}
          />
          <Button
            label={t('common.next')}
            size="sm"
            disabled={index + 1 >= snapshot.questions.length}
            onPress={() => go(index + 1)}
            style={{ flex: 1 }}
          />
        </Row>
        <Row gap={2}>
          <Button
            label={showNav ? t('common.close') : t('exams.questionNav')}
            variant="secondary"
            size="sm"
            onPress={() => setShowNav(!showNav)}
            style={{ flex: 1 }}
          />
          <Button
            label={t('exams.submitExam')}
            variant="success"
            size="sm"
            loading={submitting}
            onPress={confirmSubmit}
            style={{ flex: 1 }}
          />
        </Row>
      </View>
    </SafeAreaView>
  );
}

/** Exam result with the detailed analysis the spec asks for (spec §24, §25). */
export function ExamResultScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'ExamResult'>>();
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t } = useApp();
  const { play } = useSound();
  const [result, setResult] = useState<ExamResult | null>(null);
  const announced = useRef(false);

  useEffect(() => {
    const run = async (): Promise<void> => {
      setResult(await services.exams.getAttemptResult(route.params.attemptId));
    };
    void run();
  }, [services, route.params.attemptId]);

  // A pass gets the fanfare; anything else gets the neutral end-of-run chime.
  // An exam result is not the place to make a low score sound like a failure.
  useEffect(() => {
    if (!result || announced.current) return;
    announced.current = true;
    const ratio = result.maxScore === 0 ? 0 : result.finalScore / result.maxScore;
    play(ratio >= 0.8 ? 'record' : 'complete');
  }, [result, play]);

  useEffect(() => {
    navigation.setOptions({ title: t('exams.result'), headerBackVisible: true });
  }, [navigation, t]);

  if (!result) return <Loading label={t('common.loading')} />;

  const ratio = result.maxScore === 0 ? 0 : result.finalScore / result.maxScore;

  return (
    <Screen scroll>
      <Card accent={theme.colors.primary}>
        <Column gap={3} style={{ alignItems: 'center' }}>
          <MasteryRing ratio={ratio} size={110} thickness={10} label={result.finalScore + ''} />
          <Txt size="title" weight="bold">
            {result.finalScore} / {result.maxScore}
          </Txt>
          {result.percentile !== undefined ? (
            <Txt size="small" color={theme.colors.textMuted}>
              {t('exams.percentile', { percent: result.percentile + '%' })}
            </Txt>
          ) : null}
        </Column>
      </Card>

      <Spacer size={4} />

      <Row gap={3} wrap>
        <StatTile label={t('common.correct')} value={String(result.correct)} emoji="✅" color={theme.colors.success} />
        <StatTile label={t('common.wrong')} value={String(result.wrong)} emoji="✕" color={theme.colors.danger} />
        <StatTile label={t('exams.skipped')} value={String(result.skipped)} emoji="⏭️" />
        <StatTile label={t('common.accuracy')} value={Math.round(result.accuracy * 100) + '%'} emoji="🎯" />
        <StatTile label={t('exams.averageTime')} value={formatDuration(result.averageTimeMs)} emoji="⏱️" />
        {result.negativeMarks > 0 ? (
          <StatTile
            label={t('exams.negativeMarking', { value: result.negativeMarks })}
            value={'−' + result.negativeMarks}
            emoji="⚠️"
            color={theme.colors.danger}
          />
        ) : null}
      </Row>

      {result.weakTopics.length > 0 ? (
        <>
          <Spacer size={4} />
          <SectionHeader title={t('exams.weakTopics')} emoji="⚠️" />
          <Column gap={2}>
            {result.weakTopics.map((topic) => (
              <Card
                key={topic.topicId}
                padded={false}
                style={{ padding: theme.spacing(3) }}
                onPress={() =>
                  navigation.navigate('PracticeRun', {
                    mode: 'practice',
                    title: topic.topicName,
                    topicIds: [topic.topicId],
                    count: 10,
                  })
                }
              >
                <Row justify="space-between">
                  <Column gap={1} style={{ flex: 1 }}>
                    <Txt size="small" weight="semibold">
                      {topic.topicName}
                    </Txt>
                    <ProgressBar ratio={topic.accuracy} height={5} color={theme.colors.warning} />
                  </Column>
                  <Txt size="small" color={theme.colors.textMuted}>
                    {topic.correct}/{topic.total}
                  </Txt>
                </Row>
              </Card>
            ))}
          </Column>
        </>
      ) : null}

      {result.strongTopics.length > 0 ? (
        <>
          <Spacer size={4} />
          <SectionHeader title={t('exams.strongTopics')} emoji="💪" />
          <Card>
            <Column gap={2}>
              {result.strongTopics.map((topic) => (
                <Row key={topic.topicId} justify="space-between">
                  <Txt size="small">{topic.topicName}</Txt>
                  <Txt size="small" color={theme.colors.success}>
                    {Math.round(topic.accuracy * 100)}%
                  </Txt>
                </Row>
              ))}
            </Column>
          </Card>
        </>
      ) : null}

      <Spacer size={5} />
      <Button
        label={t('common.done')}
        full
        size="lg"
        onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
      />
    </Screen>
  );
}
