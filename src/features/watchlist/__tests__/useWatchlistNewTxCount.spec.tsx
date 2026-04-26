'use client';

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock('@/common/context/useGlobalContext', () => ({
  useGlobalContext: () => ({
    activeNetwork: mainnetNetwork,
    activeNetworkKey: mainnetNetwork.url,
  }),
}));

const mockTxQueries = jest.fn();

jest.mock('@/common/queries/useWatchlistQueries', () => {
  const actual = jest.requireActual('@/common/queries/useWatchlistQueries');
  return {
    ...actual,
    useWatchlistTransactionQueries: (...args: unknown[]) => mockTxQueries(...args),
  };
});

import { WatchlistNavLink } from '@/app/_components/NewNavBar/WatchlistNavLink';
import { mainnetNetwork } from '@/common/constants/network';
import { renderWithProviders } from '@/common/utils/test-utils/render-utils';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const ADDR = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const ADDR2 = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';

function txRow(id: string, blockTime: number, sender: string) {
  return {
    tx: {
      tx_id: id,
      tx_type: 'token_transfer' as const,
      sender_address: sender,
      token_transfer: { recipient_address: ADDR2, amount: '1', memo: '' },
      block_time: blockTime,
    },
  };
}

function getWatchlistNavLink(): HTMLElement {
  const el = screen
    .queryAllByRole('link')
    .find(l => l.getAttribute('href')?.includes('/watchlist'));
  if (!el) {
    throw new Error('Watchlist nav link not found');
  }
  return el as HTMLElement;
}

function mockQueriesForPrincipals(
  principals: string[],
  resultsPerPrincipal: ReturnType<typeof txRow>[][]
) {
  return principals.map((_, i) => ({
    data: {
      results: resultsPerPrincipal[i] ?? [],
      total: resultsPerPrincipal[i]?.length ?? 0,
      limit: 20,
      offset: 0,
    },
    isSuccess: true,
    isError: false,
    isFetching: false,
    isPending: false,
    dataUpdatedAt: Date.now(),
  }));
}

describe('useWatchlistNewTxCount (via WatchlistNavLink)', () => {
  beforeEach(() => {
    mockTxQueries.mockImplementation((principals: string[]) =>
      mockQueriesForPrincipals(
        principals,
        principals.map(() => [])
      )
    );
  });

  it('hides badge when there are no new transactions', () => {
    renderWithProviders(<WatchlistNavLink />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1, lastViewedAt: Date.now() }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });
    expect(getWatchlistNavLink()).toBeInTheDocument();
    expect(screen.queryByText(/^99\+$/)).not.toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('shows deduped count after throttle window', async () => {
    jest.useFakeTimers();
    const t0 = 1_700_000_000;
    mockTxQueries.mockImplementation((principals: string[]) =>
      mockQueriesForPrincipals(principals, [
        [txRow('0x' + 'a'.repeat(64), t0 + 5, ADDR)],
        [txRow('0x' + 'b'.repeat(64), t0 + 6, ADDR2)],
      ])
    );

    renderWithProviders(<WatchlistNavLink />, {
      preloadedState: {
        watchlist: {
          items: [
            { principal: ADDR, addedAt: 1, lastViewedAt: (t0 - 100) * 1000 },
            { principal: ADDR2, addedAt: 2, lastViewedAt: (t0 - 100) * 1000 },
          ],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await act(async () => {
      jest.advanceTimersByTime(6000);
    });

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
    jest.useRealTimers();
  });

  it('shows 99+ when many distinct new transactions exceed display cap', async () => {
    jest.useFakeTimers();
    const t0 = 1_700_000_000;
    const rows = Array.from({ length: 100 }, (_, i) =>
      txRow(`0x${i.toString(16).padStart(64, '0')}`, t0 + i + 1, ADDR)
    );
    mockTxQueries.mockImplementation((principals: string[]) =>
      mockQueriesForPrincipals(principals, [rows])
    );

    renderWithProviders(<WatchlistNavLink />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1, lastViewedAt: (t0 - 100) * 1000 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await act(async () => {
      jest.advanceTimersByTime(6000);
    });

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
    jest.useRealTimers();
  });

  it('marks all viewed when Watchlist nav link is clicked', async () => {
    jest.useFakeTimers();
    const t0 = 1_700_000_000;
    mockTxQueries.mockImplementation((principals: string[]) =>
      mockQueriesForPrincipals(principals, [[txRow('0x' + 'c'.repeat(64), t0 + 1, ADDR)]])
    );

    const { store } = renderWithProviders(<WatchlistNavLink />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1, lastViewedAt: (t0 - 100) * 1000 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
    jest.useRealTimers();

    const user = userEvent.setup();
    const link = getWatchlistNavLink();
    link.addEventListener('click', e => e.preventDefault(), { capture: true });
    await user.click(link);

    const viewed = store.getState().watchlist.items[0]?.lastViewedAt;
    expect(typeof viewed).toBe('number');
    expect(viewed).toBeGreaterThan((t0 - 100) * 1000);
  });
});
