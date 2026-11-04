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
import { TransactionSummaryListResponse, TransactionSummaryType } from '../types/tx-v3';
import { TWO_MINUTES } from './query-stale-time';

export const confirmedTxSummariesQueryKey = (networkId: number | string, limit: number) =>
  ['confirmedTxSummaries', networkId, limit] as const;

export const confirmedTxSummariesInfiniteQueryKey = (
  networkId: number | string,
  limit: number,
  types: TransactionSummaryType[] = []
) => ['confirmedTxSummariesInfinite', networkId, limit, types] as const;

/**
 * Cursor-paginated feed of recently mined transactions from `GET /extended/v3/transactions`,
 * restricted server-side to `types` when any are given (build them with `toTypeParam` so the same
 * selection always hits the same cache entry).
 */
export function useConfirmedTxSummariesInfinite(
  limit = DEFAULT_LIST_LIMIT,
  types: TransactionSummaryType[] = [],
  options: any = {}
): UseInfiniteQueryResult<InfiniteData<TransactionSummaryListResponse>> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();
  return useInfiniteQuery({
    queryKey: confirmedTxSummariesInfiniteQueryKey(activeNetwork.networkId, limit, types),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
      await callApiWithErrorHandling(apiClient, '/extended/v3/transactions', {
        params: {
          query: {
            limit,
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
