import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

import { AddressBalanceResponse } from '@stacks/stacks-blockchain-api-types';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { getApiClient } from '../../api/getApiClient';
import { useApiClient } from '../../api/useApiClient';
import { logError } from '../utils/error-utils';
import { FT_BALANCES_PAGE_SIZE, fetchAllFtBalances } from '../utils/ft-balances';
import { ONE_MINUTE } from './query-stale-time';

const ACCOUNT_BALANCE_QUERY_KEY = 'accountBalance';
export const getAccountBalanceQueryKey = (address?: string) => [ACCOUNT_BALANCE_QUERY_KEY, address];

async function fetchAddressBalances(
  apiClient: ReturnType<typeof getApiClient>,
  principal: string
): Promise<AddressBalanceResponse> {
  const [stx, fungibleTokens] = await Promise.all([
    callApiWithErrorHandling(apiClient, '/extended/v2/addresses/{principal}/balances/stx', {
      params: { path: { principal } },
    }),
    fetchAllFtBalances(
      offset =>
        callApiWithErrorHandling(apiClient, '/extended/v2/addresses/{principal}/balances/ft', {
          params: { path: { principal }, query: { limit: FT_BALANCES_PAGE_SIZE, offset } },
        }),
      {
        onPageError: (error, offset) => {
          logError(
            error instanceof Error ? error : new Error(String(error)),
            'fetchAllFtBalances:page',
            { principal, offset },
            'warning'
          );
        },
      }
    ),
  ]);

  return {
    stx: {
      balance: stx.balance,
      total_sent: stx.total_sent ?? '0',
      total_received: stx.total_received ?? '0',
      total_fees_sent: stx.total_fees_sent ?? '0',
      total_miner_rewards_received: stx.total_miner_rewards_received,
      lock_tx_id: stx.lock_tx_id,
      locked: stx.locked,
      lock_height: stx.lock_height,
      burnchain_lock_height: stx.burnchain_lock_height,
      burnchain_unlock_height: stx.burnchain_unlock_height,
    },
    fungible_tokens: fungibleTokens,
    non_fungible_tokens: {},
  };
}

export function useAccountBalance(address?: string, options: any = {}) {
  const apiClient = useApiClient();
  return useQuery<AddressBalanceResponse | undefined>({
    queryKey: [ACCOUNT_BALANCE_QUERY_KEY, address],
    queryFn: async () => {
      if (!address) return undefined;
      return await fetchAddressBalances(apiClient, address);
    },
    staleTime: ONE_MINUTE,
    enabled: !!address,
    ...options,
  });
}

export function useSuspenseAccountBalance(address?: string) {
  const apiClient = useApiClient();
  if (!address) throw new Error('Address is required');
  return useSuspenseQuery<AddressBalanceResponse>({
    queryKey: [ACCOUNT_BALANCE_QUERY_KEY, address],
    queryFn: async () => {
      return await fetchAddressBalances(apiClient, address);
    },
    staleTime: ONE_MINUTE,
    refetchOnWindowFocus: true, // keep account balance up to date when user switches back to tab
  });
}
