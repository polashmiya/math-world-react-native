import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { optionText, questionPrompt } from '../../core/question-engine/solutionEngine';
import { validateAnswer } from '../../core/question-engine/answerValidator';
import { isChoiceQuestion, optionLabel } from '../../domain/models';
import type { Challenge, Question } from '../../domain/models';
import type { ChallengeEntry, MissionEntry, TournamentStanding } from '../../domain/services';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Column,
  Countdown,
  DifficultyPill,
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

/** Bosses, missions and the offline tournament (spec §33–§35). */
export function ChallengesScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const dataVersion = useAppStore((state) => state.dataVersion);
  const invalidate = useAppStore((state) => state.invalidateData);
  const pushToast = useAppStore((state) => state.pushToast);
  const { play } = useSound();

  const [bosses, setBosses] = useState<ChallengeEntry[] | null>(null);
  const [missions, setMissions] = useState<MissionEntry[]>([]);
  const [standing, setStanding] = useState<TournamentStanding | null>(null);

  const load = useCallback(async () => {
    const [bossList, missionList, tournament] = await Promise.all([
      services.challenges.listBosses(),
      services.challenges.getMissions(),
      services.challenges.getTournamentStanding(),
    ]);
    setBosses(bossList);
    setMissions(missionList);
    setStanding(tournament);
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  useEffect(() => {
    navigation.setOptions({ title: t('challenges.title') });
  }, [navigation, t]);

  if (!bosses || !standing) return <Loading label={t('common.loading')} />;

  const claim = async (entry: MissionEntry): Promise<void> => {
    const xp = await services.challenges.claimMission(entry.mission);
    if (xp > 0) {
      play('reward');
      pushToast({ kind: 'success', title: '+' + xp + ' ' + t('common.xp') });
      invalidate();
      await load();
    }
  };

  const dailyMissions = missions.filter((entry) => entry.challenge?.kind === 'daily_mission');
  const weeklyMissions = missions.filter((entry) => entry.challenge?.kind === 'weekly_mission');
  const monthlyMissions = missions.filter((entry) => entry.challenge?.kind === 'monthly_challenge');

  return (
    <Screen scroll>
      <Card accent={theme.colors.accent}>
        <Row justify="space-between" align="flex-start">
          <Column gap={2} style={{ flex: 1 }}>
            <Txt size="caption" color={theme.colors.textMuted}>
              {t('challenges.tier')}
            </Txt>
            <Txt size="title" weight="bold">
              🏆 {standing.tier.toUpperCase()}
            </Txt>
            {standing.nextTier ? (
              <Txt size="caption" color={theme.colors.textMuted}>
                {t('challenges.nextTier', {
                  xp: standing.nextTier.xpNeeded,
                  tier: standing.nextTier.tier,
                })}
              </Txt>
            ) : null}
          </Column>
          <Column gap={1} style={{ alignItems: 'flex-end' }}>
            <Txt size="caption" color={theme.colors.textMuted}>
              {t('common.xp')}
            </Txt>
            <Txt size="bodyLarge" weight="bold">
              {standing.xp}
            </Txt>
          </Column>
        </Row>
        <Spacer size={3} />
        <Column gap={1}>
          <Txt size="caption" color={theme.colors.textMuted}>
            {t('challenges.rivals')}
          </Txt>
          {standing.rivals.map((rival) => (
            <Row key={rival.name} justify="space-between">
              <Txt size="small">{rival.name}</Txt>
              <Txt size="small" color={theme.colors.textMuted}>
                {rival.score}
              </Txt>
            </Row>
          ))}
          <Row justify="space-between">
            <Txt size="small" weight="semibold">
              {t('challenges.yourBest')}
            </Txt>
            <Txt size="small" weight="semibold" color={theme.colors.primary}>
              {standing.personalBest}
            </Txt>
          </Row>
        </Column>
        <Spacer size={3} />
        <Button
          label={t('challenges.tournament')}
          icon="🏆"
          full
          onPress={() => navigation.navigate('BossBattle', { challengeId: 'challenge.tournament-weekly' })}
        />
      </Card>

      <Spacer size={4} />

      <MissionGroup title={t('challenges.daily')} entries={dailyMissions} onClaim={claim} />
      <MissionGroup title={t('challenges.weekly')} entries={weeklyMissions} onClaim={claim} />
      <MissionGroup title={t('challenges.monthly')} entries={monthlyMissions} onClaim={claim} />

      <SectionHeader title={t('challenges.bosses')} emoji="👾" />
      <Column gap={2}>
        {bosses.map((entry) => (
          <Card
            key={entry.challenge.id}
            padded={false}
            style={{ padding: theme.spacing(3) }}
            disabled={!entry.unlocked}
            accent={entry.defeated ? theme.colors.success : theme.colors.topic.rose}
            onPress={
              entry.unlocked
                ? () => navigation.navigate('BossBattle', { challengeId: entry.challenge.id })
                : undefined
            }
          >
            <Row justify="space-between">
              <Row gap={3} style={{ flex: 1 }}>
                <Txt size="title">{entry.defeated ? '🏅' : entry.unlocked ? '👾' : '🔒'}</Txt>
                <Column gap={1} style={{ flex: 1 }}>
                  <Txt size="body" weight="semibold" numberOfLines={1}>
                    {pickLocalized(language, entry.challenge.name, entry.challenge.nameBn)}
                  </Txt>
                  <Txt size="caption" color={theme.colors.textMuted}>
                    {entry.defeated
                      ? t('challenges.defeated')
                      : entry.unlocked
                        ? entry.challenge.questionCount + ' ' + t('common.questions')
                        : t('challenges.requiresMastery', {
                            percent: Math.round(entry.challenge.requiredMastery * 100) + '%',
                          })}
                  </Txt>
                </Column>
              </Row>
              <MasteryRing ratio={entry.mastery} size={40} thickness={4} />
            </Row>
          </Card>
        ))}
      </Column>
    </Screen>
  );
}

function MissionGroup({
  title,
  entries,
  onClaim,
}: {
  title: string;
  entries: MissionEntry[];
  onClaim: (entry: MissionEntry) => Promise<void>;
}): React.JSX.Element | null {
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  if (entries.length === 0) return null;

  return (
    <>
      <SectionHeader title={title} emoji="🎯" />
      <Column gap={2} style={{ marginBottom: theme.spacing(4) }}>
        {entries.map((entry) => (
          <Card key={entry.mission.id} padded={false} style={{ padding: theme.spacing(3) }}>
            <Row justify="space-between">
              <Column gap={1} style={{ flex: 1 }}>
                <Row gap={2} wrap>
                  <Txt size="small" weight="semibold">
                    {entry.challenge?.emoji}{' '}
                    {entry.challenge
                      ? pickLocalized(language, entry.challenge.name, entry.challenge.nameBn)
                      : entry.mission.code}
                  </Txt>
                  {entry.mission.completed ? (
                    <Badge
                      label={entry.mission.claimedAt ? t('challenges.claimed') : t('common.done')}
                      color={theme.colors.success}
                    />
                  ) : null}
                </Row>
                <ProgressBar
                  ratio={entry.mission.progress / Math.max(1, entry.mission.target)}
                  height={6}
                  color={entry.mission.completed ? theme.colors.success : theme.colors.primary}
                />
                <Txt size="caption" color={theme.colors.textMuted}>
                  {entry.mission.progress} / {entry.mission.target}
                  {entry.challenge ? ' · +' + entry.challenge.xpReward + ' ' + t('common.xp') : ''}
                </Txt>
              </Column>
              {entry.mission.completed && !entry.mission.claimedAt ? (
                <Button label={t('challenges.claim')} size="sm" onPress={() => void onClaim(entry)} />
              ) : null}
            </Row>
          </Card>
        ))}
      </Column>
    </>
  );
}

/** The boss battle runner (spec §34): increasing difficulty, limited hints. */
export function BossBattleScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'BossBattle'>>();
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const language = settings?.language ?? 'bn';
  const invalidate = useAppStore((state) => state.invalidateData);
  const pushToast = useAppStore((state) => state.pushToast);
  const { play } = useSound();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [correct, setCorrect] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ passed: boolean; xp: number } | null>(null);
  const startedAt = useRef(Date.now());
  const questionStartedAt = useRef(Date.now());

  const start = useCallback(async () => {
    setOutcome(null);
    setIndex(0);
    setCorrect(0);
    setHintsUsed(0);
    setHintText(null);
    setTyped('');
    startedAt.current = Date.now();
    questionStartedAt.current = Date.now();
    const started = await services.challenges.startChallenge(route.params.challengeId);
    if (!started) return;
    setChallenge(started.challenge);
    setQuestions(started.questions);
    play('start');
  }, [services, route.params.challengeId, play]);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    if (challenge) {
      navigation.setOptions({ title: pickLocalized(language, challenge.name, challenge.nameBn) });
    }
  }, [challenge, navigation, language]);

  const question = questions[index];

  const finish = useCallback(
    async (finalCorrect: number) => {
      if (!challenge) return;
      const result = await services.challenges.finishChallenge(
        challenge,
        finalCorrect,
        questions.length,
        startedAt.current,
      );
      setOutcome({ passed: result.passed, xp: result.xpEarned });
      invalidate();
      if (result.passed) {
        play('achievement');
        pushToast({ kind: 'achievement', title: '🏅 ' + t('challenges.defeated') });
      } else {
        play('complete');
      }
    },
    [challenge, services, questions.length, invalidate, pushToast, play, t],
  );

  const answer = async (given: string): Promise<void> => {
    if (!question || !challenge) return;
    const isCorrect = validateAnswer(question, given).isCorrect;
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    setCorrect(nextCorrect);
    play(isCorrect ? 'correct' : 'incorrect');

    // Attempts still count towards mastery and the mistake bank.
    await services.practice.submitAnswer({
      question,
      givenAnswer: given,
      timeSpentMs: Date.now() - questionStartedAt.current,
      hintsUsed,
      mode: challenge.kind === 'boss' ? 'boss' : 'challenge',
    });

    setTyped('');
    setHintText(null);
    if (index + 1 >= questions.length) {
      await finish(nextCorrect);
      return;
    }
    setIndex(index + 1);
    questionStartedAt.current = Date.now();
  };

  const showHint = async (): Promise<void> => {
    if (!question || !challenge || hintsUsed >= challenge.hintsAllowed) return;
    play('hint');
    const nextLevel = hintsUsed + 1;
    setHintsUsed(nextLevel);
    setHintText(await services.repositories.tutor.giveHint(question, nextLevel));
  };

  if (!challenge) return <Loading label={t('common.loading')} />;

  if (outcome) {
    const accuracy = questions.length === 0 ? 0 : correct / questions.length;
    return (
      <Screen scroll>
        <Card accent={outcome.passed ? theme.colors.success : theme.colors.danger}>
          <Column gap={3} style={{ alignItems: 'center' }}>
            <Txt size="display">{outcome.passed ? '🏅' : '💪'}</Txt>
            <Txt size="title" weight="bold">
              {outcome.passed ? t('challenges.defeated') : t('common.retry')}
            </Txt>
            <MasteryRing ratio={accuracy} size={100} thickness={9} />
            <Txt size="bodyLarge" weight="semibold">
              {correct} / {questions.length}
            </Txt>
            {outcome.xp > 0 ? (
              <Badge label={'+' + outcome.xp + ' ' + t('common.xp')} color={theme.colors.accent} />
            ) : null}
          </Column>
        </Card>
        <Spacer size={5} />
        <Column gap={3}>
          <Button label={t('common.retry')} icon="🔁" full size="lg" sound={null} onPress={() => void start()} />
          <Button label={t('common.done')} variant="secondary" full onPress={() => navigation.goBack()} />
        </Column>
      </Screen>
    );
  }

  if (!question) return <Loading />;

  const choice = isChoiceQuestion(question) || question.questionType === 'true_false';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: theme.spacing(4), paddingTop: theme.spacing(2) }}>
        <Row justify="space-between" align="flex-start">
          <Column gap={1}>
            <Txt size="caption" color={theme.colors.textMuted}>
              {index + 1} / {questions.length} · {correct} {t('common.correct')}
            </Txt>
            <DifficultyPill difficulty={question.difficulty} />
          </Column>
          {challenge.durationSeconds > 0 ? (
            <Countdown
              seconds={challenge.durationSeconds}
              label={t('games.timeLeft')}
              onExpire={() => void finish(correct)}
            />
          ) : null}
        </Row>
        <Spacer size={2} />
        <ProgressBar ratio={(index + 1) / questions.length} height={5} color={theme.colors.topic.rose} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.spacing(4) }}
      >
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

        <Spacer size={3} />
        <Row gap={2}>
          <Button
            label={t('practice.hint') + ' (' + (challenge.hintsAllowed - hintsUsed) + ')'}
            icon="💡"
            size="sm"
            variant="secondary"
            disabled={hintsUsed >= challenge.hintsAllowed}
            onPress={() => void showHint()}
          />
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
      </ScrollView>
    </SafeAreaView>
  );
}
