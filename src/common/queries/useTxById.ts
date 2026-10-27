import { TxDetails } from '@/common/types/tx-v3';
import { TX_DETAILS_INCLUDE } from '@/common/utils/tx-details-utils';
import { UseQueryResult, useQuery } from '@tanstack/react-query';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { useGlobalContext } from '../context/useGlobalContext';

export function useTxById(txId?: string, options: any = {}): UseQueryResult<TxDetails> {
  const apiClient = useApiClient();
  const { activeNetwork } = useGlobalContext();

  return useQuery({
    // Keyed by API too: the same transaction can differ between APIs (e.g. `?api=` overrides).
    queryKey: ['txById', activeNetwork.url, txId],
    queryFn: async () => {
      if (!txId) return undefined;

      return await callApiWithErrorHandling(apiClient, '/extended/v3/transactions/{tx_id}', {
        params: {
          path: { tx_id: txId },
          query: { include: [...TX_DETAILS_INCLUDE] },
        },
      });
    },
    staleTime: Infinity,
    enabled: !!txId,
    ...options,
  });
}
