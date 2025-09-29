import {
  InfiniteData,
  UseInfiniteQueryResult,
  UseQueryResult,
  UseSuspenseInfiniteQueryResult,
  useInfiniteQuery,
  useQuery,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';

import { BurnBlock } from '@stacks/blockchain-api-client';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { DEFAULT_BURN_BLOCKS_LIMIT } from '../constants/constants';
import { useGlobalContext } from '../context/useGlobalContext';
import { GenericResponseType } from '../hooks/useInfiniteQueryResult';
import { getNextPageParam } from '../utils/utils';
import { TWO_MINUTES } from './query-stale-time';

export const BURN_BLOCKS_QUERY_KEY = 'burnBlocks';

export function getBurnBlocksQueryKey(
  limit: number,
  offset: number,
  networkUrl: string,
  queryKeyExtension?: string
) {
  return [
    BURN_BLOCKS_QUERY_KEY,
    limit,
    offset,
    networkUrl,
    ...(queryKeyExtension ? [queryKeyExtension] : []),
  ];
}

export function useBurnBlocksInfinite(
  limit = DEFAULT_BURN_BLOCKS_LIMIT,
  options: any = {},
  queryKeyExtension?: string
): UseInfiniteQueryResult<InfiniteData<GenericResponseType<BurnBlock>>> {
  const apiClient = useApiClient();
  return useInfiniteQuery({
    queryKey: queryKeyExtension
      ? [BURN_BLOCKS_QUERY_KEY, limit, queryKeyExtension]
      : [BURN_BLOCKS_QUERY_KEY, limit],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await callApiWithErrorHandling(apiClient, '/extended/v2/burn-blocks/', {
        params: { query: { limit, offset: pageParam } },
      });
    },
    getNextPageParam,
    initialPageParam: 0,
    staleTime: TWO_MINUTES,
    ...options,
  });
}

export function useSuspenseBurnBlocks(
  limit = DEFAULT_BURN_BLOCKS_LIMIT,
  options: any = {},
  queryKeyExtension?: string
): UseSuspenseInfiniteQueryResult<InfiniteData<GenericResponseType<BurnBlock>>> {
  const apiClient = useApiClient();
  return useSuspenseInfiniteQuery({
    queryKey: queryKeyExtension
      ? [BURN_BLOCKS_QUERY_KEY, limit, queryKeyExtension]
      : [BURN_BLOCKS_QUERY_KEY, limit],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await callApiWithErrorHandling(apiClient, '/extended/v2/burn-blocks/', {
        params: { query: { limit, offset: pageParam } },
      });
    },
    getNextPageParam,
    initialPageParam: 0,
    staleTime: TWO_MINUTES,
    ...options,
  });
}

export function useBurnBlocks(
  limit = DEFAULT_BURN_BLOCKS_LIMIT,
  offset?: number,
  options: any = {},
  queryKeyExtension?: string
): UseQueryResult<GenericResponseType<BurnBlock>> {
  const apiClient = useApiClient();
  const activeNetwork = useGlobalContext().activeNetwork;

  return useQuery({
    queryKey: getBurnBlocksQueryKey(limit, offset || 0, activeNetwork.url, queryKeyExtension),
    queryFn: async () => {
      return await callApiWithErrorHandling(apiClient, '/extended/v2/burn-blocks/', {
        params: { query: { limit, offset } },
      });
    },
    staleTime: TWO_MINUTES,
    ...options,
  });
}

export function useBurnBlocksPaginated(
  pageIndex: number,
  limit = DEFAULT_BURN_BLOCKS_LIMIT,
  options: any = {}
): UseQueryResult<GenericResponseType<BurnBlock>> {
  const offset = pageIndex * limit;
  return useBurnBlocks(limit, offset, options);
}
