'use client';

jest.mock('@/common/context/useGlobalContext', () => ({
  useGlobalContext: () => ({
    activeNetworkKey: 'https://api.hiro.so',
  }),
}));

import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders } from '@/common/utils/test-utils/render-utils';
import { waitFor } from '@testing-library/react';

import { WatchlistVisibilityRefetch } from '../WatchlistVisibilityRefetch';

const ADDR = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

describe('WatchlistVisibilityRefetch', () => {
  it('invalidates watchlist queries when tab becomes visible', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderWithProviders(<WatchlistVisibilityRefetch />, {
      queryClient,
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const calls = invalidateSpy.mock.calls;
    const hasWatchlistPredicate = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'object' &&
        c[0] !== null &&
        'predicate' in (c[0] as object)
    );
    expect(hasWatchlistPredicate).toBe(true);

    invalidateSpy.mockRestore();
  });
});
