import { UseQueryResult, useQuery } from '@tanstack/react-query';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { PrincipalNftBalanceListResponse } from '../types/tokens-v3';
import { ONE_MINUTE } from './query-stale-time';

const DEFAULT_NFT_HOLDINGS_LIMIT = 50;

export const NFT_HOLDINGS_QUERY_KEY = 'nftHoldings';

export function getNftHoldingsQueryKey(principal: string, limit: number, cursor?: string) {
  return [NFT_HOLDINGS_QUERY_KEY, principal, limit, cursor];
}

/**
 * NFT instances currently owned by a principal, ordered by asset identifier and value.
 * Cursor-paginated: pass the previous page's `cursor.next` to get the following page.
 */
export function useNftHoldings(
  principal: string,
  limit = DEFAULT_NFT_HOLDINGS_LIMIT,
  cursor?: string,
  options: any = {}
): UseQueryResult<PrincipalNftBalanceListResponse> {
  const apiClient = useApiClient();
  return useQuery<PrincipalNftBalanceListResponse>({
    queryKey: getNftHoldingsQueryKey(principal, limit, cursor),
    queryFn: async () =>
      await callApiWithErrorHandling(
        apiClient,
        '/extended/v3/principals/{principal}/balances/nft',
        { params: { path: { principal }, query: { limit, ...(cursor && { cursor }) } } }
      ),
    staleTime: ONE_MINUTE,
    enabled: !!principal,
    ...options,
  });
}
