import { callApiWithErrorHandling } from '@/api/callApiWithErrorHandling';
import { useApiClient } from '@/api/useApiClient';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { TEN_MINUTES } from '@/common/queries/query-stale-time';
import { getNextPageParam } from '@/common/utils/utils';
import {
  InfiniteData,
  UseQueryResult,
  UseSuspenseInfiniteQueryResult,
  useQuery,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';

import { FungibleTokenHolderList } from '@stacks/stacks-blockchain-api-types';

const DEFAULT_HOLDER_LIMIT = 20;
const HOLDERS_QUERY_KEY = 'holders';

export function getHoldersQueryKey(assetId: string, limit?: number, offset?: number) {
  return [HOLDERS_QUERY_KEY, assetId, limit, offset];
}

export function useHolders(
  assetId: string,
  limit = DEFAULT_HOLDER_LIMIT,
  offset = 0,
  options: any = {}
): UseQueryResult<FungibleTokenHolderList> {
  const apiClient = useApiClient();

  return useQuery<FungibleTokenHolderList>({
    queryKey: getHoldersQueryKey(assetId, limit, offset),
    queryFn: async () => {
      if (!assetId) return undefined;
      return await callApiWithErrorHandling(apiClient, `/extended/v1/tokens/ft/{token}/holders`, {
        params: {
          path: { token: assetId },
          query: {
            limit,
            offset,
          },
        },
      });
    },
    enabled: !!assetId,
    ...options,
  });
}

export function useSuspenseFtHolders(
  assetId: string,
  options: any = {}
): UseSuspenseInfiniteQueryResult<InfiniteData<FungibleTokenHolderList>> {
  const apiClient = useApiClient();

  return useSuspenseInfiniteQuery({
    queryKey: [HOLDERS_QUERY_KEY, assetId],
    queryFn: ({ pageParam }: { pageParam: number }) => {
      const limit = options.limit || DEFAULT_HOLDER_LIMIT;
      const offset = pageParam;
      return callApiWithErrorHandling(apiClient, `/extended/v1/tokens/ft/{token}/holders`, {
        params: {
          path: { token: assetId },
          query: {
            limit,
            offset,
          },
        },
      });
    },
    getNextPageParam,
    initialPageParam: 0,
    staleTime: TEN_MINUTES,
    enabled: !!assetId,
    ...options,
  });
}
