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
import { MempoolTransactionSummaryListResponse } from '../types/tx-v3';
import { THIRTY_SECONDS, TWO_MINUTES } from './query-stale-time';

export const mempoolTxSummariesQueryKey = (networkId: number | string, limit: number) =>
  ['mempoolTxSummaries', networkId, limit] as const;

export const mempoolTxSummariesInfiniteQueryKey = (networkId: number | string, limit: number) =>
  ['mempoolTxSummariesInfinite', networkId, limit] as const;

export const principalMempoolTxSummariesInfiniteQueryKey = (
  networkId: number | string,
  principal: string
) => ['principalMempoolTxSummariesInfinite', networkId, principal] as const;

/**
 * Cursor-paginated feed of a principal's pending (mempool) transactions from
 * `GET /extended/v3/principals/{principal}/mempool/transactions` — the v3 replacement for the
 * deprecated `GET /extended/v1/tx/mempool?address=`. Like the other v3 list endpoints it only
 * supports `limit` + `cursor`, so any type filtering is applied client-side over the fetched pages.
 */
export function usePrincipalMempoolTxSummariesInfinite(
  principal: string,
  options: any = {}
): UseInfiniteQueryResult<InfiniteData<MempoolTransactionSummaryListResponse>> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();
  return useInfiniteQuery({
    queryKey: principalMempoolTxSummariesInfiniteQueryKey(activeNetwork.networkId, principal),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
      await callApiWithErrorHandling(
        apiClient,
        '/extended/v3/principals/{principal}/mempool/transactions',
        {
          params: {
            path: { principal },
            query: { limit: DEFAULT_LIST_LIMIT, ...(pageParam ? { cursor: pageParam } : {}) },
          },
        }
      ),
    getNextPageParam: getNextCursorPageParam,
    initialPageParam: undefined as string | undefined,
    staleTime: TWO_MINUTES,
    enabled: !!principal,
    ...options,
  });
}

export function useMempoolTxSummaries(
  limit = DEFAULT_LIST_LIMIT,
  options: any = {}
): UseQueryResult<MempoolTransactionSummaryListResponse> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();
  return useQuery({
    queryKey: mempoolTxSummariesQueryKey(activeNetwork.networkId, limit),
    queryFn: async () =>
      await callApiWithErrorHandling(apiClient, '/extended/v3/mempool/transactions', {
        params: { query: { limit } },
      }),
    staleTime: THIRTY_SECONDS,
    ...options,
  });
}

/**
 * Cursor-paginated feed of recently broadcast mempool transactions from
 * `GET /extended/v3/mempool/transactions`. v3 only supports `limit` + `cursor` here — no
 * address/type/sort filters — so any filtering (e.g. by tx type) is applied client-side over
 * the fetched pages.
 */
export function useMempoolTxSummariesInfinite(
  limit = DEFAULT_LIST_LIMIT,
  options: any = {}
): UseInfiniteQueryResult<InfiniteData<MempoolTransactionSummaryListResponse>> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();
  return useInfiniteQuery({
    queryKey: mempoolTxSummariesInfiniteQueryKey(activeNetwork.networkId, limit),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
      await callApiWithErrorHandling(apiClient, '/extended/v3/mempool/transactions', {
        params: { query: { limit, ...(pageParam ? { cursor: pageParam } : {}) } },
      }),
    getNextPageParam: getNextCursorPageParam,
    initialPageParam: undefined as string | undefined,
    staleTime: TWO_MINUTES,
    ...options,
  });
}
