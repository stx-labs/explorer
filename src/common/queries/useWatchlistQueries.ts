'use client';

import { useQueries, useQuery } from '@tanstack/react-query';

import { AddressTransactionsV2ListResponse } from '@stacks/stacks-blockchain-api-types';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { useGlobalContext } from '../context/useGlobalContext';
import { getAddressTxsQueryKey } from './useAddressConfirmedTxsWithTransfersInfinite';
import { fetchWatchlistBalancesForClient } from './watchlistBalancesBatch';

/** Page size for watchlist address tx API calls (combined feed uses the same per-address window). */
export const WATCHLIST_TX_ITEMS_PER_PAGE = 20;
export const WATCHLIST_TX_INITIAL_LIMIT = WATCHLIST_TX_ITEMS_PER_PAGE;

export const WATCHLIST_QUERY_STALE_MS = 30_000;
export const WATCHLIST_QUERY_GC_MS = 300_000;

export const watchlistBalancesQueryKey = (baseUrl: string, principalsKey: string) =>
  ['watchlist-balances', baseUrl, principalsKey] as const;

/**
 * Single React Query that loads all watchlist balances (one browser POST to /api/watchlist/balances when allowed).
 */
export function useWatchlistBalancesBatch(principals: string[], enabled: boolean) {
  const { activeNetworkKey: baseUrl } = useGlobalContext();
  const principalsKey = principals.join('|');

  const query = useQuery({
    queryKey: watchlistBalancesQueryKey(baseUrl, principalsKey),
    queryFn: () => fetchWatchlistBalancesForClient(principals, baseUrl),
    enabled: enabled && principals.length > 0,
    staleTime: WATCHLIST_QUERY_STALE_MS,
    gcTime: WATCHLIST_QUERY_GC_MS,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
    placeholderData: previousData => previousData,
  });

  const balanceByPrincipal = query.data ?? {};

  return {
    balanceByPrincipal,
    balancesReady: query.isSuccess,
    loadedCount: query.isSuccess ? principals.length : 0,
    totalCount: principals.length,
    balanceQuery: query,
    anyBalanceError: query.isError,
    isBalanceFetching: query.isFetching,
    balanceLastUpdated: query.dataUpdatedAt,
  };
}

async function fetchAddressTransactions(
  apiClient: ReturnType<typeof useApiClient>,
  principal: string,
  limit: number,
  offset: number
): Promise<AddressTransactionsV2ListResponse | undefined> {
  if (!principal) return undefined;
  const v2Response = await callApiWithErrorHandling(
    apiClient,
    '/extended/v2/addresses/{address}/transactions',
    {
      params: {
        path: { address: principal },
        query: { limit, offset },
      },
    }
  );
  return v2Response as AddressTransactionsV2ListResponse;
}

export function useWatchlistTransactionQueries(
  principals: string[],
  limit: number,
  offset: number,
  enabled: boolean
) {
  const apiClient = useApiClient();
  const { activeNetworkKey: baseUrl } = useGlobalContext();
  return useQueries({
    queries: principals.map(principal => ({
      queryKey: [...getAddressTxsQueryKey(principal, limit, offset), baseUrl, 'watchlist'],
      queryFn: () => fetchAddressTransactions(apiClient, principal, limit, offset),
      staleTime: WATCHLIST_QUERY_STALE_MS,
      gcTime: WATCHLIST_QUERY_GC_MS,
      refetchInterval: 30_000,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: 1000,
      placeholderData: (previousData: AddressTransactionsV2ListResponse | undefined) =>
        previousData,
      enabled: enabled && principals.length > 0 && !!principal,
    })),
  });
}
