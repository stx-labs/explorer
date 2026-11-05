import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { useApiClient } from '../../../api/useApiClient';
import { useNftHoldings } from '../useNftHoldings';

jest.mock('../../../api/useApiClient');
const mockUseApiClient = useApiClient as jest.MockedFunction<typeof useApiClient>;

const mockClient = { GET: jest.fn() } as any;

const PRINCIPAL = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

const holdingsPage = {
  limit: 10,
  total: 1,
  cursor: { next: null, previous: null, current: null },
  results: [
    {
      asset_identifier:
        'SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173.the-explorer-guild::The-Explorer-Guild',
      value: { hex: '0x0100000000000000000000000000000001', repr: 'u1' },
    },
  ],
};

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseApiClient.mockReturnValue(mockClient);
});

describe('useNftHoldings', () => {
  it('reads holdings from the v3 principal NFT balances endpoint', async () => {
    mockClient.GET.mockResolvedValueOnce({ data: holdingsPage, error: undefined });

    const { result } = renderHook(() => useNftHoldings(PRINCIPAL, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.GET).toHaveBeenCalledWith(
      '/extended/v3/principals/{principal}/balances/nft',
      { params: { path: { principal: PRINCIPAL }, query: { limit: 10 } } }
    );
    expect(result.current.data).toEqual(holdingsPage);
  });

  it('passes the cursor to fetch a later page', async () => {
    mockClient.GET.mockResolvedValueOnce({ data: holdingsPage, error: undefined });

    const { result } = renderHook(() => useNftHoldings(PRINCIPAL, 10, '0x01:SP000.a::b'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.GET).toHaveBeenCalledWith(
      '/extended/v3/principals/{principal}/balances/nft',
      {
        params: {
          path: { principal: PRINCIPAL },
          query: { limit: 10, cursor: '0x01:SP000.a::b' },
        },
      }
    );
  });

  it('does not fetch without a principal', () => {
    renderHook(() => useNftHoldings(''), { wrapper: createWrapper() });
    expect(mockClient.GET).not.toHaveBeenCalled();
  });
});
