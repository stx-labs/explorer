import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../api/ApiError';
import { getErrorMessage } from '../../api/getErrorMessage';
import { useApiClient } from '../../api/useApiClient';
import { getAccountBalanceQueryKey } from './useAccountBalance';

const ENDPOINT = '/extended/v1/faucets/stx';

export function useFaucet() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['faucet', 'stx'],
    mutationFn: async ({ address, stacking }: { address: string; stacking?: boolean }) => {
      const { data, error, response } = await apiClient.POST(ENDPOINT, {
        params: {
          query: {
            address,
            stacking,
          },
        },
        body: {
          // @ts-expect-error
          content: 'application/json',
        },
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
