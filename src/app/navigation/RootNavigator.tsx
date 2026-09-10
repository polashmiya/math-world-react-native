import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useApp, useTheme } from '../providers/AppProvider';
import type { RootStackParamList, TabParamList } from './types';
import { useExitConfirmation } from './useExitConfirmation';
import { useSound } from '../../ui/sound';
import { DailyBrainScreen } from '../../features/dailyBrain/DailyBrainScreen';
import {
  BossBattleScreen,
  ChallengesScreen,
} from '../../features/challenges/ChallengeScreens';
import {
  ExamDetailScreen,
  ExamResultScreen,
  ExamRunScreen,
  ExamsScreen,
} from '../../features/exams/ExamScreens';
import {
  BookmarksScreen,
  FormulaDetailScreen,
  FormulasScreen,
} from '../../features/formulas/FormulaScreens';
import { GamePlayScreen, GamesScreen, LabScreen } from '../../features/games/GameScreens';
import { HomeScreen } from '../../features/home/HomeScreen';
import { MoreScreen } from '../../features/home/MoreScreen';
import { LearnScreen } from '../../features/learning/LearnScreen';
import { LessonScreen } from '../../features/learning/LessonScreen';
import { TopicDetailScreen } from '../../features/learning/TopicDetailScreen';
import { MistakesScreen, RevisionScreen } from '../../features/mistakes/MistakesScreen';
import { PracticeRunScreen } from '../../features/practice/PracticeRunScreen';
import { PracticeScreen } from '../../features/practice/PracticeScreen';
import { SessionSummaryScreen } from '../../features/practice/SessionSummaryScreen';
import { OnboardingScreen, ProfileScreen } from '../../features/profile/ProfileScreens';
import {
  AchievementsScreen,
  ProgressScreen,
  StudyPlanScreen,
} from '../../features/progress/ProgressScreens';
import { SearchScreen } from '../../features/search/SearchScreen';
import { SolverScreen } from '../../features/solver/SolverScreen';

const Tabs = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, string> = {
  Home: '🏠',
  Learn: '📚',
  Practice: '✏️',
  Brain: '🧠',
  More: '⋯',
};

function TabBarIcon({ name, focused, size }: { name: keyof TabParamList; focused: boolean; size: number }): React.JSX.Element {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size, opacity: focused ? 1 : 0.55 }}>{TAB_ICONS[name]}</Text>
    </View>
  );
}

function TabNavigator(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useApp();
  const { play } = useSound();

  return (
    <Tabs.Navigator
      // The tab bar is the one set of buttons that does not go through `Button`
      // or `Card`, so it needs its own tap.
      screenListeners={{ tabPress: () => play('tap') }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: { fontSize: theme.font.size('caption') },
        tabBarIcon: ({ focused, size }) => (
          <TabBarIcon name={route.name} focused={focused} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="Learn" component={LearnScreen} options={{ title: t('tabs.learn') }} />
      <Tabs.Screen name="Practice" component={PracticeScreen} options={{ title: t('tabs.practice') }} />
      <Tabs.Screen name="Brain" component={DailyBrainScreen} options={{ title: t('tabs.brain') }} />
      <Tabs.Screen name="More" component={MoreScreen} options={{ title: t('tabs.more') }} />
    </Tabs.Navigator>
  );
}

/** The whole navigation graph. Onboarding is shown until a name is chosen. */
export function RootNavigator(): React.JSX.Element {
  const theme = useTheme();
  const { t, profile } = useApp();
  const needsOnboarding = (profile?.name ?? '').trim().length === 0;
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  // Back only closes the app after the user confirms it (Android).
  useExitConfirmation({
    canGoBack: () => navigationRef.isReady() && navigationRef.canGoBack(),
    t,
  });

  const navTheme = useMemo<NavTheme>(() => {
    const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.accent,
      },
    };
  }, [theme]);

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.text, fontSize: theme.font.size('bodyLarge') },
          headerTintColor: theme.colors.primary,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: theme.reduceAnimations ? 'none' : 'default',
        }}
      >
        {needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        ) : null}

        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />

        <Stack.Screen name="TopicDetail" component={TopicDetailScreen} options={{ title: t('common.topic') }} />
        <Stack.Screen name="Lesson" component={LessonScreen} options={{ title: t('learn.lesson') }} />
        <Stack.Screen name="PracticeRun" component={PracticeRunScreen} options={{ title: t('practice.title') }} />
        <Stack.Screen
          name="SessionSummary"
          component={SessionSummaryScreen}
          options={{ title: t('practice.sessionComplete'), headerBackVisible: false }}
        />
        <Stack.Screen name="Mistakes" component={MistakesScreen} options={{ title: t('mistakes.title') }} />
        <Stack.Screen name="Revision" component={RevisionScreen} options={{ title: t('practice.revision') }} />
        <Stack.Screen name="Bookmarks" component={BookmarksScreen} options={{ title: t('bookmarks.title') }} />
        <Stack.Screen name="SkillTree" component={LearnScreen} options={{ title: t('learn.skillTree') }} />

        <Stack.Screen name="Exams" component={ExamsScreen} options={{ title: t('exams.title') }} />
        <Stack.Screen name="ExamDetail" component={ExamDetailScreen} options={{ title: t('exams.title') }} />
        <Stack.Screen name="ExamRun" component={ExamRunScreen} options={{ title: t('exams.mockExam') }} />
        <Stack.Screen name="ExamResult" component={ExamResultScreen} options={{ title: t('exams.result') }} />

        <Stack.Screen name="Games" component={GamesScreen} options={{ title: t('games.title') }} />
        <Stack.Screen name="GamePlay" component={GamePlayScreen} options={{ title: t('games.title') }} />
        <Stack.Screen name="Lab" component={LabScreen} options={{ title: t('lab.title') }} />

        <Stack.Screen name="Challenges" component={ChallengesScreen} options={{ title: t('challenges.title') }} />
        <Stack.Screen name="BossBattle" component={BossBattleScreen} options={{ title: t('learn.bossBattle') }} />

        <Stack.Screen name="Solver" component={SolverScreen} options={{ title: t('solver.title') }} />
        <Stack.Screen name="Formulas" component={FormulasScreen} options={{ title: t('formulas.title') }} />
        <Stack.Screen
          name="FormulaDetail"
          component={FormulaDetailScreen}
          options={{ title: t('formulas.title') }}
        />

        <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: t('progress.title') }} />
        <Stack.Screen name="StudyPlan" component={StudyPlanScreen} options={{ title: t('progress.studyPlan') }} />
        <Stack.Screen
          name="Achievements"
          component={AchievementsScreen}
          options={{ title: t('progress.achievements') }}
        />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: t('search.title') }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile.title') }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
