import { InfiniteData, UseInfiniteQueryResult, useInfiniteQuery } from '@tanstack/react-query';

import { AddressTransaction } from '@stacks/stacks-blockchain-api-types';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { DEFAULT_LIST_LIMIT } from '../constants/constants';
import { GenericResponseType } from '../hooks/useInfiniteQueryResult';
import { getNextPageParam } from '../utils/utils';
import { TWO_MINUTES } from './query-stale-time';

export const ADDRESS_CONFIRMED_TXS_WITH_TRANSFERS_INFINITE_QUERY_KEY =
  'addressConfirmedTxsWithTransfersInfinite';

export function useAddressConfirmedTxsWithTransfersInfinite(
  principal?: string,
  options: any = {}
): UseInfiniteQueryResult<InfiniteData<GenericResponseType<AddressTransaction>>> {
  const apiClient = useApiClient();
  return useInfiniteQuery({
    queryKey: [ADDRESS_CONFIRMED_TXS_WITH_TRANSFERS_INFINITE_QUERY_KEY, principal],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      if (!principal) return undefined;
      return await callApiWithErrorHandling(
        apiClient,
        '/extended/v2/addresses/{address}/transactions',
        {
          params: {
            path: { address: principal },
            query: { limit: DEFAULT_LIST_LIMIT, offset: pageParam || 0 },
          },
        }
      );
    },
    getNextPageParam,
    initialPageParam: 0,
    staleTime: TWO_MINUTES,
    enabled: !!principal,
    ...options,
  });
}
