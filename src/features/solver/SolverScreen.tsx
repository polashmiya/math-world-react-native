import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useApp, useServices, useTheme } from '../../app/providers/AppProvider';
import type { RootStackParamList } from '../../app/navigation/types';
import { SOLVER_MODULES, type SolverModule, type SolverOutput } from '../../domain/services';
import type { AngleUnit } from '../../core/math/trigonometry';
import { pickLocalized } from '../../i18n';
import {
  Badge,
  Button,
  Card,
  Column,
  ErrorState,
  Field,
  MathText,
  Row,
  Screen,
  SectionHeader,
  Spacer,
  Txt,
} from '../../ui/components';
import { useSound } from '../../ui/sound';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * The offline Math Solver (spec §26). Input → interpretation → steps → answer,
 * with every value computed by the Math Engine.
 */
export function SolverScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'Solver'>>();
  const navigation = useNavigation<Nav>();
  const services = useServices();
  const theme = useTheme();
  const { t, settings } = useApp();
  const { play } = useSound();
  const language = settings?.language ?? 'bn';

  const [module, setModule] = useState<SolverModule>(route.params?.module ?? 'calculator');
  const [input, setInput] = useState('');
  const [angleUnit, setAngleUnit] = useState<AngleUnit>('deg');
  const [output, setOutput] = useState<SolverOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meta = useMemo(() => SOLVER_MODULES.find((item) => item.id === module), [module]);

  useEffect(() => {
    navigation.setOptions({ title: t('solver.title') });
  }, [navigation, t]);

  useEffect(() => {
    setOutput(null);
    setError(null);
    setInput('');
  }, [module]);

  const solve = (): void => {
    setError(null);
    try {
      setOutput(services.solver.solve(module, input, { angleUnit }));
      play('reveal');
    } catch (e) {
      setOutput(null);
      setError(e instanceof Error ? e.message : String(e));
      play('blocked');
    }
  };

  return (
    <Screen scroll>
      <Txt size="small" color={theme.colors.textMuted}>
        {t('solver.subtitle')}
      </Txt>
      <Spacer size={3} />

      <SectionHeader title={t('solver.module')} emoji="🧰" />
      <Row gap={2} wrap>
        {SOLVER_MODULES.map((item) => (
          <Button
            key={item.id}
            label={item.emoji + ' ' + pickLocalized(language, item.en, item.bn)}
            size="sm"
            variant={module === item.id ? 'primary' : 'secondary'}
            onPress={() => setModule(item.id)}
          />
        ))}
      </Row>

      <Spacer size={4} />

      <Card>
        <Column gap={3}>
          <Txt size="small" color={theme.colors.textMuted}>
            {t('solver.input')}
          </Txt>
          <Field
            value={input}
            onChangeText={setInput}
            placeholder={meta ? pickLocalized(language, meta.hint, meta.hintBn) : ''}
            mono
            multiline={module === 'system' || module === 'matrix' || module === 'statistics'}
            onSubmitEditing={solve}
          />
          {meta ? (
            <Txt size="caption" color={theme.colors.textMuted}>
              {t('solver.example', { example: pickLocalized(language, meta.hint, meta.hintBn) })}
            </Txt>
          ) : null}

          {module === 'trigonometry' ? (
            <Row gap={2}>
              <Button
                label={t('solver.degrees')}
                size="sm"
                variant={angleUnit === 'deg' ? 'primary' : 'secondary'}
                onPress={() => setAngleUnit('deg')}
              />
              <Button
                label={t('solver.radians')}
                size="sm"
                variant={angleUnit === 'rad' ? 'primary' : 'secondary'}
                onPress={() => setAngleUnit('rad')}
              />
            </Row>
          ) : null}

          <Button
            label={t('solver.solve')}
            icon="="
            full
            size="lg"
            // The result — or the parse error — is the sound here.
            sound={null}
            disabled={input.trim().length === 0}
            onPress={solve}
          />
        </Column>
      </Card>

      {error ? (
        <>
          <Spacer size={4} />
          <ErrorState title={t('common.error')} detail={error} />
        </>
      ) : null}

      {output ? (
        <>
          <Spacer size={4} />
          <Card accent={theme.colors.primary}>
            <Column gap={3}>
              <Column gap={1}>
                <Txt size="caption" color={theme.colors.textMuted}>
                  {t('solver.interpretation')}
                </Txt>
                <MathText size="body">{output.interpretation}</MathText>
              </Column>

              <Column gap={2}>
                <Txt size="caption" color={theme.colors.textMuted}>
                  {t('solver.steps')}
                </Txt>
                {output.steps.map((step, index) => (
                  <Row key={'step-' + index} gap={2} align="flex-start">
                    <Badge label={String(index + 1)} />
                    <View style={{ flex: 1 }}>
                      <MathText size="small">{step}</MathText>
                    </View>
                  </Row>
                ))}
              </Column>

              <Card
                padded={false}
                style={{
                  backgroundColor: theme.colors.successSoft,
                  padding: theme.spacing(3),
                  borderWidth: 0,
                }}
              >
                <Txt size="caption" color={theme.colors.textMuted}>
                  {t('solver.answer')}
                </Txt>
                <MathText size="title">{output.answer}</MathText>
              </Card>
            </Column>
          </Card>
        </>
      ) : null}

      <Spacer size={4} />
      <Button
        label={t('solver.formulas')}
        icon="🧾"
        variant="secondary"
        full
        onPress={() => navigation.navigate('Formulas')}
      />
    </Screen>
  );
}
