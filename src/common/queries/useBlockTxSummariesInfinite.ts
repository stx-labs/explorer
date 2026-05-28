import {
  InfiniteData,
  UseSuspenseInfiniteQueryResult,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { MAX_BLOCK_TRANSACTIONS_PER_CALL } from '../constants/constants';
import { getNextCursorPageParam } from '../hooks/useCursorInfiniteQueryResult';
import { BlockTransactionSummaryListResponse } from '../types/tx-v3';
import { TWO_MINUTES } from './query-stale-time';

export function useSuspenseBlockTxSummariesInfinite(
  blockHashOrHeight: string,
  options: any = {}
): UseSuspenseInfiniteQueryResult<InfiniteData<BlockTransactionSummaryListResponse>> {
  const apiClient = useApiClient();
  return useSuspenseInfiniteQuery({
    queryKey: ['blockTxSummariesInfinite', blockHashOrHeight],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
      await callApiWithErrorHandling(
        apiClient,
        '/extended/v3/blocks/{height_or_hash}/transactions',
        {
          params: {
            path: { height_or_hash: blockHashOrHeight },
            query: {
              limit: MAX_BLOCK_TRANSACTIONS_PER_CALL,
              ...(pageParam ? { cursor: pageParam } : {}),
            },
          },
        }
      ),
    getNextPageParam: getNextCursorPageParam,
    initialPageParam: undefined as string | undefined,
    staleTime: TWO_MINUTES,
    ...options,
  });
}
