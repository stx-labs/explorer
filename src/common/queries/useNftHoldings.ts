import { UseQueryResult, useQuery } from '@tanstack/react-query';

import { NonFungibleTokenHoldingsList } from '@stacks/stacks-blockchain-api-types';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { ONE_MINUTE } from './query-stale-time';

const MAX_LIMIT = 200;

export const NFT_HOLDINGS_QUERY_KEY = 'nftHoldings';

export function getNftHoldingsQueryKey(address: string, limit: number, offset: number) {
  return [NFT_HOLDINGS_QUERY_KEY, address, limit, offset];
}

export const useNftHoldings = (
  address?: string,
  limit = MAX_LIMIT,
  offset = 0,
  options: {
    tx_metadata?: boolean;
  } = {}
): UseQueryResult<NonFungibleTokenHoldingsList> => {
  const apiClient = useApiClient();
  if (!address) throw new Error('Address is required');
  return useQuery({
    queryKey: getNftHoldingsQueryKey(address, limit, offset),
    queryFn: async () => {
      if (!address) return undefined;
      return await callApiWithErrorHandling(apiClient, '/extended/v1/tokens/nft/holdings', {
        params: {
          query: { principal: address, limit, offset, tx_metadata: options.tx_metadata || false },
        },
      });
    },
    staleTime: ONE_MINUTE,
    enabled: !!address,
    ...options,
  });
};
