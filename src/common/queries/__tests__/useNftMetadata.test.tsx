import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { useMetadataApi } from '../../api/useApi';
import { getNftMetadataQueryKey, useNftsMetadata, useNftsMetadataQueries } from '../useNftMetadata';

// Mock the useMetadataApi hook
jest.mock('../../api/useApi');
const mockUseMetadataApi = useMetadataApi as jest.MockedFunction<typeof useMetadataApi>;

// Mock NFT metadata response
const mockNftMetadata1 = {
  token_uri: 'https://example.com/token/1',
  metadata: {
    name: 'Test NFT 1',
    description: 'Test description 1',
  },
};

const mockNftMetadata2 = {
  token_uri: 'https://example.com/token/2',
  metadata: {
    name: 'Test NFT 2',
    description: 'Test description 2',
  },
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

describe('useNftsMetadataQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMetadataApi.mockReturnValue(mockTokenMetadataApi);
  });

  it('should return useQueries result for multiple token IDs', async () => {
    const tokenIds = ['1', '2'];
    const contractId = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.test-contract';

    mockTokenMetadataApi.getNftMetadata
      .mockResolvedValueOnce(mockNftMetadata1)
      .mockResolvedValueOnce(mockNftMetadata2);

    const { result } = renderHook(() => useNftsMetadataQueries(tokenIds, contractId), {
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

    expect(result.current[0].data).toEqual(mockNftMetadata1);
    expect(result.current[1].data).toEqual(mockNftMetadata2);
    expect(mockTokenMetadataApi.getNftMetadata).toHaveBeenCalledTimes(2);
    expect(mockTokenMetadataApi.getNftMetadata).toHaveBeenCalledWith(contractId, 1);
    expect(mockTokenMetadataApi.getNftMetadata).toHaveBeenCalledWith(contractId, 2);
  });

  it('should handle empty token IDs array', () => {
    const tokenIds: string[] = [];
    const contractId = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.test-contract';

    const { result } = renderHook(() => useNftsMetadataQueries(tokenIds, contractId), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(0);
    expect(mockTokenMetadataApi.getNftMetadata).not.toHaveBeenCalled();
  });

  it('should disable queries for empty token IDs', () => {
    const tokenIds = ['1', '', '3'];
    const contractId = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.test-contract';

    const { result } = renderHook(() => useNftsMetadataQueries(tokenIds, contractId), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveLength(3);
    expect(result.current[0].isLoading).toBe(true); // token ID '1' should be enabled
    expect(result.current[1].fetchStatus).toBe('idle'); // empty token ID should be disabled
    expect(result.current[2].isLoading).toBe(true); // token ID '3' should be enabled
  });
});

describe('useNftsMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMetadataApi.mockReturnValue(mockTokenMetadataApi);
  });

  it('should transform query results into convenient format', async () => {
    const tokenIds = ['1', '2'];
    const contractId = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.test-contract';

    mockTokenMetadataApi.getNftMetadata
      .mockResolvedValueOnce(mockNftMetadata1)
      .mockResolvedValueOnce(mockNftMetadata2);

    const { result } = renderHook(() => useNftsMetadata(tokenIds, contractId), {
      wrapper: createWrapper(),
    });

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.data).toEqual([undefined, undefined]);
    expect(result.current.metadataErrors).toEqual([]);

    // Wait for queries to resolve
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([mockNftMetadata1, mockNftMetadata2]);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.metadataErrors).toEqual([]);
  });

  it('should handle mixed success and error states', async () => {
    const tokenIds = ['1', '2'];
    const contractId = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.test-contract';
    const mockError = new Error('Failed to fetch metadata');

    mockTokenMetadataApi.getNftMetadata
      .mockResolvedValueOnce(mockNftMetadata1)
      .mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useNftsMetadata(tokenIds, contractId), {
      wrapper: createWrapper(),
    });

    // Wait for queries to resolve
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([mockNftMetadata1, undefined]);
    expect(result.current.metadataErrors).toEqual([mockError]);
  });

  it('should handle all loading states correctly', async () => {
    const tokenIds = ['1', '2'];
    const contractId = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.test-contract';

    // Mock one query to resolve immediately, another to be pending
    mockTokenMetadataApi.getNftMetadata
      .mockResolvedValueOnce(mockNftMetadata1)
      .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useNftsMetadata(tokenIds, contractId), {
      wrapper: createWrapper(),
    });

    // Should be loading while any query is loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);

    // Wait for first query to resolve
    await waitFor(() => {
      expect(result.current.data[0]).toEqual(mockNftMetadata1);
    });

    // Should still be loading because second query is pending
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
  });

  it('should handle empty token IDs array', () => {
    const tokenIds: string[] = [];
    const contractId = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.test-contract';

    const { result } = renderHook(() => useNftsMetadata(tokenIds, contractId), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.metadataErrors).toEqual([]);
  });
});
