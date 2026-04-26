'use client';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

import { renderWithProviders } from '@/common/utils/test-utils/render-utils';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';

import { WATCHLIST_STORAGE_QUOTA_TOAST_MESSAGE } from '../storage';
import { WATCHLIST_MAX_ADDRESSES, WATCHLIST_STORAGE_KEY } from '../types';
import { useWatchlist } from '../useWatchlist';

const ADDR_A = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const ADDR_B = 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9';

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

function WatchlistInvalidProbe() {
  const { add } = useWatchlist();
  const [code, setCode] = useState('');
  return (
    <div>
      <span data-testid="code">{code}</span>
      <button
        type="button"
        onClick={() => {
          const r = add('not-an-address');
          setCode(r.ok ? 'ok' : r.code);
        }}
      >
        add-invalid
      </button>
    </div>
  );
}

function WatchlistLimitProbe() {
  const { add, items } = useWatchlist();
  const [code, setCode] = useState('');
  return (
    <div>
      <span data-testid="count">{items.length}</span>
      <span data-testid="code">{code}</span>
      <button
        type="button"
        onClick={() => {
          const r = add(ADDR_A);
          setCode(r.ok ? 'ok' : r.code);
        }}
      >
        add-one-more
      </button>
    </div>
  );
}

function ToggleProbe() {
  const { toggle, isInWatchlist } = useWatchlist();
  return (
    <div>
      <span data-testid="in">{isInWatchlist(ADDR_A) ? 'yes' : 'no'}</span>
      <button type="button" onClick={() => toggle(ADDR_A)}>
        toggle-a
      </button>
    </div>
  );
}

function MarkViewedProbe() {
  const { markAddressViewed } = useWatchlist();
  return (
    <button type="button" onClick={() => markAddressViewed(ADDR_A)}>
      mark-viewed
    </button>
  );
}

function SetBnsProbe() {
  const { setBnsName } = useWatchlist();
  return (
    <button type="button" onClick={() => setBnsName(ADDR_A, 'foo.btc')}>
      set-bns
    </button>
  );
}

function ReorderProbe() {
  const { reorderRowsByPrincipalOrder } = useWatchlist();
  const [code, setCode] = useState('');
  return (
    <div>
      <span data-testid="reorder-code">{code}</span>
      <button
        type="button"
        onClick={() => {
          const r = reorderRowsByPrincipalOrder([ADDR_B, ADDR_A]);
          setCode(r.ok ? 'ok' : r.code);
        }}
      >
        reorder-ba
      </button>
      <button
        type="button"
        onClick={() => {
          const r = reorderRowsByPrincipalOrder([ADDR_A]);
          setCode(r.ok ? 'ok' : r.code);
        }}
      >
        reorder-bad-len
      </button>
    </div>
  );
}

describe('useWatchlist', () => {
  beforeEach(() => {
    jest.mocked(toast.error).mockClear();
  });

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
    const addedAt = store.getState().watchlist.items.find(i => i.principal === ADDR_A)?.addedAt;
    expect(typeof addedAt).toBe('number');
    expect(Math.abs(Date.now() - (addedAt as number))).toBeLessThan(10_000);
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

  it('rolls back add when storage persist fails and shows toast', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<WatchlistProbe />, {
      preloadedState: {
        watchlist: { items: [], hydrated: true, notificationsDisabled: false },
      } as any,
    });

    const orig = Storage.prototype.setItem;
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key === WATCHLIST_STORAGE_KEY) {
        throw new DOMException('QuotaExceeded', 'QuotaExceededError');
      }
      return orig.call(this, key, value);
    });

    await act(async () => {
      await user.click(screen.getByText('add-a'));
    });
    expect(store.getState().watchlist.items.some(i => i.principal === ADDR_A)).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(WATCHLIST_STORAGE_QUOTA_TOAST_MESSAGE);
    spy.mockRestore();
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
    expect(toast.error).toHaveBeenCalledWith(WATCHLIST_STORAGE_QUOTA_TOAST_MESSAGE);
    spy.mockRestore();
  });

  it('rejects invalid principal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WatchlistInvalidProbe />, {
      preloadedState: {
        watchlist: { items: [], hydrated: true, notificationsDisabled: false },
      } as any,
    });
    await act(async () => {
      await user.click(screen.getByText('add-invalid'));
    });
    expect(screen.getByTestId('code').textContent).toBe('INVALID_PRINCIPAL');
  });

  it('rejects add when watchlist is at max size', async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: WATCHLIST_MAX_ADDRESSES }, (_, i) => ({
      principal: `SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.c${i}`,
      addedAt: i,
      order: i,
    }));
    renderWithProviders(<WatchlistLimitProbe />, {
      preloadedState: {
        watchlist: { items, hydrated: true, notificationsDisabled: false },
      } as any,
    });
    expect(screen.getByTestId('count').textContent).toBe(String(WATCHLIST_MAX_ADDRESSES));
    await act(async () => {
      await user.click(screen.getByText('add-one-more'));
    });
    expect(screen.getByTestId('code').textContent).toBe('LIMIT');
    expect(screen.getByTestId('count').textContent).toBe(String(WATCHLIST_MAX_ADDRESSES));
  });

  it('toggle removes when present and adds when absent', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<ToggleProbe />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR_A, addedAt: 1, order: 0 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });
    expect(screen.getByTestId('in').textContent).toBe('yes');
    await act(async () => {
      await user.click(screen.getByText('toggle-a'));
    });
    expect(store.getState().watchlist.items.some(i => i.principal === ADDR_A)).toBe(false);
    expect(screen.getByTestId('in').textContent).toBe('no');
    await act(async () => {
      await user.click(screen.getByText('toggle-a'));
    });
    expect(store.getState().watchlist.items.some(i => i.principal === ADDR_A)).toBe(true);
    expect(screen.getByTestId('in').textContent).toBe('yes');
  });

  it('markAddressViewed sets lastViewedAt when item exists', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<MarkViewedProbe />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR_A, addedAt: 1, order: 0 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });
    const before = store.getState().watchlist.items[0].lastViewedAt;
    expect(before).toBeUndefined();
    await act(async () => {
      await user.click(screen.getByText('mark-viewed'));
    });
    const after = store.getState().watchlist.items.find(i => i.principal === ADDR_A)?.lastViewedAt;
    expect(typeof after).toBe('number');
    expect(Math.abs(Date.now() - (after as number))).toBeLessThan(10_000);
  });

  it('setBnsName updates bnsName when item exists', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<SetBnsProbe />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR_A, addedAt: 1, order: 0 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });
    await act(async () => {
      await user.click(screen.getByText('set-bns'));
    });
    expect(store.getState().watchlist.items[0].bnsName).toBe('foo.btc');
  });

  it('reorderRowsByPrincipalOrder updates order fields', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<ReorderProbe />, {
      preloadedState: {
        watchlist: {
          items: [
            { principal: ADDR_A, addedAt: 1, order: 0 },
            { principal: ADDR_B, addedAt: 2, order: 1 },
          ],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });
    await act(async () => {
      await user.click(screen.getByText('reorder-ba'));
    });
    expect(screen.getByTestId('reorder-code').textContent).toBe('ok');
    const items = store.getState().watchlist.items;
    expect(items.find(i => i.principal === ADDR_B)?.order).toBe(0);
    expect(items.find(i => i.principal === ADDR_A)?.order).toBe(1);
  });

  it('reorderRowsByPrincipalOrder returns NOT_FOUND when length mismatches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReorderProbe />, {
      preloadedState: {
        watchlist: {
          items: [
            { principal: ADDR_A, addedAt: 1, order: 0 },
            { principal: ADDR_B, addedAt: 2, order: 1 },
          ],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });
    await act(async () => {
      await user.click(screen.getByText('reorder-bad-len'));
    });
    expect(screen.getByTestId('reorder-code').textContent).toBe('NOT_FOUND');
  });
});
