import { renderWithProviders } from '@/common/utils/test-utils/render-utils';
import { mainnetNetwork } from '@/common/constants/network';
import { screen } from '@testing-library/react';

import WatchlistPageClient from '../WatchlistPageClient';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), prefetch: jest.fn() })),
}));

const mockUseGlobalContext = jest.fn();
jest.mock('@/common/context/useGlobalContext', () => ({
  useGlobalContext: () => mockUseGlobalContext(),
}));

jest.mock('@/common/queries/useWatchlistQueries', () => {
  const actual = jest.requireActual('@/common/queries/useWatchlistQueries');
  return {
    ...actual,
    useWatchlistBalancesBatch: (principals: string[], enabled: boolean) =>
      actual.useWatchlistBalancesBatch(principals, false),
    useWatchlistTransactionQueries: () => [],
  };
});

describe('WatchlistPageClient accessibility & loading chrome', () => {
  beforeEach(() => {
    mockUseGlobalContext.mockReturnValue({
      activeNetwork: mainnetNetwork,
      activeNetworkKey: mainnetNetwork.url,
    });
  });

  it('shows skeleton layout before hydration (no crash, no undefined text)', () => {
    const { container } = renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: { items: [], hydrated: false, notificationsDisabled: false },
      } as any,
    });
    expect(container.querySelector('.chakra-skeleton')).toBeTruthy();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it('empty state exposes a primary CTA button', () => {
    renderWithProviders(<WatchlistPageClient />, {
      preloadedState: {
        watchlist: { items: [], hydrated: true, notificationsDisabled: false },
      } as any,
    });
    expect(screen.getByRole('button', { name: /найти адрес/i })).toBeInTheDocument();
  });
});
