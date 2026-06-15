import {
  InfiniteData,
  UseQueryResult,
  UseSuspenseInfiniteQueryResult,
  useQuery,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { ADDRESS_ID_PAGE_ADDRESS_TXS_LIMIT } from '../components/table/table-examples/consts';
import { useGlobalContext } from '../context/useGlobalContext';
import { getNextCursorPageParam } from '../hooks/useCursorInfiniteQueryResult';
import { PrincipalTransactionSummaryListResponse } from '../types/tx-v3';
import { TWO_MINUTES } from './query-stale-time';

export function useSuspensePrincipalTxSummariesInfinite(
  principal: string,
  options: any = {}
): UseSuspenseInfiniteQueryResult<InfiniteData<PrincipalTransactionSummaryListResponse>> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();
  return useSuspenseInfiniteQuery({
    queryKey: ['principalTxSummariesInfinite', activeNetwork.networkId, principal],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
      await callApiWithErrorHandling(
        apiClient,
        '/extended/v3/principals/{principal}/transactions',
        {
          params: {
            path: { principal },
            query: {
              limit: ADDRESS_ID_PAGE_ADDRESS_TXS_LIMIT,
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

export function usePrincipalTxSummaries(
  principal: string,
  limit: number,
  options: any = {}
): UseQueryResult<PrincipalTransactionSummaryListResponse> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();
  return useQuery({
    queryKey: ['principalTxSummaries', activeNetwork.networkId, principal, limit],
    queryFn: async () =>
      await callApiWithErrorHandling(
        apiClient,
        '/extended/v3/principals/{principal}/transactions',
        {
          params: { path: { principal }, query: { limit } },
        }
      ),
    staleTime: TWO_MINUTES,
    enabled: !!principal,
    ...options,
  });
}
