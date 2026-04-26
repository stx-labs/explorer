'use client';

import { renderWithProviders } from '@/common/utils/test-utils/render-utils';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';

import { WATCHLIST_STORAGE_KEY } from '../types';
import { useWatchlist } from '../useWatchlist';

const ADDR_A = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

function WatchlistProbe() {
  const { add, remove, isInWatchlist, items, hydrated } = useWatchlist();
  useEffect(() => {
    localStorage.clear();
  }, []);
  return (
    <div>
      <span data-testid="hydrated">{hydrated ? 'yes' : 'no'}</span>
      <span data-testid="count">{items.length}</span>
      <span data-testid="has-a">{isInWatchlist(ADDR_A) ? 'yes' : 'no'}</span>
      <button type="button" onClick={() => add(ADDR_A)}>
        add-a
      </button>
      <button type="button" onClick={() => remove(ADDR_A)}>
        remove-a
      </button>
    </div>
  );
}

describe('useWatchlist', () => {
  it('adds and removes principals with persistence', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<WatchlistProbe />, {
      preloadedState: {
        watchlist: { items: [], hydrated: true, notificationsDisabled: false },
      } as any,
    });

    expect(screen.getByTestId('hydrated').textContent).toBe('yes');
    await act(async () => {
      await user.click(screen.getByText('add-a'));
    });
    expect(store.getState().watchlist.items.some(i => i.principal === ADDR_A)).toBe(true);
    await act(async () => {
      await user.click(screen.getByText('remove-a'));
    });
    expect(store.getState().watchlist.items.some(i => i.principal === ADDR_A)).toBe(false);
  });

  it('rejects duplicates', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WatchlistProbe />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR_A, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });
    await act(async () => {
      await user.click(screen.getByText('add-a'));
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('rolls back remove when storage persist fails (e.g. quota)', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<WatchlistProbe />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR_A, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    const orig = Storage.prototype.setItem;
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key === WATCHLIST_STORAGE_KEY && value === '[]') {
        throw new DOMException('QuotaExceeded', 'QuotaExceededError');
      }
      return orig.call(this, key, value);
    });

    await act(async () => {
      await user.click(screen.getByText('remove-a'));
    });
    expect(store.getState().watchlist.items.some(i => i.principal === ADDR_A)).toBe(true);
    spy.mockRestore();
  });
});
