import { UseQueryOptions, useQuery } from '@tanstack/react-query';

import type { operations } from '@stacks/token-metadata-api-client/lib/generated/schema';

import { useMetadataApi } from '../api/useApi';

type NftMetadataResponse =
  operations['getNftMetadata']['responses']['200']['content']['application/json'];

export type { NftMetadataResponse };

const NFT_METADATA_QUERY_KEY = 'nft-metadata';
export const getNftMetadataQueryKey = (contractId: string, tokenId: string) => {
  return [NFT_METADATA_QUERY_KEY, contractId, tokenId];
};

export const useNftMetadata = (
  { contractId, tokenId }: { contractId?: string; tokenId?: string },
  options: Omit<UseQueryOptions<any, any, NftMetadataResponse, any>, 'queryKey' | 'queryFn'> = {}
) => {
  const client = useMetadataApi();
  return useQuery({
    queryKey: getNftMetadataQueryKey(contractId!, tokenId!),
    queryFn: async () => {
      const { data, error } = await client.GET('/metadata/v1/nft/{principal}/{token_id}', {
        params: { path: { principal: contractId!, token_id: parseInt(tokenId!) } },
      });
      if (error) throw new Error('Failed to fetch NFT metadata');
      return data;
    },
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: !!contractId && tokenId !== undefined && tokenId !== null,
    ...options,
  });
};
