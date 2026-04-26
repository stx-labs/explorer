import { renderWithProviders } from '@/common/utils/test-utils/render-utils';
import { mainnetNetwork, testnetNetwork } from '@/common/constants/network';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import WatchlistPageClient from '../WatchlistPageClient';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), prefetch: jest.fn() })),
}));

const mockUseGlobalContext = jest.fn();
jest.mock('@/common/context/useGlobalContext', () => ({
  useGlobalContext: () => mockUseGlobalContext(),
}));

const mockBalancesBatch = jest.fn();
const mockTxQueries = jest.fn();

jest.mock('@/common/queries/useWatchlistQueries', () => {
  const actual = jest.requireActual('@/common/queries/useWatchlistQueries');
  return {
    ...actual,
    useWatchlistBalancesBatch: (principals: string[], enabled: boolean) =>
      mockBalancesBatch(principals, enabled),
    useWatchlistTransactionQueries: (
      principals: string[],
      limit: number,
      offset: number,
      enabled: boolean
    ) => mockTxQueries(principals, limit, offset, enabled),
  };
});

const ADDR = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const ADDR_B = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
const ADDR_C = 'SP3FGQ8Z7JQWQZVRQXHQX6293H3JYFZ1Q29QGWB5';

function makeV2Results(principal: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    tx: {
      tx_id: `0x${String(i).padStart(64, '0')}`,
      tx_type: 'token_transfer' as const,
      sender_address: principal,
      token_transfer: {
        recipient_address: principal,
        amount: '1',
      },
      block_time: 1_700_000_000,
    },
    stx_sent: '0',
    stx_received: '1',
  }));
}

describe('WatchlistPageClient', () => {
  beforeEach(() => {
    mockUseGlobalContext.mockReturnValue({
      activeNetwork: mainnetNetwork,
      activeNetworkKey: mainnetNetwork.url,
    });

    mockBalancesBatch.mockImplementation((principals: string[]) => ({
      balanceByPrincipal: Object.fromEntries(
        principals.map(p => [p, { stx: { balance: '1000000' } }])
      ),
      balancesReady: true,
      loadedCount: principals.length,
      totalCount: principals.length,
      balanceQuery: {},
      anyBalanceError: false,
      isBalanceFetching: false,
      balanceLastUpdated: Date.now(),
    }));

    mockTxQueries.mockImplementation((principals: string[]) =>
      principals.map(() => ({
        data: { results: [], total: 0 },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );
  });

  it('shows empty state when watchlist has no addresses', () => {
    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: { items: [], hydrated: true, notificationsDisabled: false },
      } as any,
    });

    expect(screen.getByText('Пока нет избранных адресов')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /найти адрес/i })).toBeInTheDocument();
  });

  it('renders one removable block per watchlist address', () => {
    mockBalancesBatch.mockImplementation((principals: string[]) => ({
      balanceByPrincipal: Object.fromEntries(
        principals.map((p, i) => [p, { stx: { balance: String((i + 1) * 1_000_000) } }])
      ),
      balancesReady: true,
      loadedCount: principals.length,
      totalCount: principals.length,
      balanceQuery: {},
      anyBalanceError: false,
      isBalanceFetching: false,
      balanceLastUpdated: Date.now(),
    }));

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [
            { principal: ADDR, addedAt: 3, order: 0 },
            { principal: ADDR_B, addedAt: 2, order: 1 },
            { principal: ADDR_C, addedAt: 1, order: 2 },
          ],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    expect(screen.getAllByRole('button', { name: /remove from watchlist/i })).toHaveLength(3);
  });

  it('changes card order when sort key selects STX balance (high)', async () => {
    const user = userEvent.setup();
    mockBalancesBatch.mockImplementation((principals: string[]) => ({
      balanceByPrincipal: Object.fromEntries(
        principals.map(p => [
          p,
          {
            stx: {
              balance: p === ADDR ? '3000000' : p === ADDR_B ? '1000000' : '2000000',
            },
          },
        ])
      ),
      balancesReady: true,
      loadedCount: principals.length,
      totalCount: principals.length,
      balanceQuery: {},
      anyBalanceError: false,
      isBalanceFetching: false,
      balanceLastUpdated: Date.now(),
    }));

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [
            { principal: ADDR, addedAt: 1, order: 0 },
            { principal: ADDR_B, addedAt: 2, order: 1 },
            { principal: ADDR_C, addedAt: 3, order: 2 },
          ],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    const sortSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(sortSelect, 'stx_desc');

    const removeBtns = screen.getAllByRole('button', { name: /remove from watchlist/i });
    const firstCard = removeBtns[0].closest('.chakra-card__root');
    expect(firstCard?.textContent).toContain(ADDR);
  });

  it('groups combined transactions under Today for current-day timestamps', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    mockTxQueries.mockImplementation((principals: string[], limit: number, offset: number) =>
      principals.map(p => ({
        data: {
          results: [
            {
              tx: {
                tx_id: `0x${'e'.repeat(64)}`,
                tx_type: 'token_transfer' as const,
                sender_address: p,
                token_transfer: { recipient_address: p, amount: '1' },
                block_time: nowSec,
              },
              stx_sent: '0',
              stx_received: '1',
            },
          ],
          total: 1,
          limit,
          offset,
        },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    expect(await screen.findByText('Today')).toBeInTheDocument();
  });

  it('shows watchlist chrome when addresses exist', () => {
    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    expect(screen.getByText('Watchlist')).toBeInTheDocument();
    expect(screen.getByText('Combined transactions')).toBeInTheDocument();
  });

  it('opens remove dialog and removes address on confirm', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await user.click(screen.getByRole('button', { name: /remove from watchlist/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Remove from watchlist/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^Remove$/i }));

    await waitFor(() => {
      expect(store.getState().watchlist.items.some(i => i.principal === ADDR)).toBe(false);
    });
  });

  it('requests the next tx page with offset 20 when Next is used', async () => {
    const user = userEvent.setup();
    mockTxQueries.mockImplementation((principals: string[], limit: number, offset: number) =>
      principals.map(p => ({
        data: { results: makeV2Results(p, limit), total: 45 },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await screen.findByTestId('watchlist-tx-pagination');
    expect(mockTxQueries).toHaveBeenCalledWith([ADDR], 20, 0, true);

    await user.click(screen.getByRole('button', { name: /next page/i }));

    await waitFor(() => {
      expect(mockTxQueries).toHaveBeenCalledWith([ADDR], 20, 20, true);
    });
  });

  it('resets to offset 0 when tx type filter changes after paging', async () => {
    const user = userEvent.setup();
    mockTxQueries.mockImplementation((principals: string[], limit: number, offset: number) =>
      principals.map(p => ({
        data: { results: makeV2Results(p, limit), total: 45 },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await screen.findByTestId('watchlist-tx-pagination');
    await user.click(screen.getByRole('button', { name: /next page/i }));

    await waitFor(() => {
      expect(mockTxQueries).toHaveBeenCalledWith([ADDR], 20, 20, true);
    });

    const typeSelect = screen.getAllByRole('combobox')[1];
    await act(async () => {
      await user.selectOptions(typeSelect, 'token_transfer');
    });

    await waitFor(() => {
      const offsets = mockTxQueries.mock.calls.map(c => c[2] as number);
      expect(offsets[offsets.length - 1]).toBe(0);
    });
  });

  it('goes back to offset 0 when Previous is clicked after Next', async () => {
    const user = userEvent.setup();
    mockTxQueries.mockImplementation((principals: string[], limit: number, offset: number) =>
      principals.map(p => ({
        data: { results: makeV2Results(p, limit), total: 45 },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await screen.findByTestId('watchlist-tx-pagination');
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => {
      expect(mockTxQueries).toHaveBeenCalledWith([ADDR], 20, 20, true);
    });

    expect(screen.getByRole('button', { name: /previous page/i })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: /previous page/i }));

    await waitFor(() => {
      expect(mockTxQueries.mock.calls.map(c => c[2] as number).at(-1)).toBe(0);
    });
  });

  it('resets tx feed offset when table sort changes after paging', async () => {
    const user = userEvent.setup();
    mockTxQueries.mockImplementation((principals: string[], limit: number, offset: number) =>
      principals.map(p => ({
        data: { results: makeV2Results(p, limit), total: 45 },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await screen.findByTestId('watchlist-tx-pagination');
    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => {
      expect(mockTxQueries).toHaveBeenCalledWith([ADDR], 20, 20, true);
    });

    const sortSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(sortSelect, 'label_asc');

    await waitFor(() => {
      expect(mockTxQueries.mock.calls.map(c => c[2] as number).at(-1)).toBe(0);
    });
  });

  it('resets tx feed offset when activeNetworkKey changes', async () => {
    const user = userEvent.setup();
    mockTxQueries.mockImplementation((principals: string[], limit: number, offset: number) =>
      principals.map(p => ({
        data: { results: makeV2Results(p, limit), total: 45 },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );

    const { rerender } = renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await screen.findByTestId('watchlist-tx-pagination');
    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => {
      expect(mockTxQueries).toHaveBeenCalledWith([ADDR], 20, 20, true);
    });

    mockUseGlobalContext.mockReturnValue({
      activeNetwork: testnetNetwork,
      activeNetworkKey: testnetNetwork.url,
    });
    rerender(<WatchlistPageClient />);

    await waitFor(() => {
      expect(mockTxQueries.mock.calls.map(c => c[2] as number).at(-1)).toBe(0);
    });
  });

  it('resets offset when combined tx address filter changes after paging', async () => {
    const user = userEvent.setup();
    mockTxQueries.mockImplementation((principals: string[], limit: number, offset: number) =>
      principals.map(p => ({
        data: { results: makeV2Results(p, limit), total: 45 },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [
            { principal: ADDR, addedAt: 1, order: 0 },
            { principal: ADDR_B, addedAt: 2, order: 1 },
          ],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await screen.findByTestId('watchlist-tx-pagination');
    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => {
      expect(mockTxQueries).toHaveBeenCalledWith([ADDR, ADDR_B], 20, 20, true);
    });

    const selects = screen.getAllByRole('combobox');
    const principalSelect = selects[selects.length - 1];
    await user.selectOptions(principalSelect, ADDR_B);

    await waitFor(() => {
      expect(mockTxQueries.mock.calls.map(c => c[2] as number).at(-1)).toBe(0);
    });
  });

  it('hides pagination when fewer than 20 txs and not on a later page', () => {
    mockTxQueries.mockImplementation((principals: string[]) =>
      principals.map(p => ({
        data: { results: makeV2Results(p, 5), total: 5 },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    expect(screen.queryByTestId('watchlist-tx-pagination')).not.toBeInTheDocument();
  });

  it('steps back to page 1 when page > 1 returns no merged transactions', async () => {
    const user = userEvent.setup();
    mockTxQueries.mockImplementation((principals: string[], limit: number, offset: number) =>
      principals.map(p => ({
        data: {
          results: offset === 0 ? makeV2Results(p, limit) : [],
          total: 25,
        },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await screen.findByTestId('watchlist-tx-pagination');
    await user.click(screen.getByRole('button', { name: /next page/i }));

    await waitFor(() => {
      expect(mockTxQueries.mock.calls.map(c => c[2] as number).at(-1)).toBe(0);
    });
  });

  it('disables Next when API total has no further pages', async () => {
    mockTxQueries.mockImplementation((principals: string[], limit: number) =>
      principals.map(p => ({
        data: { results: makeV2Results(p, Math.min(limit, 20)), total: 20 },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    await screen.findByTestId('watchlist-tx-pagination');
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('shows tx feed skeleton while feed queries are pending', () => {
    mockTxQueries.mockImplementation((principals: string[]) =>
      principals.map(() => ({
        data: undefined,
        isSuccess: false,
        isError: false,
        isFetching: true,
        isPending: true,
        dataUpdatedAt: Date.now(),
      }))
    );

    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    expect(screen.getByTestId('watchlist-tx-loading')).toBeInTheDocument();
  });
});
