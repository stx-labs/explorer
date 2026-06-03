import { UseQueryResult, useQuery } from '@tanstack/react-query';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { DEFAULT_LIST_LIMIT } from '../constants/constants';
import { useGlobalContext } from '../context/useGlobalContext';
import { TransactionSummaryListResponse } from '../types/tx-v3';
import { TWO_MINUTES } from './query-stale-time';

export const confirmedTxSummariesQueryKey = (networkId: number | string, limit: number) =>
  ['confirmedTxSummaries', networkId, limit] as const;

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
