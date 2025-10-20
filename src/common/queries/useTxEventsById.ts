import {
  InfiniteData,
  UseInfiniteQueryResult,
  UseQueryResult,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import {
  Transaction,
  TransactionEvent,
  TransactionEventType,
} from '@stacks/stacks-blockchain-api-types';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { DEFAULT_LIST_LIMIT, DEFAULT_TX_EVENTS_LIMIT } from '../constants/constants';
import { GenericResponseType } from '../hooks/useInfiniteQueryResult';
import { getNextPageParam } from '../utils/utils';

export const TX_EVENTS_BY_ID_QUERY_KEY = 'tx-by-id-infinite';
export function getTxEventsByIdQueryKey(
  limit: number,
  offset: number,
  txId: string,
  filters: TxEventsQueryFilters = {}
) {
  return [
    TX_EVENTS_BY_ID_QUERY_KEY,
    limit,
    offset,
    txId,
    ...(filters.address ? [{ address: filters.address }] : []),
    ...(filters.type ? [{ type: filters.type }] : []),
  ];
}

export function useTxEventsByIdInfinite(
  txId: string,
  options: any = {}
): UseInfiniteQueryResult<InfiniteData<GenericResponseType<TransactionEvent>>> {
  const apiClient = useApiClient();
  return useInfiniteQuery({
    queryKey: [TX_EVENTS_BY_ID_QUERY_KEY, txId],
    queryFn: async ({ pageParam }: { pageParam?: number }) => {
      const tx = await callApiWithErrorHandling(apiClient, '/extended/v1/tx/{tx_id}', {
        // This query isn't for tx events
        params: {
          path: { tx_id: txId },
          query: { event_limit: DEFAULT_TX_EVENTS_LIMIT, event_offset: pageParam },
        },
      });
      return {
        results: (tx as Transaction).events,
        total: (tx as Transaction).event_count,
        limit: DEFAULT_TX_EVENTS_LIMIT,
        offset: pageParam,
      };
    },
    staleTime: Infinity,
    getNextPageParam,
    initialPageParam: 0,
    ...options,
  });
}

export type TxEventsQueryFilters = {
  address?: string;
  type?: TransactionEventType[];
};

export function useTxEventsById(
  limit = DEFAULT_LIST_LIMIT,
  offset = 0,
  txId: string,
  { address, type }: TxEventsQueryFilters = {},
  options: any = {}
): UseQueryResult<{
  limit: number;
  offset: number;
  total: number;
  events: TransactionEvent[];
}> {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: getTxEventsByIdQueryKey(limit, offset, txId, { address, type }),
    queryFn: async () => {
      return await callApiWithErrorHandling(apiClient, '/extended/v1/tx/events', {
        params: {
          query: {
            tx_id: txId,
            limit,
            offset,
            ...(address && { address }),
            ...(type && { type }),
          },
        },
      });
    },
    ...options,
  });
}
