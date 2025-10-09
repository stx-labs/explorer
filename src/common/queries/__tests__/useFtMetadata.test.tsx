import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { useMetadataApi } from '../../api/useApi';
import { useFungibleTokensMetadata, useFungibleTokensMetadataQueries } from '../useFtMetadata';

// Mock the useMetadataApi hook
jest.mock('../../api/useApi');
const mockUseMetadataApi = useMetadataApi as jest.MockedFunction<typeof useMetadataApi>;

// Mock FT metadata response
const mockFtMetadata1 = {
  name: 'Test Token 1',
  symbol: 'TEST1',
  decimals: 6,
  total_supply: '1000000',
  token_uri: 'https://example.com/token/1',
  description: 'Test fungible token 1',
};

const mockFtMetadata2 = {
  name: 'Test Token 2',
  symbol: 'TEST2',
  decimals: 8,
  total_supply: '2000000',
  token_uri: 'https://example.com/token/2',
  description: 'Test fungible token 2',
};

const mockTokenMetadataApi = {
  getNftMetadata: jest.fn(),
  getFtMetadata: jest.fn(),
  getFungibleTokens: jest.fn(),
  getSftMetadata: jest.fn(),
  basePath: 'https://api.hiro.so',
  configuration: {},
  axios: {} as any,
} as any;

// Test wrapper component
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

describe('useFungibleTokensMetadataQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMetadataApi.mockReturnValue(mockTokenMetadataApi);
  });

  it('should return useQueries result for multiple token IDs', async () => {
    const tokenIds = [
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-1',
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-2',
    ];

    mockTokenMetadataApi.getFtMetadata
      .mockResolvedValueOnce(mockFtMetadata1)
      .mockResolvedValueOnce(mockFtMetadata2);

    const { result } = renderHook(() => useFungibleTokensMetadataQueries(tokenIds), {
      wrapper: createWrapper(),
    });

    // Initially should be loading
    expect(result.current).toHaveLength(2);
    expect(result.current[0].isLoading).toBe(true);
    expect(result.current[1].isLoading).toBe(true);

    // Wait for queries to resolve
    await waitFor(() => {
      expect(result.current[0].isSuccess).toBe(true);
      expect(result.current[1].isSuccess).toBe(true);
    });

    expect(result.current[0].data).toEqual(mockFtMetadata1);
    expect(result.current[1].data).toEqual(mockFtMetadata2);
    expect(mockTokenMetadataApi.getFtMetadata).toHaveBeenCalledTimes(2);
    expect(mockTokenMetadataApi.getFtMetadata).toHaveBeenCalledWith(tokenIds[0]);
    expect(mockTokenMetadataApi.getFtMetadata).toHaveBeenCalledWith(tokenIds[1]);
  });

  it('should handle empty token IDs array', () => {
    const tokenIds: string[] = [];

    const { result } = renderHook(() => useFungibleTokensMetadataQueries(tokenIds), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(0);
    expect(mockTokenMetadataApi.getFtMetadata).not.toHaveBeenCalled();
  });

  it('should disable queries for empty token IDs', () => {
    const tokenIds = [
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-1',
      '',
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-3',
    ];

    const { result } = renderHook(() => useFungibleTokensMetadataQueries(tokenIds), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(3);
    expect(result.current[0].isLoading).toBe(true); // token ID should be enabled
    expect(result.current[1].fetchStatus).toBe('idle'); // empty token ID should be disabled
    expect(result.current[2].isLoading).toBe(true); // token ID should be enabled
  });
});

describe('useFungibleTokensMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMetadataApi.mockReturnValue(mockTokenMetadataApi);
  });

  it('should transform query results into convenient format', async () => {
    const tokenIds = [
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-1',
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-2',
    ];

    mockTokenMetadataApi.getFtMetadata
      .mockResolvedValueOnce(mockFtMetadata1)
      .mockResolvedValueOnce(mockFtMetadata2);

    const { result } = renderHook(() => useFungibleTokensMetadata(tokenIds), {
      wrapper: createWrapper(),
    });

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.ftMetadata).toEqual([undefined, undefined]);
    expect(result.current.metadataErrors).toEqual([]);

    // Wait for queries to resolve
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.ftMetadata).toEqual([mockFtMetadata1, mockFtMetadata2]);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.metadataErrors).toEqual([]);
  });

  it('should handle mixed success and error states', async () => {
    const tokenIds = [
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-1',
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-2',
    ];
    const mockError = new Error('Failed to fetch FT metadata');

    mockTokenMetadataApi.getFtMetadata
      .mockResolvedValueOnce(mockFtMetadata1)
      .mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useFungibleTokensMetadata(tokenIds), {
      wrapper: createWrapper(),
    });

    // Wait for queries to resolve
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.ftMetadata).toEqual([mockFtMetadata1, undefined]);
    expect(result.current.metadataErrors).toEqual([mockError]);
  });

  it('should handle all loading states correctly', async () => {
    const tokenIds = [
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-1',
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-2',
    ];

    // Mock one query to resolve immediately, another to be pending
    mockTokenMetadataApi.getFtMetadata
      .mockResolvedValueOnce(mockFtMetadata1)
      .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useFungibleTokensMetadata(tokenIds), {
      wrapper: createWrapper(),
    });

    // Should be loading while any query is loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);

    // Wait for first query to resolve
    await waitFor(() => {
      expect(result.current.ftMetadata[0]).toEqual(mockFtMetadata1);
    });

    // Should still be loading because second query is pending
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
  });

  it('should handle empty token IDs array', () => {
    const tokenIds: string[] = [];

    const { result } = renderHook(() => useFungibleTokensMetadata(tokenIds), {
      wrapper: createWrapper(),
    });

    expect(result.current.ftMetadata).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.metadataErrors).toEqual([]);
  });
});
