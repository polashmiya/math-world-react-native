import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { optionText, questionPrompt } from '../../core/question-engine/solutionEngine';
import { isChoiceQuestion, optionLabel } from '../../domain/models';
import type { GameDefinition, Question } from '../../domain/models';
import type { GameListEntry, GameRunState } from '../../domain/services';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Column,
  Countdown,
  DifficultyPill,
  Field,
  LinePlot,
  Loading,
  MathText,
  OptionButton,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  StatTile,
  Stepper,
  Txt,
} from '../../ui/components';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Games list with high scores (spec §28). */
export function GamesScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);
  const [entries, setEntries] = useState<GameListEntry[] | null>(null);

  const load = useCallback(async () => {
    setEntries(await services.games.listGames());
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  useEffect(() => {
    navigation.setOptions({ title: t('games.title') });
  }, [navigation, t]);

  if (!entries) return <Loading label={t('common.loading')} />;

  return (
    <Screen scroll>
      <Column gap={3}>
        {entries.map(({ game, highScore }) => (
          <Card
            key={game.id}
            accent={theme.colors.topic.violet}
            onPress={() => navigation.navigate('GamePlay', { kind: game.kind })}
          >
            <Row gap={3} align="flex-start">
              <Txt size="display">{game.emoji}</Txt>
              <Column gap={2} style={{ flex: 1 }}>
                <Txt size="bodyLarge" weight="semibold">
                  {pickLocalized(language, game.name, game.nameBn)}
                </Txt>
                <Txt size="caption" color={theme.colors.textMuted}>
                  {pickLocalized(language, game.description, game.descriptionBn)}
                </Txt>
                <Row gap={2} wrap>
                  {game.durationSeconds > 0 ? (
                    <Badge label={game.durationSeconds + ' ' + t('common.seconds')} />
                  ) : null}
                  {game.livesAllowed > 0 ? (
                    <Badge label={'❤️ ' + game.livesAllowed} color={theme.colors.danger} />
                  ) : null}
                  <Badge
                    label={
                      highScore && highScore.playCount > 0
                        ? t('games.bestScore', { score: highScore.bestScore })
                        : t('games.notPlayed')
                    }
                    color={highScore && highScore.playCount > 0 ? theme.colors.success : theme.colors.textMuted}
                  />
                </Row>
              </Column>
            </Row>
          </Card>
        ))}
      </Column>

      <Spacer size={4} />
      <Button label={t('lab.title')} icon="🔬" full variant="secondary" onPress={() => navigation.navigate('Lab')} />
    </Screen>
  );
}

/** The game runner: timed, life-based, adaptive difficulty per answer. */
export function GamePlayScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'GamePlay'>>();
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const invalidate = useAppStore((state) => state.invalidateData);
  const pushToast = useAppStore((state) => state.pushToast);

  const [game, setGame] = useState<GameDefinition | null>(null);
  const [state, setState] = useState<GameRunState | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [typed, setTyped] = useState('');
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const roundIndex = useRef(0);
  const finishing = useRef(false);

  const startRun = useCallback(async () => {
    finishing.current = false;
    roundIndex.current = 0;
    setFinalScore(null);
    setTyped('');
    const started = await services.games.startRun(route.params.kind);
    if (!started) return;
    setGame(started.game);
    setState(started.state);
    const first = await services.games.nextRound(started.game, started.state, 0);
    setQuestion(first?.question ?? null);
    const scores = await services.repositories.games.getHighScores();
    setBestScore(scores.find((entry) => entry.gameKind === route.params.kind)?.bestScore ?? 0);
  }, [services, route.params.kind]);

  useEffect(() => {
    void startRun();
  }, [startRun]);

  useEffect(() => {
    if (game) navigation.setOptions({ title: pickLocalized(language, game.name, game.nameBn) });
  }, [game, navigation, language]);

  const finish = useCallback(
    async (runState: GameRunState) => {
      if (finishing.current) return;
      finishing.current = true;
      const record = await services.games.finishRun(runState);
      setFinalScore(record.score);
      invalidate();
      if (record.score > bestScore) {
        pushToast({ kind: 'success', title: '🏆 ' + t('games.newRecord') });
      }
    },
    [services, invalidate, bestScore, pushToast, t],
  );

  const answer = async (given: string): Promise<void> => {
    if (!game || !state || !question || finalScore !== null) return;
    const applied = services.games.answerRound(game, state, question, given);
    setState(applied.state);
    setTyped('');

    if (applied.state.finished) {
      await finish(applied.state);
      return;
    }
    roundIndex.current += 1;
    const next = await services.games.nextRound(game, applied.state, roundIndex.current);
    setQuestion(next?.question ?? null);
  };

  if (!game || !state) return <Loading label={t('common.loading')} />;

  if (finalScore !== null) {
    return (
      <Screen scroll>
        <Card accent={theme.colors.primary}>
          <Column gap={3} style={{ alignItems: 'center' }}>
            <Txt size="display">{game.emoji}</Txt>
            <Txt size="title" weight="bold">
              {t('games.gameOver')}
            </Txt>
            <Txt size="display" weight="bold" color={theme.colors.primary}>
              {finalScore}
            </Txt>
            {finalScore > bestScore ? (
              <Badge label={'🏆 ' + t('games.newRecord')} color={theme.colors.success} />
            ) : (
              <Txt size="small" color={theme.colors.textMuted}>
                {t('games.bestScore', { score: bestScore })}
              </Txt>
            )}
          </Column>
        </Card>

        <Spacer size={4} />
        <Row gap={3} wrap>
          <StatTile label={t('common.correct')} value={String(state.correct)} emoji="✅" />
          <StatTile label={t('common.wrong')} value={String(state.wrong)} emoji="✕" />
          <StatTile label={t('games.combo')} value={String(state.maxCombo)} emoji="🔥" />
          <StatTile label={t('common.difficulty')} value={String(state.difficulty)} emoji="📈" />
        </Row>

        <Spacer size={5} />
        <Column gap={3}>
          <Button label={t('games.playAgain')} icon="🔁" full size="lg" onPress={() => void startRun()} />
          <Button label={t('common.done')} variant="secondary" full onPress={() => navigation.goBack()} />
        </Column>
      </Screen>
    );
  }

  const choice = question ? isChoiceQuestion(question) || question.questionType === 'true_false' : false;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: theme.spacing(4), paddingTop: theme.spacing(2) }}>
        <Row justify="space-between" align="flex-start">
          <Column gap={1}>
            <Row gap={2}>
              <Badge label={t('games.score') + ' ' + (state.correct * 10)} color={theme.colors.primary} />
              {game.livesAllowed > 0 ? (
                <Badge label={'❤️ '.repeat(Math.max(0, state.livesLeft)) || '💀'} color={theme.colors.danger} />
              ) : null}
              {state.combo > 1 ? <Badge label={'🔥 ' + state.combo} color={theme.colors.accent} /> : null}
            </Row>
            <DifficultyPill difficulty={state.difficulty} />
          </Column>
          {game.durationSeconds > 0 ? (
            <Countdown
              seconds={game.durationSeconds}
              label={t('games.timeLeft')}
              onExpire={() => void finish(state)}
            />
          ) : null}
        </Row>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.spacing(4) }}
      >
        {question ? (
          <>
            <Card>
              <MathText size="bodyLarge">{questionPrompt(question, language)}</MathText>
            </Card>
            <Spacer size={4} />
            {choice ? (
              <Column gap={2}>
                {(question.options ?? []).map((option, optionIndex) => (
                  <OptionButton
                    key={option.id}
                    label={optionLabel(optionIndex)}
                    text={optionText(option, language)}
                    onPress={() => void answer(option.id)}
                  />
                ))}
              </Column>
            ) : (
              <Column gap={3}>
                <Field
                  value={typed}
                  onChangeText={setTyped}
                  placeholder={t('practice.typeAnswer')}
                  keyboardType="decimal-pad"
                  mono
                  autoFocus
                  onSubmitEditing={() => void answer(typed)}
                />
                <Button
                  label={t('common.check')}
                  full
                  size="lg"
                  disabled={typed.trim().length === 0}
                  onPress={() => void answer(typed)}
                />
              </Column>
            )}
          </>
        ) : (
          <Loading />
        )}

        <Spacer size={4} />
        <Button label={t('common.finish')} variant="secondary" full onPress={() => void finish(state)} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Math Lab: the probability and function experiments (spec §29). */
export function LabScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t } = useApp();

  const experiments = [
    { id: 'coin' as const, labelKey: 'lab.coin' as const },
    { id: 'die' as const, labelKey: 'lab.die' as const },
    { id: 'two_dice_sum' as const, labelKey: 'lab.twoDice' as const },
    { id: 'card_suit' as const, labelKey: 'lab.card' as const },
  ];
  const trialOptions = [10, 100, 1000, 10000];

  const [experiment, setExperiment] = useState<(typeof experiments)[number]['id']>('coin');
  const [trials, setTrials] = useState(100);
  const [simulation, setSimulation] = useState<ReturnType<typeof services.games.runProbabilityLab> | null>(null);

  const [a, setA] = useState('1');
  const [b, setB] = useState('-4');
  const [c, setC] = useState('3');
  const lab = services.games.functionLab(Number(a) || 0, Number(b) || 0, Number(c) || 0);

  useEffect(() => {
    navigation.setOptions({ title: t('lab.title') });
  }, [navigation, t]);

  return (
    <Screen scroll>
      <SectionHeader title={t('lab.probability')} emoji="🎲" />
      <Card>
        <Column gap={3}>
          <Row gap={2} wrap>
            {experiments.map((item) => (
              <Button
                key={item.id}
                label={t(item.labelKey)}
                size="sm"
                variant={experiment === item.id ? 'primary' : 'secondary'}
                onPress={() => {
                  setExperiment(item.id);
                  setSimulation(null);
                }}
              />
            ))}
          </Row>
          <Row gap={2} wrap>
            {trialOptions.map((option) => (
              <Button
                key={option}
                label={String(option)}
                size="sm"
                variant={trials === option ? 'primary' : 'secondary'}
                onPress={() => setTrials(option)}
              />
            ))}
          </Row>
          <Button
            label={t('lab.run')}
            icon="▶"
            full
            onPress={() =>
              setSimulation(services.games.runProbabilityLab(experiment, trials, Date.now()))
            }
          />

          {simulation ? (
            <Column gap={3}>
              <Row justify="space-between">
                <Txt size="caption" color={theme.colors.textMuted}>
                  {t('lab.trials')}: {simulation.trials}
                </Txt>
                <Txt size="caption" color={theme.colors.textMuted}>
                  Δ {(simulation.maxDeviation * 100).toFixed(2)}%
                </Txt>
              </Row>
              {simulation.outcomes.map((outcome) => (
                <Column key={outcome.label} gap={1}>
                  <Row justify="space-between">
                    <Txt size="small">{outcome.label}</Txt>
                    <Txt size="caption" color={theme.colors.textMuted}>
                      {(outcome.observed * 100).toFixed(1)}% / {(outcome.expected * 100).toFixed(1)}%
                    </Txt>
                  </Row>
                  <Row gap={1}>
                    <View style={{ flex: 1 }}>
                      <ObservedBar observed={outcome.observed} expected={outcome.expected} />
                    </View>
                  </Row>
                </Column>
              ))}
              <Card
                padded={false}
                style={{ backgroundColor: theme.colors.infoSoft, padding: theme.spacing(3), borderWidth: 0 }}
              >
                <Txt size="small">{simulation.explanation}</Txt>
              </Card>
            </Column>
          ) : null}
        </Column>
      </Card>

      <Spacer size={4} />

      <SectionHeader title={t('lab.functions')} emoji="📈" />
      <Card>
        <Column gap={3}>
          <MathText align="center">{'f(x) = ' + lab.expression}</MathText>
          <Row gap={2}>
            <Column gap={1} style={{ flex: 1 }}>
              <Txt size="caption" color={theme.colors.textMuted}>
                a
              </Txt>
              <Field value={a} onChangeText={setA} keyboardType="numeric" mono />
            </Column>
            <Column gap={1} style={{ flex: 1 }}>
              <Txt size="caption" color={theme.colors.textMuted}>
                b
              </Txt>
              <Field value={b} onChangeText={setB} keyboardType="numeric" mono />
            </Column>
            <Column gap={1} style={{ flex: 1 }}>
              <Txt size="caption" color={theme.colors.textMuted}>
                c
              </Txt>
              <Field value={c} onChangeText={setC} keyboardType="numeric" mono />
            </Column>
          </Row>

          <FunctionPlot points={lab.points} />

          <Row gap={3} wrap>
            <StatTile
              label={t('lab.vertex')}
              value={lab.vertex ? '(' + lab.vertex.x.toFixed(2) + ', ' + lab.vertex.y.toFixed(2) + ')' : '—'}
              emoji="📍"
            />
            <StatTile label={t('lab.discriminant')} value={String(lab.discriminant)} emoji="🔢" />
            <StatTile label={t('lab.roots')} value={String(lab.realRootCount)} emoji="🎯" />
          </Row>
        </Column>
      </Card>

      <Spacer size={4} />
      <GeometryLab />
    </Screen>
  );
}

/** Geometry Lab: change a dimension and watch every measurement move (spec §29). */
function GeometryLab(): React.JSX.Element {
  const services = useServices();
  const theme = useTheme();
  const { t } = useApp();

  const shapes = ['rectangle', 'triangle', 'circle'] as const;
  const [shape, setShape] = useState<(typeof shapes)[number]>('rectangle');
  const [a, setA] = useState(8);
  const [b, setB] = useState(5);
  const result = services.games.geometryLab(shape, a, b);

  return (
    <>
      <SectionHeader title={t('lab.geometry')} emoji="📐" />
      <Card>
        <Column gap={3}>
          <Row gap={2} wrap>
            {shapes.map((option) => (
              <Button
                key={option}
                label={option}
                size="sm"
                variant={shape === option ? 'primary' : 'secondary'}
                onPress={() => setShape(option)}
              />
            ))}
          </Row>

          <Stepper
            label={shape === 'circle' ? 'radius' : shape === 'triangle' ? 'base' : 'length'}
            value={a}
            onChange={setA}
            min={1}
            max={40}
          />
          {shape !== 'circle' ? (
            <Stepper
              label={shape === 'triangle' ? 'height' : 'width'}
              value={b}
              onChange={setB}
              min={1}
              max={40}
            />
          ) : null}

          <Column gap={2}>
            {result.measurements.map((measurement) => (
              <Row key={measurement.label} justify="space-between">
                <Txt size="small">{measurement.label}</Txt>
                <Txt size="small" weight="semibold" mono>
                  {measurement.value.toFixed(2)} {measurement.unit}
                </Txt>
              </Row>
            ))}
          </Column>

          <Card
            padded={false}
            style={{ backgroundColor: theme.colors.surfaceAlt, padding: theme.spacing(3), borderWidth: 0 }}
          >
            <Column gap={1}>
              {result.steps.slice(0, 6).map((step, index) => (
                <MathText key={'geo-step-' + index} size="small">
                  {step}
                </MathText>
              ))}
            </Column>
          </Card>
        </Column>
      </Card>
    </>
  );
}

function ObservedBar({ observed, expected }: { observed: number; expected: number }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ gap: 3 }}>
      <View
        style={{
          height: 10,
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.pill,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: (Math.min(1, observed) * 100).toFixed(2) + '%' as `${number}%`,
            height: '100%',
            backgroundColor: theme.colors.primary,
          }}
        />
      </View>
      <View
        style={{
          height: 4,
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.pill,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: (Math.min(1, expected) * 100).toFixed(2) + '%' as `${number}%`,
            height: '100%',
            backgroundColor: theme.colors.textMuted,
          }}
        />
      </View>
    </View>
  );
}

function FunctionPlot({ points }: { points: { x: number; y: number | null }[] }): React.JSX.Element {
  // Clamp the vertical range so a steep parabola stays readable.
  const finite = points.filter((p): p is { x: number; y: number } => p.y !== null);
  const values = finite.map((p) => p.y);
  const min = values.length ? Math.max(-50, Math.min(...values)) : -1;
  const max = values.length ? Math.min(50, Math.max(...values)) : 1;
  return <LinePlot points={points} height={180} yRange={[min, max]} />;
}
