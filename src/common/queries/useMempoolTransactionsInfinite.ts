import { InfiniteData, UseInfiniteQueryResult, useInfiniteQuery } from '@tanstack/react-query';

import { MempoolTransaction } from '@stacks/stacks-blockchain-api-types';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { DEFAULT_LIST_LIMIT } from '../constants/constants';
import { GenericResponseType } from '../hooks/useInfiniteQueryResult';
import { getNextPageParam } from '../utils/utils';
import { TWO_MINUTES } from './query-stale-time';

type MempoolFilterProps = {
  fromAddress?: string;
  toAddress?: string;
  transactionType?: string[];
};

export function useMempoolTransactionsInfinite(
  sort: 'age' | 'size' | 'fee' | undefined = 'age',
  order: 'asc' | 'desc' | undefined = 'asc',
  filters: MempoolFilterProps = {}
): UseInfiniteQueryResult<InfiniteData<GenericResponseType<MempoolTransaction>>> {
  const apiClient = useApiClient();
  const { fromAddress, toAddress } = filters;

  return useInfiniteQuery({
    queryKey: ['mempoolTransactionsInfinite', sort, order, fromAddress, toAddress],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await callApiWithErrorHandling(apiClient, '/extended/v1/tx/mempool', {
        params: {
          query: {
            limit: DEFAULT_LIST_LIMIT,
            offset: pageParam || 0,
            order,
            order_by: sort,
            ...(fromAddress && { sender_address: fromAddress }),
            ...(toAddress && { recipient_address: toAddress }),
          },
        },
      });
    },
    getNextPageParam,
    initialPageParam: 0,
    staleTime: TWO_MINUTES,
    refetchOnMount: false,
    retry: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });
}
