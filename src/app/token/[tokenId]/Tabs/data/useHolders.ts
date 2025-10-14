import { callApiWithErrorHandling } from '@/api/callApiWithErrorHandling';
import { useApiClient } from '@/api/useApiClient';
import { useQuery, useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { UseQueryResult } from '@tanstack/react-query';

import { FungibleTokenHolderList } from '@stacks/stacks-blockchain-api-types';

import { useGlobalContext } from '../../../../../common/context/useGlobalContext';
import { GenericResponseType } from '../../../../../common/hooks/useInfiniteQueryResult';
import { TEN_MINUTES } from '../../../../../common/queries/query-stale-time';
import { getNextPageParam } from '../../../../../common/utils/utils';

export interface HolderInfo {
  address: string;
  balance: string;
}

export interface HolderResponseType extends GenericResponseType<HolderInfo> {
  total_supply: string;
}

const DEFAULT_HOLDER_LIMIT = 20;
const HOLDERS_QUERY_KEY = 'holders';

export function getHoldersQueryKey(assetId: string, limit: number, offset: number) {
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
    queryKey: [HOLDERS_QUERY_KEY, assetId],
    queryFn: async () => {
      if (!assetId) return undefined;
      return await callApiWithErrorHandling(
        apiClient,
        `/extended/v1/tokens/ft/${assetId}/holders`,
        {
          params: {
            path: { assetId },
            query: {
              limit,
              offset,
            },
          },
        }
      );
    },
    enabled: !!assetId,
    ...options,
  });
}

const fetchHolders = async (
  apiUrl: string,
  tokenId: string,
  pageParam: number,
  options: any
): Promise<HolderResponseType> => {
  const limit = options.limit || DEFAULT_HOLDER_LIMIT;
  const offset = pageParam || 0;
  const queryString = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  }).toString();
  const response = await fetch(
    `${apiUrl}/extended/v1/tokens/ft/${tokenId}/holders${queryString ? `?${queryString}` : ''}`
  );
  return response.json();
};

export function useSuspenseFtHolders(fullyQualifiedTokenId: string, options: any = {}) {
  const { url: activeNetworkUrl } = useGlobalContext().activeNetwork;

  return useSuspenseInfiniteQuery<HolderResponseType>({
    queryKey: [HOLDERS_QUERY_KEY, fullyQualifiedTokenId],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchHolders(activeNetworkUrl, fullyQualifiedTokenId, pageParam, options),
    getNextPageParam,
    initialPageParam: 0,
    staleTime: TEN_MINUTES,
    enabled: !!fullyQualifiedTokenId,
    ...options,
  });
}

export function useSuspenseStxHolders(options: any = {}) {
  const { url: activeNetworkUrl } = useGlobalContext().activeNetwork;

  return useSuspenseInfiniteQuery<HolderResponseType>({
    queryKey: [HOLDERS_QUERY_KEY, 'stx'],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchHolders(activeNetworkUrl, 'stx', pageParam, options),
    getNextPageParam,
    initialPageParam: 0,
    staleTime: TEN_MINUTES,
    ...options,
  });
}
