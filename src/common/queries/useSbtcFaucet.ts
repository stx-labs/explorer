import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../api/ApiError';
import { getErrorMessage } from '../../api/getErrorMessage';
import { useApiClient } from '../../api/useApiClient';
import { getAccountBalanceQueryKey } from './useAccountBalance';

const ENDPOINT = '/extended/v1/faucets/sbtc';

export function useSbtcFaucet() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['faucet', 'sbtc'],
    mutationFn: async ({ address }: { address: string }) => {
      const { data, error, response } = await apiClient.POST(ENDPOINT, {
        params: {
          query: {
            address,
          },
        },
        headers: { 'Content-Type': null },
      });

      if (error) {
        throw new ApiError({
          message: getErrorMessage(error),
          status: response?.status,
          endpoint: ENDPOINT,
          method: 'POST',
        });
      }
      return data;
    },
    onSuccess: (_data, { address }) => {
      void queryClient.invalidateQueries({ queryKey: getAccountBalanceQueryKey(address) });
      void queryClient.invalidateQueries({ queryKey: ['addressMempoolTxsInfinite', address] });
    },
  });
}
