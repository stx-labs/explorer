import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

import { Block } from '@stacks/stacks-blockchain-api-types';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';

const BLOCK_QUERY_KEY = 'block';

export function useBlockByHeightOrHash(heightOrHash?: string, options: any = {}) {
  const apiClient = useApiClient();
  return useQuery<Block>({
    queryKey: ['blockByHeightOrHash', heightOrHash],
    queryFn: async () => {
      if (!heightOrHash) return undefined;
      return (await callApiWithErrorHandling(apiClient, '/extended/v2/blocks/{height_or_hash}', {
        params: { path: { height_or_hash: heightOrHash } },
      })) as unknown as Block;
    },
    staleTime: Infinity,
    enabled: !!heightOrHash,
    ...options,
  });
}

// TODO: deprecate
export function useBlockByHash(hash?: string, options: any = {}) {
  const apiClient = useApiClient();
  return useQuery<Block>({
    queryKey: ['blockByHash', hash],
    queryFn: async () => {
      if (!hash) return undefined;
      return (await callApiWithErrorHandling(apiClient, '/extended/v2/blocks/{height_or_hash}', {
        params: { path: { height_or_hash: hash } },
      })) as unknown as Block;
    },
    staleTime: Infinity,
    enabled: !!hash,
    ...options,
  });
}

export function useSuspenseBlockByHeightOrHash(heightOrHash: string) {
  const apiClient = useApiClient();
  if (!heightOrHash) throw new Error('Height or hash is required');
  return useSuspenseQuery({
    queryKey: [BLOCK_QUERY_KEY, heightOrHash],
    queryFn: async () => {
      if (!heightOrHash) return undefined;
      return await callApiWithErrorHandling(apiClient, '/extended/v2/blocks/{height_or_hash}', {
        params: { path: { height_or_hash: heightOrHash } },
      });
    },
    staleTime: Infinity,
    refetchOnWindowFocus: true, // keep block up to date when user switches back to tab
  });
}
