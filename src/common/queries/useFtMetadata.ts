import { FtMetadataResponse } from '@hirosystems/token-metadata-api-client/dist/api';
import {
  UseQueryOptions,
  UseQueryResult,
  UseSuspenseQueryResult,
  useQueries,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';

import { useMetadataApi } from '../api/useApi';

export function useFtMetadata(
  contractId?: string,
  options: any = {}
): UseQueryResult<FtMetadataResponse> {
  const tokenMetadataApi = useMetadataApi();
  return useQuery({
    queryKey: ['ft-metadata', contractId],
    queryFn: () => tokenMetadataApi?.getFtMetadata(contractId!),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: !!contractId,
    ...options,
  });
}

export function useSuspenseFtMetadata(
  contractId: string,
  options: any = {}
): UseSuspenseQueryResult<FtMetadataResponse> {
  const tokenMetadataApi = useMetadataApi();
  return useSuspenseQuery({
    queryKey: ['ft-metadata', contractId],
    queryFn: () => tokenMetadataApi?.getFtMetadata(contractId),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    ...options,
  });
}

const FT_METADATA_QUERY_KEY = 'ft-metadata';
export function getFTMetadataQueryKey(tokenId: string) {
  return [FT_METADATA_QUERY_KEY, tokenId];
}

export function useFungibleTokensMetadata(
  tokenIds: string[],
  options?: Omit<UseQueryOptions<FtMetadataResponse, Error>, 'queryKey' | 'queryFn'>
): {
  ftMetadata: (FtMetadataResponse | undefined)[];
  isLoading: boolean;
  isFetching: boolean;
  metadataErrors: unknown[];
} {
  const tokenMetadataApi = useMetadataApi();

  const ftMetadataQueries = useQueries({
    queries: tokenIds.map(
      (tokenId): UseQueryOptions<FtMetadataResponse, Error> => ({
        queryKey: getFTMetadataQueryKey(tokenId),
        queryFn: () => tokenMetadataApi?.getFtMetadata(tokenId),
        retry: false,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        enabled: !!tokenId,
        ...options,
      })
    ),
  });

  // Extract the data from each query result
  const ftMetadata = ftMetadataQueries.map(query => query.data);
  const isMetadataLoading = ftMetadataQueries.some(query => query.isLoading);
  const isMetadataFetching = ftMetadataQueries.some(query => query.isFetching);
  const metadataErrors = ftMetadataQueries.filter(query => query.error).map(query => query.error);

  return {
    ftMetadata,
    isLoading: isMetadataLoading,
    isFetching: isMetadataFetching,
    metadataErrors,
  };
}
