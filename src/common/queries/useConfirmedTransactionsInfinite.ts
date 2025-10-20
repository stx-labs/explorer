import {
  InfiniteData,
  UseInfiniteQueryResult,
  UseQueryResult,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import { Transaction, TransactionType } from '@stacks/stacks-blockchain-api-types';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { DEFAULT_LIST_LIMIT } from '../constants/constants';
import { useGlobalContext } from '../context/useGlobalContext';
import { GenericResponseType } from '../hooks/useInfiniteQueryResult';
import { getNextPageParam, hasBnsExtension } from '../utils/utils';
import { TWO_MINUTES } from './query-stale-time';
import { searchByBnsName } from './useSearchQuery';

type FilterProps = {
  fromAddress?: string;
  toAddress?: string;
  startTime?: string;
  endTime?: string;
  transactionType?: string[];
  order?: 'asc' | 'desc' | undefined;
  sortBy?: string;
};

export function useConfirmedTransactionsInfinite(
  { fromAddress, toAddress, startTime, endTime, transactionType, order, sortBy }: FilterProps = {},
  options: any = {}
): UseInfiniteQueryResult<InfiniteData<GenericResponseType<Transaction>>> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();
  return useInfiniteQuery({
    queryKey: [
      'confirmedTransactionsInfinite',
      fromAddress,
      toAddress,
      startTime,
      endTime,
      transactionType,
      order,
      sortBy,
    ],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      let resolvedFromAddress = fromAddress;
      let resolvedToAddress = toAddress;
      if (hasBnsExtension(fromAddress)) {
        const fromResult = await searchByBnsName(activeNetwork.mode, fromAddress!);
        resolvedFromAddress =
          (fromResult?.found ? (fromResult.result as any).entity_id : undefined) || fromAddress;
      }
      if (hasBnsExtension(toAddress)) {
        const toResult = await searchByBnsName(activeNetwork.mode, toAddress!);
        resolvedToAddress =
          (toResult?.found ? (toResult.result as any).entity_id : undefined) || toAddress;
      }

      return await callApiWithErrorHandling(apiClient, '/extended/v1/tx/', {
        params: {
          query: {
            limit: DEFAULT_LIST_LIMIT,
            offset: pageParam,
            ...(resolvedFromAddress && { from_address: resolvedFromAddress }),
            ...(resolvedToAddress && { to_address: resolvedToAddress }),
            ...(startTime && { start_time: Number(startTime) }),
            ...(endTime && { end_time: Number(endTime) }),
            ...(transactionType && {
              type: transactionType as TransactionType[],
            }),
            ...(sortBy && {
              sort_by: sortBy as 'block_height' | 'burn_block_time' | 'fee' | undefined,
            }),
            order,
          },
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam,
    staleTime: TWO_MINUTES,
    refetchOnWindowFocus: true,
    ...options,
  });
}

export function useConfirmedTransactions(
  limit = DEFAULT_LIST_LIMIT,
  offset = 0,
  { fromAddress, toAddress, startTime, endTime, transactionType, order, sortBy }: FilterProps = {},
  options: any = {}
): UseQueryResult<GenericResponseType<Transaction>> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();
  return useQuery({
    queryKey: [
      'confirmedTransactions',
      limit,
      offset,
      ...(fromAddress ? [{ fromAddress }] : []),
      ...(toAddress ? [{ toAddress }] : []),
      ...(startTime ? [{ startTime }] : []),
      ...(endTime ? [{ endTime }] : []),
      ...(order ? [{ order }] : []),
      ...(sortBy ? [{ sortBy }] : []),
      ...(transactionType ? [{ transactionType }] : []),
    ],
    queryFn: async () => {
      let resolvedFromAddress = fromAddress;
      let resolvedToAddress = toAddress;
      if (hasBnsExtension(fromAddress)) {
        const fromResult = await searchByBnsName(activeNetwork.mode, fromAddress!);
        resolvedFromAddress =
          (fromResult?.found ? (fromResult.result as any).entity_id : undefined) || fromAddress;
      }
      if (hasBnsExtension(toAddress)) {
        const toResult = await searchByBnsName(activeNetwork.mode, toAddress!);
        resolvedToAddress =
          (toResult?.found ? (toResult.result as any).entity_id : undefined) || toAddress;
      }

      return await callApiWithErrorHandling(apiClient, '/extended/v1/tx/', {
        params: {
          query: {
            limit: limit || DEFAULT_LIST_LIMIT,
            offset,
            ...(resolvedFromAddress && { from_address: resolvedFromAddress }),
            ...(resolvedToAddress && { to_address: resolvedToAddress }),
            ...(startTime && { start_time: Number(startTime) }),
            ...(endTime && { end_time: Number(endTime) }),
            ...(sortBy && {
              sort_by: sortBy as 'block_height' | 'burn_block_time' | 'fee' | undefined,
            }),
            ...(transactionType && {
              type: transactionType as TransactionType[],
            }),
            order,
          },
        },
      });
    },
    ...options,
  });
}
