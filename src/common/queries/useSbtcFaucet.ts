import { useMutation } from '@tanstack/react-query';

import { getErrorMessage } from '../../api/getErrorMessage';
import { useApiClient } from '../../api/useApiClient';

export function useSbtcFaucet() {
  const apiClient = useApiClient();
  return useMutation({
    mutationFn: async ({ address }: { address: string }) => {
      if (!address) return undefined;
      const { data, error } = await apiClient.POST(`/extended/v1/faucets/sbtc`, {
        params: {
          query: {
            address,
          },
        },
        // The endpoint takes no body, so don't advertise a JSON one it would fail to parse
        headers: { 'Content-Type': null },
      });

      if (error) {
        throw new Error(getErrorMessage(error));
      }
      return data;
    },
  });
}
