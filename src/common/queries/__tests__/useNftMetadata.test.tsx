import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { useMetadataApi } from '../../api/useApi';
import { getNftMetadataQueryKey, useNftMetadata } from '../useNftMetadata';

// Mock the useMetadataApi hook
jest.mock('../../api/useApi');
const mockUseMetadataApi = useMetadataApi as jest.MockedFunction<typeof useMetadataApi>;

const mockNftMetadata = {
  token_uri: 'https://example.com/token/1',
  metadata: {
    sip: 9,
    name: 'Test NFT 1',
    description: 'Test description 1',
  },
};

const mockClient = {
  GET: jest.fn(),
} as any;

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

describe('getNftMetadataQueryKey', () => {
  it('should return correct query key', () => {
    const key = getNftMetadataQueryKey('SP123.contract', '42');
    expect(key).toEqual(['nft-metadata', 'SP123.contract', '42']);
  });
});

describe('useNftMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMetadataApi.mockReturnValue(mockClient);
  });

  it('should fetch NFT metadata for a given contract and token ID', async () => {
    mockClient.GET.mockResolvedValueOnce({ data: mockNftMetadata, error: undefined });

    const { result } = renderHook(
      () => useNftMetadata({ contractId: 'SP123.contract', tokenId: '42' }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockNftMetadata);
    expect(mockClient.GET).toHaveBeenCalledWith('/metadata/v1/nft/{principal}/{token_id}', {
      params: { path: { principal: 'SP123.contract', token_id: 42 } },
    });
  });

  it('should not fetch when contractId is undefined', () => {
    const { result } = renderHook(() => useNftMetadata({ contractId: undefined, tokenId: '42' }), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockClient.GET).not.toHaveBeenCalled();
  });

  it('should not fetch when tokenId is undefined', () => {
    const { result } = renderHook(
      () => useNftMetadata({ contractId: 'SP123.contract', tokenId: undefined }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockClient.GET).not.toHaveBeenCalled();
  });
});
