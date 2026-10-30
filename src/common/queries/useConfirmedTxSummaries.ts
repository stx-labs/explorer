import {
  InfiniteData,
  UseInfiniteQueryResult,
  UseQueryResult,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { DEFAULT_LIST_LIMIT } from '../constants/constants';
import { useGlobalContext } from '../context/useGlobalContext';
import { getNextCursorPageParam } from '../hooks/useCursorInfiniteQueryResult';
import { TransactionSummaryListResponse } from '../types/tx-v3';
import { TWO_MINUTES } from './query-stale-time';

export const confirmedTxSummariesQueryKey = (networkId: number | string, limit: number) =>
  ['confirmedTxSummaries', networkId, limit] as const;

export const confirmedTxSummariesInfiniteQueryKey = (networkId: number | string, limit: number) =>
  ['confirmedTxSummariesInfinite', networkId, limit] as const;

/**
 * Cursor-paginated feed of recently mined transactions from `GET /extended/v3/transactions`.
 * v3 only supports `limit` + `cursor` here — no address/type/time/sort filters — so any
 * filtering (e.g. by tx type) is applied client-side over the fetched pages.
 */
export function useConfirmedTxSummariesInfinite(
  limit = DEFAULT_LIST_LIMIT,
  options: any = {}
): UseInfiniteQueryResult<InfiniteData<TransactionSummaryListResponse>> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();
  return useInfiniteQuery({
    queryKey: confirmedTxSummariesInfiniteQueryKey(activeNetwork.networkId, limit),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
      await callApiWithErrorHandling(apiClient, '/extended/v3/transactions', {
        params: { query: { limit, ...(pageParam ? { cursor: pageParam } : {}) } },
      }),
    getNextPageParam: getNextCursorPageParam,
    initialPageParam: undefined as string | undefined,
    staleTime: TWO_MINUTES,
    ...options,
  });
}

export function useConfirmedTxSummaries(
  limit = DEFAULT_LIST_LIMIT,
  options: any = {}
): UseQueryResult<TransactionSummaryListResponse> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();
  return useQuery({
    queryKey: confirmedTxSummariesQueryKey(activeNetwork.networkId, limit),
    queryFn: async () =>
      await callApiWithErrorHandling(apiClient, '/extended/v3/transactions', {
        params: { query: { limit } },
      }),
    staleTime: TWO_MINUTES,
    ...options,
  });
}
