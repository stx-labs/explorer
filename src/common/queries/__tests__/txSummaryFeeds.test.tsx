import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { useApiClient } from '../../../api/useApiClient';
import { useGlobalContext } from '../../context/useGlobalContext';
import {
  confirmedTxSummariesInfiniteQueryKey,
  useConfirmedTxSummariesInfinite,
} from '../useConfirmedTxSummaries';
import {
  mempoolTxSummariesInfiniteQueryKey,
  useMempoolTxSummariesInfinite,
} from '../useMempoolTxSummaries';

jest.mock('../../../api/useApiClient');
jest.mock('../../context/useGlobalContext');
const mockUseApiClient = useApiClient as jest.MockedFunction<typeof useApiClient>;
const mockUseGlobalContext = useGlobalContext as jest.MockedFunction<typeof useGlobalContext>;

const mockClient = { GET: jest.fn() } as any;
const page = (next: string | null) => ({
  total: 1,
  limit: 20,
  cursor: { next, previous: null, current: 'c' },
  results: [],
});

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const queryOfCall = (index: number) => mockClient.GET.mock.calls[index][1].params.query;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseApiClient.mockReturnValue(mockClient);
  mockUseGlobalContext.mockReturnValue({ activeNetwork: { networkId: 1 } } as any);
});

describe('useConfirmedTxSummariesInfinite', () => {
  test('requests every type when no type is selected', async () => {
    mockClient.GET.mockResolvedValue({ data: page(null), error: undefined });
    const { result } = renderHook(() => useConfirmedTxSummariesInfinite(20), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.GET).toHaveBeenCalledWith('/extended/v3/transactions', {
      params: { query: { limit: 20 } },
    });
  });

  test('has the API filter by the selected types on every page', async () => {
    mockClient.GET.mockResolvedValueOnce({ data: page('next'), error: undefined });
    mockClient.GET.mockResolvedValueOnce({ data: page(null), error: undefined });
    const { result } = renderHook(
      () => useConfirmedTxSummariesInfinite(20, ['coinbase', 'token_transfer']),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryOfCall(0)).toEqual({ limit: 20, type: ['coinbase', 'token_transfer'] });

    await result.current.fetchNextPage();
    expect(queryOfCall(1)).toEqual({
      limit: 20,
      type: ['coinbase', 'token_transfer'],
      cursor: 'next',
    });
  });

  test('keys each type selection separately', () => {
    expect(confirmedTxSummariesInfiniteQueryKey(1, 20, ['coinbase'])).not.toEqual(
      confirmedTxSummariesInfiniteQueryKey(1, 20)
    );
  });
});

describe('useMempoolTxSummariesInfinite', () => {
  test('defaults to every type, newest received first', async () => {
    mockClient.GET.mockResolvedValue({ data: page(null), error: undefined });
    const { result } = renderHook(() => useMempoolTxSummariesInfinite(20), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.GET).toHaveBeenCalledWith('/extended/v3/mempool/transactions', {
      params: { query: { limit: 20, sort_by: 'receipt_time', order: 'desc' } },
    });
  });

  test('has the API filter and sort, keeping both on later pages', async () => {
    mockClient.GET.mockResolvedValueOnce({ data: page('fee:180:0x01'), error: undefined });
    mockClient.GET.mockResolvedValueOnce({ data: page(null), error: undefined });
    const { result } = renderHook(
      () =>
        useMempoolTxSummariesInfinite(20, {
          types: ['contract_call'],
          sortBy: 'fee',
          order: 'asc',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryOfCall(0)).toEqual({
      limit: 20,
      sort_by: 'fee',
      order: 'asc',
      type: ['contract_call'],
    });

    await result.current.fetchNextPage();
    expect(queryOfCall(1)).toEqual({
      limit: 20,
      sort_by: 'fee',
      order: 'asc',
      type: ['contract_call'],
      cursor: 'fee:180:0x01',
    });
  });

  test('starts a new feed when the sort changes, since a cursor only pages its own sort_by', () => {
    const byTime = mempoolTxSummariesInfiniteQueryKey(1, 20);
    expect(mempoolTxSummariesInfiniteQueryKey(1, 20, { sortBy: 'receipt_time' })).toEqual(byTime);
    expect(mempoolTxSummariesInfiniteQueryKey(1, 20, { sortBy: 'fee' })).not.toEqual(byTime);
    expect(mempoolTxSummariesInfiniteQueryKey(1, 20, { order: 'asc' })).not.toEqual(byTime);
  });
});
