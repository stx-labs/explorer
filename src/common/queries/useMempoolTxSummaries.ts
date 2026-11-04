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
import {
  MempoolTransactionSummaryListResponse,
  MempoolTransactionSummaryType,
  MempoolTxsOrder,
  MempoolTxsSortBy,
} from '../types/tx-v3';
import { THIRTY_SECONDS, TWO_MINUTES } from './query-stale-time';

export const mempoolTxSummariesQueryKey = (networkId: number | string, limit: number) =>
  ['mempoolTxSummaries', networkId, limit] as const;

/** How the mempool feed is filtered and ordered; the API default is newest received first. */
export interface MempoolTxSummariesView {
  types?: MempoolTransactionSummaryType[];
  sortBy?: MempoolTxsSortBy;
  order?: MempoolTxsOrder;
}

export const DEFAULT_MEMPOOL_TXS_SORT_BY: MempoolTxsSortBy = 'receipt_time';
export const DEFAULT_MEMPOOL_TXS_ORDER: MempoolTxsOrder = 'desc';

export const mempoolTxSummariesInfiniteQueryKey = (
  networkId: number | string,
  limit: number,
  {
    types = [],
    sortBy = DEFAULT_MEMPOOL_TXS_SORT_BY,
    order = DEFAULT_MEMPOOL_TXS_ORDER,
  }: MempoolTxSummariesView = {}
) => ['mempoolTxSummariesInfinite', networkId, limit, types, sortBy, order] as const;

/**
 * Query-key base for {@link usePrincipalMempoolTxSummariesInfinite}. Exported so the tx-submit
 * handlers (faucet, contract call, deploy) can invalidate the Pending-tab feed by prefix without
 * re-deriving the key — the scenario that drifts if it's written as a literal in several places.
 */
export const PRINCIPAL_MEMPOOL_TX_SUMMARIES_INFINITE_KEY = 'principalMempoolTxSummariesInfinite';

export const principalMempoolTxSummariesInfiniteQueryKey = (
  networkId: number | string,
  principal: string
) => [PRINCIPAL_MEMPOOL_TX_SUMMARIES_INFINITE_KEY, networkId, principal] as const;

/**
 * Cursor-paginated feed of a principal's pending (mempool) transactions from
 * `GET /extended/v3/principals/{principal}/mempool/transactions` — the v3 replacement for the
 * deprecated `GET /extended/v1/tx/mempool?address=`. It only takes `limit` + `cursor`, so any type
 * filtering is applied client-side over the fetched pages.
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
 * Cursor-paginated feed of pending transactions from `GET /extended/v3/mempool/transactions`,
 * filtered by type and ordered server-side. A cursor only pages the `sort_by` it came from, which
 * holds here because the sort is part of the query key: changing it starts a new feed.
 */
export function useMempoolTxSummariesInfinite(
  limit = DEFAULT_LIST_LIMIT,
  view: MempoolTxSummariesView = {},
  options: any = {}
): UseInfiniteQueryResult<InfiniteData<MempoolTransactionSummaryListResponse>> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();
  const {
    types = [],
    sortBy = DEFAULT_MEMPOOL_TXS_SORT_BY,
    order = DEFAULT_MEMPOOL_TXS_ORDER,
  } = view;
  return useInfiniteQuery({
    queryKey: mempoolTxSummariesInfiniteQueryKey(activeNetwork.networkId, limit, {
      types,
      sortBy,
      order,
    }),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
      await callApiWithErrorHandling(apiClient, '/extended/v3/mempool/transactions', {
        params: {
          query: {
            limit,
            sort_by: sortBy,
            order,
            ...(types.length > 0 ? { type: types } : {}),
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        },
      }),
    getNextPageParam: getNextCursorPageParam,
    initialPageParam: undefined as string | undefined,
    staleTime: TWO_MINUTES,
    ...options,
  });
}
