import { UseQueryResult, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { NakamotoBlock } from '@stacks/stacks-blockchain-api-types';

import { stacksAPIFetch } from '../../../api/stacksAPIFetch';
import { DEFAULT_LIST_LIMIT } from '../../../common/constants/constants';
import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { GenericResponseType } from '../../../common/hooks/useInfiniteQueryResult';
import { TWO_MINUTES } from '../../../common/queries/query-stale-time';
import { getNextPageParam } from '../../../common/utils/utils';

export const BLOCKS_V2_INFINITE_QUERY_KEY = 'blocksV2Infinite';
export const BLOCKS_V2_LIST_QUERY_KEY = 'blocksV2List';
export const BLOCKS_V2_PAGINATED_QUERY_KEY = 'blocksV2Paginated';

export function getBlocksV2InfiniteQueryKey(limit: number, network: string) {
  return [BLOCKS_V2_INFINITE_QUERY_KEY, limit, network];
}

export function getBlocksV2ListQueryKey(limit: number, networkUrl: string) {
  return [BLOCKS_V2_LIST_QUERY_KEY, limit, networkUrl];
}

export function getBlocksV2PaginatedQueryKey(limit: number, offset: number, networkUrl: string) {
  return [BLOCKS_V2_PAGINATED_QUERY_KEY, limit, offset, networkUrl];
}

export const useBlocksV2Infinite = (
  limit = DEFAULT_LIST_LIMIT,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchOnMount?: boolean | 'always';
    refetchOnReconnect?: boolean | 'always';
    refetchOnWindowFocus?: boolean | 'always';
  }
) => {
  const { apiClient, activeNetwork } = useGlobalContext();
  return useInfiniteQuery({
    queryKey: getBlocksV2InfiniteQueryKey(limit, activeNetwork.url),
    queryFn: async ({ pageParam }) => {
      const offset = pageParam || 0;
      const url = `${activeNetwork.url}/extended/v2/blocks/?limit=${limit}&offset=${offset}`;
      const response = await stacksAPIFetch(url);
      const data = await response.json();
      return data as GenericResponseType<NakamotoBlock>;
    },
    staleTime: options?.staleTime ?? TWO_MINUTES,
    gcTime: options?.gcTime,
    enabled: options?.enabled,
    refetchOnMount: options?.refetchOnMount,
    refetchOnReconnect: options?.refetchOnReconnect,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    getNextPageParam,
    initialPageParam: 0,
  });
};

export const useBlocksV2List = (
  limit = DEFAULT_LIST_LIMIT,
  options?: any
): UseQueryResult<GenericResponseType<NakamotoBlock>> => {
  const { apiClient, activeNetwork } = useGlobalContext();

  return useQuery({
    queryKey: getBlocksV2ListQueryKey(limit, activeNetwork.url),
    queryFn: async () => {
      const url = `${activeNetwork.url}/extended/v2/blocks/?limit=${limit}`;
      const response = await stacksAPIFetch(url);
      const data = await response.json();
      return data as GenericResponseType<NakamotoBlock>;
    },
    staleTime: TWO_MINUTES,
    ...options,
  });
};

export const useBlocksV2Paginated = (
  pageIndex: number,
  limit = DEFAULT_LIST_LIMIT,
  options?: any
): UseQueryResult<GenericResponseType<NakamotoBlock>> => {
  const { activeNetwork } = useGlobalContext();
  const offset = pageIndex * limit;

  return useQuery({
    queryKey: getBlocksV2PaginatedQueryKey(limit, offset, activeNetwork.url),
    queryFn: async function fetchBlocksV2Paginated() {
      const url = `${activeNetwork.url}/extended/v2/blocks/?limit=${limit}&offset=${offset}`;
      const response = await stacksAPIFetch(url);
      const data = await response.json();
      return data as GenericResponseType<NakamotoBlock>;
    },
    staleTime: TWO_MINUTES,
    ...options,
  });
};
