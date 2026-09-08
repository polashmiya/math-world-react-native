/** Shared setup for component tests. */

// Gesture Handler installs native bindings on mount; its own jest setup stubs
// them so `GestureHandlerRootView` can render in tests.
require('react-native-gesture-handler/jestSetup');

// SafeAreaProvider renders nothing until it has measured a layout, which never
// happens under jest. The library ships a mock with fixed insets for exactly
// this reason.
// The shipped mock is a default export that spreads the real module, so the
// `.default` is what the module namespace needs to be replaced with.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// Navigation and SVG pull in native modules that log noisy warnings under jest;
// the assertions in these tests care about rendered output, not those warnings.
jest.spyOn(console, 'warn').mockImplementation(() => undefined);
