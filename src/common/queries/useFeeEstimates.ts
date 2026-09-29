import { useQuery } from '@tanstack/react-query';

import { useGlobalContext } from '../context/useGlobalContext';
import { fetchSampleTxsFeeEstimate } from '../utils/fee-utils';
import { TWO_MINUTES } from './query-stale-time';

export function useFeeEstimates() {
  const { activeNetwork } = useGlobalContext();

  return useQuery({
    queryKey: ['feeEstimates', activeNetwork.mode, activeNetwork.url],
    queryFn: async () => {
      return await fetchSampleTxsFeeEstimate(
        activeNetwork.mode as 'mainnet' | 'testnet',
        activeNetwork.url
      );
    },
    staleTime: TWO_MINUTES,
    enabled: !!activeNetwork.url,
  });
}
