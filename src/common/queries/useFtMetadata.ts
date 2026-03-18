import {
  UseQueryResult,
  UseSuspenseQueryResult,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';

import type { operations } from '@stacks/token-metadata-api-client/lib/generated/schema';

import { useMetadataApi } from '../api/useApi';
import { useBulkFtMetadata } from './useBulkTokenMetadata';

type FtMetadataResponse =
  operations['getFtMetadata']['responses']['200']['content']['application/json'];

export type { FtMetadataResponse };

export function useFtMetadata(
  contractId?: string,
  options: any = {}
): UseQueryResult<FtMetadataResponse> {
  const client = useMetadataApi();
  return useQuery({
    queryKey: ['ft-metadata', contractId],
    queryFn: async () => {
      const { data, error } = await client.GET('/metadata/v1/ft/{principal}', {
        params: { path: { principal: contractId! } },
      });
      if (error) throw new Error('Failed to fetch FT metadata');
      return data;
    },
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
  const client = useMetadataApi();
  return useSuspenseQuery({
    queryKey: ['ft-metadata', contractId],
    queryFn: async () => {
      const { data, error } = await client.GET('/metadata/v1/ft/{principal}', {
        params: { path: { principal: contractId } },
      });
      if (error) throw new Error('Failed to fetch FT metadata');
      return data;
    },
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Fetches metadata for multiple FT tokens in a single bulk request
 * and returns the results mapped by token ID for easy lookup.
 */
export function useFungibleTokensMetadata(tokenIds: string[]): {
  ftMetadata: (FtMetadataResponse | undefined)[];
  isLoading: boolean;
  isFetching: boolean;
} {
  const { metadataMap, isLoading, isFetching } = useBulkFtMetadata(tokenIds);

  const ftMetadata = tokenIds.map(tokenId => metadataMap.get(tokenId));

  return {
    ftMetadata,
    isLoading,
    isFetching,
  };
}
