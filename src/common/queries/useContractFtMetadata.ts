import { useQuery } from '@tanstack/react-query';

import { useMetadataApi } from '../api/useApi';

export function useContractFtMetadata(contractId?: string) {
  const client = useMetadataApi();
  return useQuery({
    queryKey: ['contract-ft-metadata', contractId],
    queryFn: async () => {
      const { data, error } = await client.GET('/metadata/v1/ft/{principal}', {
        params: { path: { principal: contractId! } },
      });
      if (error) throw new Error('Failed to fetch contract FT metadata');
      return data;
    },
    enabled: !!contractId,
  });
}
