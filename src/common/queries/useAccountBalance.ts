import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

import { AddressBalanceResponse } from '@stacks/stacks-blockchain-api-types';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { ONE_MINUTE } from './query-stale-time';

const ACCOUNT_BALANCE_QUERY_KEY = 'accountBalance';
export const getAccountBalanceQueryKey = (address?: string) => [ACCOUNT_BALANCE_QUERY_KEY, address];

export function useAccountBalance(address?: string, options: any = {}) {
  const apiClient = useApiClient();
  return useQuery<AddressBalanceResponse | undefined>({
    queryKey: [ACCOUNT_BALANCE_QUERY_KEY, address],
    queryFn: async () => {
      if (!address) return undefined;
      return (await callApiWithErrorHandling(
        apiClient,
        '/extended/v1/address/{principal}/balances',
        {
          params: { path: { principal: address } },
        }
      )) as AddressBalanceResponse;
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
      return (await callApiWithErrorHandling(
        apiClient,
        '/extended/v1/address/{principal}/balances',
        {
          params: { path: { principal: address } },
        }
      )) as AddressBalanceResponse;
    },
    staleTime: ONE_MINUTE,
    refetchOnWindowFocus: true, // keep account balance up to date when user switches back to tab
  });
}
