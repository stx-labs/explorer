import {
  InfiniteData,
  UseInfiniteQueryResult,
  UseQueryResult,
  UseSuspenseInfiniteQueryResult,
  useInfiniteQuery,
  useQuery,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';

import {
  AddressTransaction,
  AddressTransactionEvent,
  AddressTransactionWithTransfers,
} from '@stacks/stacks-blockchain-api-types';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { DEFAULT_LIST_LIMIT } from '../constants/constants';
import { GenericResponseType } from '../hooks/useInfiniteQueryResult';
import { getNextPageParam } from '../utils/utils';
import { TWO_MINUTES } from './query-stale-time';

export const ADDRESS_CONFIRMED_TXS_WITH_TRANSFERS_INFINITE_QUERY_KEY =
  'addressConfirmedTxsWithTransfersInfinite';

export const ADDRESS_CONFIRMED_TXS_WITH_TRANSFERS_QUERY_KEY = 'addressConfirmedTxsWithTransfers';

export function getAddressConfirmedTxsWithTransfersQueryKey(
  principal: string,
  limit = DEFAULT_LIST_LIMIT,
  offset = 0
) {
  return [ADDRESS_CONFIRMED_TXS_WITH_TRANSFERS_QUERY_KEY, principal, limit, offset];
}

export function useAddressConfirmedTxsWithTransfers(
  principal: string,
  limit = DEFAULT_LIST_LIMIT,
  offset = 0,
  options: any = {}
): UseQueryResult<GenericResponseType<AddressTransactionWithTransfers>> {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: getAddressConfirmedTxsWithTransfersQueryKey(principal, limit, offset),
    queryFn: async () => {
      return await callApiWithErrorHandling(
        apiClient,
        '/extended/v1/address/{principal}/transactions_with_transfers',
        {
          params: {
            query: {
              limit,
              offset,
            },
            path: { principal },
          },
        }
      );
    },
    ...options,
  });
}

export function useAddressConfirmedTxsWithTransfersInfinite(
  principal?: string,
  options: any = {}
): UseInfiniteQueryResult<InfiniteData<GenericResponseType<AddressTransactionWithTransfers>>> {
  const apiClient = useApiClient();
  return useInfiniteQuery({
    queryKey: [ADDRESS_CONFIRMED_TXS_WITH_TRANSFERS_INFINITE_QUERY_KEY, principal],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      if (!principal) return undefined;
      return await callApiWithErrorHandling(
        apiClient,
        '/extended/v1/address/{principal}/transactions_with_transfers',
        {
          params: {
            path: { principal },
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

export function useAddressTransactionEventsInfinite(
  address?: string,
  txId?: string,
  options: any = {}
): UseInfiniteQueryResult<InfiniteData<GenericResponseType<AddressTransactionEvent>>> {
  const apiClient = useApiClient();
  return useInfiniteQuery({
    queryKey: [ADDRESS_CONFIRMED_TXS_WITH_TRANSFERS_INFINITE_QUERY_KEY, address, txId],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      if (!address || !txId) return undefined;
      return await callApiWithErrorHandling(
        apiClient,
        '/extended/v2/addresses/{address}/transactions/{tx_id}/events',
        {
          params: {
            path: { address, tx_id: txId },
            query: { limit: DEFAULT_LIST_LIMIT, offset: pageParam || 0 },
          },
        }
      );
    },
    getNextPageParam,
    initialPageParam: 0,
    staleTime: TWO_MINUTES,
    enabled: !!address && !!txId,
    ...options,
  });
}

export function useSuspenseAddressTransactionInfinite(
  address?: string,
  options: any = {}
): UseSuspenseInfiniteQueryResult<InfiniteData<GenericResponseType<AddressTransaction>>> {
  const apiClient = useApiClient();
  if (!address) throw new Error('Address is required');
  return useSuspenseInfiniteQuery({
    queryKey: [ADDRESS_CONFIRMED_TXS_WITH_TRANSFERS_INFINITE_QUERY_KEY, address],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      if (!address) return undefined;
      return await callApiWithErrorHandling(
        apiClient,
        '/extended/v2/addresses/{address}/transactions',
        {
          params: {
            path: { address },
            query: { limit: DEFAULT_LIST_LIMIT, offset: pageParam || 0 },
          },
        }
      );
    },
    getNextPageParam,
    initialPageParam: 0,
    staleTime: TWO_MINUTES,
    ...options,
  });
}
