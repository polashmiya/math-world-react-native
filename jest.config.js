/**
 * Two projects:
 *  - `engine` runs the pure TypeScript core/domain/data logic in plain Node,
 *    which lets repository tests drive a real SQLite database via `node:sqlite`.
 *  - `ui` runs component tests through the Expo/React Native transformer.
 */
module.exports = {
  projects: [
    {
      displayName: 'engine',
      preset: null,
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/engine/**/*.test.ts'],
      transform: {
        '^.+\\.[jt]sx?$': ['babel-jest', { presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]] }],
      },
    },
    {
      displayName: 'ui',
      // Android is the priority platform (spec §43), and behaviour like the
      // hardware back button only exists there — so components are tested in
      // the environment they actually ship into.
      preset: 'jest-expo/android',
      testMatch: ['<rootDir>/__tests__/ui/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/ui.ts'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
      ],
    },
  ],
};
