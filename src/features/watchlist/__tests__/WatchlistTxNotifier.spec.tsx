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

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    custom: jest.fn(),
  },
}));

import { WatchlistTxNotifier } from '@/features/watchlist/WatchlistTxNotifier';
import { mainnetNetwork } from '@/common/constants/network';
import { renderWithProviders } from '@/common/utils/test-utils/render-utils';
import { act, screen } from '@testing-library/react';
import toast from 'react-hot-toast';

const ADDR = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

let gTick = 0;

function txIdForTick(tick: number) {
  const body = tick === 0 ? 'a' : 'b';
  return `0x${body.repeat(64)}`;
}

describe('WatchlistTxNotifier', () => {
  beforeEach(() => {
    gTick = 0;
    jest.mocked(toast.custom).mockClear();
    mockTxQueries.mockImplementation((principals: string[]) =>
      principals.map(() => ({
        data: {
          results: [
            {
              tx: {
                tx_id: txIdForTick(gTick),
                tx_type: 'token_transfer' as const,
                sender_address: ADDR,
                token_transfer: {
                  recipient_address: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5',
                  amount: '1',
                  memo: '',
                },
                block_time: 1_700_000_000,
              },
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        },
        isSuccess: true,
        isError: false,
        isFetching: false,
        isPending: false,
        dataUpdatedAt: Date.now(),
      }))
    );
  });

  function Harness({ tick }: { tick: number }) {
    return (
      <>
        <span data-testid="tick">{tick}</span>
        <WatchlistTxNotifier />
      </>
    );
  }

  it('fires toast once when newest tx id changes after seeding', async () => {
    const { rerender } = renderWithProviders(<Harness tick={0} />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1, lastViewedAt: 1 }],
          hydrated: true,
          notificationsDisabled: false,
        },
      } as any,
    });

    expect(screen.getByTestId('tick').textContent).toBe('0');

    await act(async () => {
      gTick = 1;
      rerender(
        <Harness tick={1} />
      );
    });

    expect(toast.custom).toHaveBeenCalledTimes(1);
  });

  it('does not toast while notifications are disabled', async () => {
    const { rerender } = renderWithProviders(<Harness tick={0} />, {
      preloadedState: {
        watchlist: {
          items: [{ principal: ADDR, addedAt: 1, lastViewedAt: 1 }],
          hydrated: true,
          notificationsDisabled: true,
        },
      } as any,
    });

    await act(async () => {
      gTick = 1;
      rerender(<Harness tick={1} />);
    });

    expect(toast.custom).not.toHaveBeenCalled();
  });
});
