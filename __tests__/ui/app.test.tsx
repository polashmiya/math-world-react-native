/**
 * App-level smoke tests.
 *
 * These render the real `App` — providers, theme, i18n, boot gate and toast
 * host — with only the database bootstrap stubbed. They catch wiring mistakes
 * that a component test cannot see.
 */
import { render, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

// The `mock` prefix is what lets jest.mock() reference this from its factory.
const mockBootstrapDatabase = jest.fn();

jest.mock('../../src/data/database/bootstrap', () => ({
  bootstrapDatabase: (...args: unknown[]) => mockBootstrapDatabase(...args),
}));

// Imported after the mock so App picks up the stub.
import App from '../../src/app/App';

describe('App boot', () => {
  beforeEach(() => {
    mockBootstrapDatabase.mockReset();
  });

  it('shows the splash while the database is opening', async () => {
    // A promise that never settles keeps the app in its loading state.
    mockBootstrapDatabase.mockImplementation(() => new Promise(() => undefined));

    const { getByText } = await render(<App />);
    expect(getByText('ম্যাথ ওয়ার্ল্ড')).toBeTruthy();
    expect(getByText('গণিত শিখুন, চর্চা করুন, গাণিতিকভাবে ভাবুন')).toBeTruthy();
    expect(getByText('ডেটাবেস খোলা হচ্ছে…')).toBeTruthy();
  });

  it('reports progress as the boot stages advance', async () => {
    mockBootstrapDatabase.mockImplementation(
      (options: { onProgress?: (stage: string, detail?: string) => void }) =>
        new Promise(() => {
          options.onProgress?.('seeding', 'pack.core (1/9)');
        }),
    );

    const { getByText } = await render(<App />);
    await waitFor(() => expect(getByText('কনটেন্ট লোড হচ্ছে…')).toBeTruthy());
    expect(getByText('pack.core (1/9)')).toBeTruthy();
  });

  it('shows a recoverable error screen when the boot fails', async () => {
    mockBootstrapDatabase.mockRejectedValue(new Error('disk is on fire'));

    const { getByText } = await render(<App />);
    await waitFor(() => expect(getByText('শুরু করা যায়নি')).toBeTruthy());
    expect(getByText('disk is on fire')).toBeTruthy();

    // Retrying calls the bootstrap again rather than leaving a dead screen.
    mockBootstrapDatabase.mockImplementation(() => new Promise(() => undefined));
    await userEvent.press(getByText('আবার চেষ্টা'));
    await waitFor(() => expect(mockBootstrapDatabase).toHaveBeenCalledTimes(2));
  });
});
