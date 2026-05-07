import { useQuery } from '@tanstack/react-query';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { THREE_MINUTES } from './query-stale-time';

export function useAccountStxBalance(principal: string) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['stx-balance', principal],
    queryFn: async () => {
      return await callApiWithErrorHandling(
        apiClient,
        '/extended/v2/addresses/{principal}/balances/stx',
        {
          params: { path: { principal } },
        }
      );
    },
    staleTime: THREE_MINUTES,
  });
}
