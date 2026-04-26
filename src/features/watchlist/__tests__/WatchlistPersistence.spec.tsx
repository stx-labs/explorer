'use client';

import { renderWithProviders } from '@/common/utils/test-utils/render-utils';
import { waitFor } from '@testing-library/react';

import { WatchlistPersistence } from '../WatchlistPersistence';
import { WATCHLIST_NOTIFY_DISABLED_KEY, WATCHLIST_STORAGE_KEY } from '../types';

const ADDR = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

describe('WatchlistPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates Redux from localStorage on mount', async () => {
    const stored = [{ principal: ADDR, addedAt: 42, order: 0 }];
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(stored));
    localStorage.setItem(WATCHLIST_NOTIFY_DISABLED_KEY, '1');

    const { store } = renderWithProviders(<WatchlistPersistence />);

    await waitFor(() => {
      expect(store.getState().watchlist.hydrated).toBe(true);
    });
    expect(store.getState().watchlist.items.some(i => i.principal === ADDR)).toBe(true);
    expect(store.getState().watchlist.notificationsDisabled).toBe(true);
  });
});
