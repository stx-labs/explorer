import { NftMetadataResponse } from '@hirosystems/token-metadata-api-client';
import { UseQueryOptions, useQueries, useQuery } from '@tanstack/react-query';

import { useMetadataApi } from '../api/useApi';

const NFT_METADATA_QUERY_KEY = 'nft-metadata';
export const getNftMetadataQueryKey = (contractId: string, tokenId: string) => {
  return [NFT_METADATA_QUERY_KEY, contractId, tokenId];
};

export const useNftMetadata = (
  { contractId, tokenId }: { contractId?: string; tokenId?: string },
  options: Omit<UseQueryOptions<any, any, NftMetadataResponse, any>, 'queryKey' | 'queryFn'> = {}
) => {
  const tokenMetadataApi = useMetadataApi();
  return useQuery({
    queryKey: getNftMetadataQueryKey(contractId!, tokenId!),
    queryFn: () => tokenMetadataApi?.getNftMetadata(contractId!, parseInt(tokenId!)),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: !!contractId && tokenId !== undefined && tokenId !== null,
    ...options,
  });
};

export function useNftsMetadata(
  tokenIds: string[],
  contractId: string,
  options?: Omit<UseQueryOptions<NftMetadataResponse, Error>, 'queryKey' | 'queryFn'>
): {
  data: (NftMetadataResponse | undefined)[];
  isLoading: boolean;
  isFetching: boolean;
  metadataErrors: unknown[];
} {
  const tokenMetadataApi = useMetadataApi();

  const nftMetadataQueries = useQueries({
    queries: tokenIds.map(
      (tokenId): UseQueryOptions<NftMetadataResponse, Error> => ({
        queryKey: getNftMetadataQueryKey(contractId, tokenId),
        queryFn: () => tokenMetadataApi?.getNftMetadata(contractId, parseInt(tokenId)),
        retry: false,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        enabled: !!tokenId,
        ...options,
      })
    ),
  });

  // Extract the data from each query result
  const nftMetadata = nftMetadataQueries.map(query => query.data);
  const isMetadataLoading = nftMetadataQueries.some(query => query.isLoading);
  const isMetadataFetching = nftMetadataQueries.some(query => query.isFetching);
  const metadataErrors = nftMetadataQueries.filter(query => query.error).map(query => query.error);

  return {
    data: nftMetadata,
    isLoading: isMetadataLoading,
    isFetching: isMetadataFetching,
    metadataErrors,
  };
}
