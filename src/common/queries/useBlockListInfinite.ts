import {
  UseQueryResult,
  useInfiniteQuery,
  useQuery,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';

import { OperationResponse } from '@stacks/blockchain-api-client';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { DEFAULT_LIST_LIMIT } from '../constants/constants';
import { getNextPageParam } from '../utils/utils';
import { TWO_MINUTES } from './query-stale-time';

export const BLOCK_LIST_QUERY_KEY = 'blockListInfinite';

type BlocksResponse = OperationResponse['/extended/v2/blocks/'];

export const useSuspenseBlockListInfinite = (limit = DEFAULT_LIST_LIMIT) => {
  const apiClient = useApiClient();
  return useSuspenseInfiniteQuery({
    queryKey: [BLOCK_LIST_QUERY_KEY, limit],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await callApiWithErrorHandling(apiClient, '/extended/v2/blocks/', {
        params: { query: { limit, offset: pageParam || 0 } },
      });
    },
    staleTime: TWO_MINUTES,
    getNextPageParam,
    initialPageParam: 0,
  });
};

export const useBlockListInfinite = (
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
  const apiClient = useApiClient();
  return useInfiniteQuery({
    queryKey: [BLOCK_LIST_QUERY_KEY, limit],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await callApiWithErrorHandling(apiClient, '/extended/v2/blocks/', {
        params: { query: { limit, offset: pageParam || 0 } },
      });
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

export const useBlockList = (
  limit = DEFAULT_LIST_LIMIT,
  options?: any
): UseQueryResult<BlocksResponse> => {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: [BLOCK_LIST_QUERY_KEY, limit],
    queryFn: async () => {
      return await callApiWithErrorHandling(apiClient, '/extended/v2/blocks/', {
        params: { query: { limit } },
      });
    },
    staleTime: TWO_MINUTES,
    ...options,
  });
};
