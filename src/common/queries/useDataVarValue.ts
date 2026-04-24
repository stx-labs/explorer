import { UseQueryResult, useQuery } from '@tanstack/react-query';

import { HIRO_HEADERS } from '../constants/env';
import { Network } from '../types/network';

export interface DataVarResponse {
  data: string;
  proof?: string;
}

interface DataVarOptions {
  contractAddress: string;
  contractName: string;
  varName: string;
  network: Network;
}

export const fetchDataVarValue = async ({
  contractAddress,
  contractName,
  varName,
  network,
}: DataVarOptions): Promise<DataVarResponse> => {
  const url = `${network.url}/v2/data_var/${contractAddress}/${contractName}/${encodeURIComponent(
    varName
  )}?proof=0`;

  const response = await fetch(url, {
    headers: {
      ...HIRO_HEADERS,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
};

export function useDataVarValue({
  contractId,
  varName,
  network,
  enabled,
}: {
  contractId: string;
  varName: string;
  network: Network;
  enabled: boolean;
}): UseQueryResult<DataVarResponse> {
  const [contractAddress, contractName] = contractId.split('.');

  return useQuery({
    queryKey: ['dataVar', contractId, varName, network.networkId],
    queryFn: () =>
      fetchDataVarValue({
        contractAddress,
        contractName,
        varName,
        network,
      }),
    enabled,
    staleTime: 0,
  });
}
