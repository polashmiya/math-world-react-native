import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { DIFFICULTY_BANDS, type DifficultyBand } from '../../core/constants/difficulty';
import { LANGUAGES, type Language } from '../../core/constants/levels';
import { LEARNING_GOALS, LEARNING_GOAL_LABELS, type LearningGoal } from '../../domain/models/user';
import type { ProfileOverview } from '../../domain/services';
import { LANGUAGE_LABELS, pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Column,
  Divider,
  FadeInView,
  Field,
  Loading,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  StatTile,
  Stepper,
  Toggle,
  Txt,
} from '../../ui/components';
import { useAppStore } from '../../store';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AVATARS = ['🧑‍🎓', '👩‍🎓', '🧑‍🏫', '🦊', '🐼', '🦉', '🚀', '🌟', '🧠', '🔢'];

/** Local profile and settings (spec §41, §46). No account, no network. */
export function ProfileScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, refreshUser, boot } = useApp();
  const dataVersion = useAppStore((state) => state.dataVersion);
  const invalidate = useAppStore((state) => state.invalidateData);

  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    const result = await services.profile.getOverview();
    setOverview(result);
    setName(result.profile.name);
  }, [services]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  useEffect(() => {
    navigation.setOptions({ title: t('profile.title') });
  }, [navigation, t]);

  if (!overview) return <Loading label={t('common.loading')} />;

  const { profile, settings, packs, contentStats, achievements } = overview;
  const language = settings.language;
  const unlockedCount = achievements.filter((view) => view.unlocked).length;

  const update = async (changes: Parameters<typeof services.profile.updateProfile>[0]): Promise<void> => {
    await services.profile.updateProfile(changes);
    await refreshUser();
    invalidate();
    await load();
  };

  const updateSettings = async (
    changes: Parameters<typeof services.profile.updateSettings>[0],
  ): Promise<void> => {
    await services.profile.updateSettings(changes);
    await refreshUser();
    await load();
  };

  return (
    <Screen scroll>
      <Card accent={theme.colors.primary}>
        <Column gap={3}>
          <Row gap={3}>
            <Txt size="display">{profile.avatarEmoji}</Txt>
            <Column gap={1} style={{ flex: 1 }}>
              <Txt size="title" weight="bold">
                {profile.name.trim().length > 0 ? profile.name : t('profile.yourName')}
              </Txt>
              <Badge
                label={pickLocalized(
                  language,
                  LEARNING_GOAL_LABELS[profile.learningGoal].en,
                  LEARNING_GOAL_LABELS[profile.learningGoal].bn,
                )}
                color={theme.colors.primary}
              />
            </Column>
          </Row>
          <Row gap={2} wrap>
            {AVATARS.map((avatar) => (
              <Button
                key={avatar}
                label={avatar}
                size="sm"
                variant={profile.avatarEmoji === avatar ? 'primary' : 'secondary'}
                onPress={() => void update({ avatarEmoji: avatar })}
              />
            ))}
          </Row>
        </Column>
      </Card>

      <Spacer size={4} />

      <SectionHeader title={t('profile.name')} emoji="✏️" />
      <Card>
        <Column gap={3}>
          <Field value={name} onChangeText={setName} placeholder={t('profile.yourName')} />
          <Button
            label={t('common.save')}
            disabled={name === profile.name}
            onPress={() => void update({ name: name.trim() })}
          />
        </Column>
      </Card>

      <Spacer size={4} />

      <SectionHeader title={t('profile.learningGoal')} emoji="🎯" />
      <Row gap={2} wrap>
        {LEARNING_GOALS.map((goal: LearningGoal) => (
          <Button
            key={goal}
            label={
              LEARNING_GOAL_LABELS[goal].emoji +
              ' ' +
              pickLocalized(language, LEARNING_GOAL_LABELS[goal].en, LEARNING_GOAL_LABELS[goal].bn)
            }
            size="sm"
            variant={profile.learningGoal === goal ? 'primary' : 'secondary'}
            onPress={() => void update({ learningGoal: goal })}
          />
        ))}
      </Row>

      <Spacer size={4} />

      <SectionHeader title={t('profile.language')} emoji="🌐" />
      <Row gap={2}>
        {LANGUAGES.map((code: Language) => (
          <Button
            key={code}
            label={LANGUAGE_LABELS[code]}
            variant={language === code ? 'primary' : 'secondary'}
            onPress={() => void updateSettings({ language: code })}
          />
        ))}
      </Row>

      <Spacer size={4} />

      <SectionHeader title={t('profile.dailyGoal')} emoji="📅" />
      <Card>
        <Column gap={2}>
          <Stepper
            label={t('profile.dailyQuestions')}
            value={profile.dailyGoalQuestions}
            onChange={(value) => void update({ dailyGoalQuestions: value })}
            min={5}
            max={200}
            step={5}
          />
          <Divider />
          <Stepper
            label={t('profile.dailyMinutes')}
            value={profile.dailyGoalMinutes}
            onChange={(value) => void update({ dailyGoalMinutes: value })}
            min={5}
            max={240}
            step={5}
            suffix={t('common.minutes')}
          />
        </Column>
      </Card>

      <Spacer size={4} />

      <SectionHeader title={t('profile.difficultyPreference')} emoji="📈" />
      <Row gap={2} wrap>
        <Button
          label={t('practice.adaptive')}
          size="sm"
          variant={profile.difficultyPreference === 'adaptive' ? 'primary' : 'secondary'}
          onPress={() => void update({ difficultyPreference: 'adaptive' })}
        />
        {DIFFICULTY_BANDS.map((band: DifficultyBand) => (
          <Button
            key={band}
            label={band}
            size="sm"
            variant={profile.difficultyPreference === band ? 'primary' : 'secondary'}
            onPress={() => void update({ difficultyPreference: band })}
          />
        ))}
      </Row>

      <Spacer size={4} />

      <Row gap={3} wrap>
        <StatTile
          label={t('progress.achievements')}
          value={unlockedCount + ' / ' + achievements.length}
          emoji="🏆"
          onPress={() => navigation.navigate('Achievements')}
        />
        <StatTile
          label={t('profile.contentPacks')}
          value={String(packs.length)}
          emoji="📦"
        />
      </Row>

      <Spacer size={4} />

      <SectionHeader title={t('profile.settings')} emoji="⚙️" />
      <Card>
        <Column gap={1}>
          <Row gap={2} wrap>
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <Button
                key={mode}
                label={t(
                  mode === 'light'
                    ? 'profile.themeLight'
                    : mode === 'dark'
                      ? 'profile.themeDark'
                      : 'profile.themeSystem',
                )}
                size="sm"
                variant={settings.themeMode === mode ? 'primary' : 'secondary'}
                onPress={() => void updateSettings({ themeMode: mode })}
              />
            ))}
          </Row>
          <Divider />
          <Toggle
            label={t('profile.largeText')}
            value={settings.largeText}
            onChange={(value) => void updateSettings({ largeText: value })}
          />
          <Toggle
            label={t('profile.highContrast')}
            value={settings.highContrast}
            onChange={(value) => void updateSettings({ highContrast: value })}
          />
          <Toggle
            label={t('profile.reduceAnimations')}
            value={settings.reduceAnimations}
            onChange={(value) => void updateSettings({ reduceAnimations: value })}
          />
          <Toggle
            label={t('profile.banglaDigits')}
            value={settings.showBanglaDigits}
            onChange={(value) => void updateSettings({ showBanglaDigits: value })}
          />
          <Divider />
          <Toggle
            label={t('profile.thinkFirst')}
            value={settings.thinkFirstEnabled}
            onChange={(value) => void updateSettings({ thinkFirstEnabled: value })}
          />
          <Toggle
            label={t('profile.adaptiveDifficulty')}
            value={settings.adaptiveDifficultyEnabled}
            onChange={(value) => void updateSettings({ adaptiveDifficultyEnabled: value })}
          />
          <Toggle
            label={t('profile.spacedRepetition')}
            value={settings.spacedRepetitionEnabled}
            onChange={(value) => void updateSettings({ spacedRepetitionEnabled: value })}
          />
        </Column>
      </Card>

      <Spacer size={4} />

      <SectionHeader title={t('profile.contentPacks')} emoji="📦" />
      <Card>
        <Column gap={2}>
          {packs.map((pack, index) => (
            <Column key={pack.id} gap={1}>
              {index > 0 ? <Divider /> : null}
              <Row justify="space-between" style={{ paddingVertical: theme.spacing(2) }}>
                <Column gap={1} style={{ flex: 1 }}>
                  <Txt size="small" weight="medium">
                    {pack.id.replace('pack.', '')}
                  </Txt>
                  <Txt size="caption" color={theme.colors.textMuted}>
                    v{pack.version} · {new Date(pack.seededAt).toLocaleDateString()}
                  </Txt>
                </Column>
                <Badge
                  label={pack.enabled ? t('common.yes') : t('common.no')}
                  color={pack.enabled ? theme.colors.success : theme.colors.textMuted}
                />
              </Row>
            </Column>
          ))}
        </Column>
      </Card>

      <Spacer size={4} />

      <SectionHeader title={t('profile.about')} emoji="ℹ️" />
      <Card>
        <Column gap={2}>
          <Txt size="small">{t('profile.aboutBody')}</Txt>
          <Txt size="caption" color={theme.colors.textMuted}>
            {t('profile.contentStats', {
              questions: contentStats.questions,
              lessons: contentStats.lessons,
              formulas: contentStats.formulas,
            })}
          </Txt>
          <Txt size="caption" color={theme.colors.textMuted}>
            {t('profile.schemaVersion', { version: boot.schemaVersion ?? 0 })}
          </Txt>
        </Column>
      </Card>
    </Screen>
  );
}

/** Onboarding: name, goal, language and daily target — all local (spec §41). */
export function OnboardingScreen(): React.JSX.Element {
  const services = useServices();
  const theme = useTheme();
  const { t, refreshUser, settings } = useApp();
  const language = settings?.language ?? 'bn';

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<LearningGoal>('school');
  const [chosenLanguage, setChosenLanguage] = useState<Language>(language);
  const [questionsPerDay, setQuestionsPerDay] = useState(20);
  const [saving, setSaving] = useState(false);

  const finish = async (): Promise<void> => {
    setSaving(true);
    await services.profile.updateProfile({
      name: name.trim().length > 0 ? name.trim() : 'Learner',
      learningGoal: goal,
      language: chosenLanguage,
      dailyGoalQuestions: questionsPerDay,
      dailyGoalMinutes: Math.max(10, Math.round(questionsPerDay * 1.2)),
    });
    await services.profile.setLanguage(chosenLanguage);
    await refreshUser();
    setSaving(false);
  };

  return (
    <Screen scroll>
      <Spacer size={6} />
      <Column gap={2} style={{ alignItems: 'center' }}>
        <Txt size="display">🧮</Txt>
        <Txt size="heading" weight="bold" align="center">
          {t('onboarding.welcome')}
        </Txt>
        <Txt size="small" color={theme.colors.textMuted} align="center">
          {t('onboarding.intro')}
        </Txt>
      </Column>

      <Spacer size={5} />
      <ProgressBar ratio={(step + 1) / 5} height={6} />
      <Spacer size={4} />

      {step === 0 ? (
        <Card>
          <Column gap={3}>
            <Txt size="bodyLarge" weight="semibold">
              {t('onboarding.pickLanguage')}
            </Txt>
            <Row gap={2}>
              {LANGUAGES.map((code) => (
                <Button
                  key={code}
                  label={LANGUAGE_LABELS[code]}
                  variant={chosenLanguage === code ? 'primary' : 'secondary'}
                  onPress={() => setChosenLanguage(code)}
                />
              ))}
            </Row>
          </Column>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <Column gap={3}>
            <Txt size="bodyLarge" weight="semibold">
              {t('onboarding.whatsYourName')}
            </Txt>
            <Field value={name} onChangeText={setName} placeholder={t('profile.yourName')} autoFocus />
          </Column>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <Column gap={3}>
            <Txt size="bodyLarge" weight="semibold">
              {t('onboarding.pickGoal')}
            </Txt>
            <Row gap={2} wrap>
              {LEARNING_GOALS.map((option) => (
                <Button
                  key={option}
                  label={
                    LEARNING_GOAL_LABELS[option].emoji +
                    ' ' +
                    pickLocalized(
                      chosenLanguage,
                      LEARNING_GOAL_LABELS[option].en,
                      LEARNING_GOAL_LABELS[option].bn,
                    )
                  }
                  size="sm"
                  variant={goal === option ? 'primary' : 'secondary'}
                  onPress={() => setGoal(option)}
                />
              ))}
            </Row>
          </Column>
        </Card>
      ) : null}

      {step === 3 ? (
        <Column gap={3}>
          <Txt size="bodyLarge" weight="semibold">
            {t('onboarding.tourTitle')}
          </Txt>
          <FadeInView delay={0}>
            <Card accent={theme.colors.topic.green}>
              <Row gap={3}>
                <Txt size="heading">📘</Txt>
                <Column gap={1} style={{ flex: 1 }}>
                  <Txt size="body" weight="semibold">
                    {t('learn.title')}
                  </Txt>
                  <Txt size="small" color={theme.colors.textMuted}>
                    {t('onboarding.tourLearnDesc')}
                  </Txt>
                </Column>
              </Row>
            </Card>
          </FadeInView>
          <FadeInView delay={80}>
            <Card accent={theme.colors.topic.blue}>
              <Row gap={3}>
                <Txt size="heading">✏️</Txt>
                <Column gap={1} style={{ flex: 1 }}>
                  <Txt size="body" weight="semibold">
                    {t('practice.title')}
                  </Txt>
                  <Txt size="small" color={theme.colors.textMuted}>
                    {t('onboarding.tourPracticeDesc')}
                  </Txt>
                </Column>
              </Row>
            </Card>
          </FadeInView>
          <FadeInView delay={160}>
            <Card accent={theme.colors.topic.violet}>
              <Row gap={3}>
                <Txt size="heading">🧠</Txt>
                <Column gap={1} style={{ flex: 1 }}>
                  <Txt size="body" weight="semibold">
                    {t('brain.title')}
                  </Txt>
                  <Txt size="small" color={theme.colors.textMuted}>
                    {t('onboarding.tourBrainDesc')}
                  </Txt>
                </Column>
              </Row>
            </Card>
          </FadeInView>
          <FadeInView delay={240}>
            <Card accent={theme.colors.topic.amber}>
              <Row gap={3}>
                <Txt size="heading">📝</Txt>
                <Column gap={1} style={{ flex: 1 }}>
                  <Txt size="body" weight="semibold">
                    {t('exams.title')}
                  </Txt>
                  <Txt size="small" color={theme.colors.textMuted}>
                    {t('onboarding.tourExamsDesc')}
                  </Txt>
                </Column>
              </Row>
            </Card>
          </FadeInView>
        </Column>
      ) : null}

      {step === 4 ? (
        <Card>
          <Column gap={3}>
            <Txt size="bodyLarge" weight="semibold">
              {t('onboarding.dailyTarget')}
            </Txt>
            <Stepper
              label={t('profile.dailyQuestions')}
              value={questionsPerDay}
              onChange={setQuestionsPerDay}
              min={5}
              max={100}
              step={5}
            />
            <Txt size="small" color={theme.colors.textMuted}>
              {t('onboarding.readyBody')}
            </Txt>
          </Column>
        </Card>
      ) : null}

      <Spacer size={5} />

      <Row gap={3}>
        <Button
          label={t('common.back')}
          variant="secondary"
          disabled={step === 0}
          onPress={() => setStep((value) => Math.max(0, value - 1))}
          style={{ flex: 1 }}
        />
        {step < 4 ? (
          <Button
            label={t('common.next')}
            onPress={() => setStep((value) => Math.min(4, value + 1))}
            style={{ flex: 1 }}
          />
        ) : (
          <Button
            label={t('onboarding.getStarted')}
            loading={saving}
            onPress={() => void finish()}
            style={{ flex: 1 }}
          />
        )}
      </Row>

      <Spacer size={4} />
      <Txt size="caption" color={theme.colors.textMuted} align="center">
        {t('common.offline')}
      </Txt>
    </Screen>
  );
}
