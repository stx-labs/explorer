import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { useFungibleTokensMetadata } from '../useFtMetadata';

// Mock the useGlobalContext hook used by useBulkFtMetadata
jest.mock('../../context/useGlobalContext', () => ({
  useGlobalContext: () => ({
    activeNetworkKey: 'https://api.hiro.so',
  }),
}));

const mockSearchResponse = [
  {
    contract_id: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-1',
    token_number: 1,
    token_type: 'ft',
    name: 'Test Token 1',
    symbol: 'TEST1',
    decimals: 6,
    total_supply: '1000000',
    token_uri: 'https://example.com/token/1',
    description: 'Test fungible token 1',
    image_uri: 'https://example.com/image1.png',
    tx_id: '0x1234',
    sender_address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  },
  {
    contract_id: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-2',
    token_number: 1,
    token_type: 'ft',
    name: 'Test Token 2',
    symbol: 'TEST2',
    decimals: 8,
    total_supply: '2000000',
    token_uri: 'https://example.com/token/2',
    description: 'Test fungible token 2',
    image_uri: 'https://example.com/image2.png',
    tx_id: '0x5678',
    sender_address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  },
];

function mockFetchResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    clone: function () {
      return this;
    },
  };
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFungibleTokensMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch and return metadata for multiple tokens via bulk search', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockFetchResponse(mockSearchResponse));

    const tokenIds = [
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-1',
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-2',
    ];

    const { result } = renderHook(() => useFungibleTokensMetadata(tokenIds), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.ftMetadata).toHaveLength(2);
    expect(result.current.ftMetadata[0]?.name).toBe('Test Token 1');
    expect(result.current.ftMetadata[0]?.symbol).toBe('TEST1');
    expect(result.current.ftMetadata[0]?.decimals).toBe(6);
    expect(result.current.ftMetadata[1]?.name).toBe('Test Token 2');
    expect(result.current.ftMetadata[1]?.symbol).toBe('TEST2');
    expect(result.current.ftMetadata[1]?.decimals).toBe(8);

    // Should make exactly one bulk request
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle empty token IDs array', () => {
    const tokenIds: string[] = [];

    const { result } = renderHook(() => useFungibleTokensMetadata(tokenIds), {
      wrapper: createWrapper(),
    });

    expect(result.current.ftMetadata).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
  });

  it('should return undefined for tokens not found in search results', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockFetchResponse([mockSearchResponse[0]]));

    const tokenIds = [
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-1',
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-unknown',
    ];

    const { result } = renderHook(() => useFungibleTokensMetadata(tokenIds), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.ftMetadata[0]?.name).toBe('Test Token 1');
    expect(result.current.ftMetadata[1]).toBeUndefined();
  });
});
