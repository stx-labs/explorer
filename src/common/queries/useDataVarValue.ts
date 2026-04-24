import { UseQueryResult, useQuery } from '@tanstack/react-query';

import { HIRO_HEADERS } from '../constants/env';
import { Network } from '../types/network';
import { validateStacksContractId } from '../utils/utils';

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

const MAX_VAR_NAME_LENGTH = 128;
const MAX_ERROR_BYTES = 2048;
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export const sanitizeErrorBody = (body: string): string => {
  const truncated = body.length > MAX_ERROR_BYTES ? `${body.slice(0, MAX_ERROR_BYTES)}…` : body;
  return truncated.replace(CONTROL_CHARS, '');
};

export const fetchDataVarValue = async ({
  contractAddress,
  contractName,
  varName,
  network,
}: DataVarOptions): Promise<DataVarResponse> => {
  if (varName.length > MAX_VAR_NAME_LENGTH) {
    throw new Error(`Variable name exceeds maximum length of ${MAX_VAR_NAME_LENGTH}`);
  }
  const url = `${network.url}/v2/data_var/${encodeURIComponent(
    contractAddress
  )}/${encodeURIComponent(contractName)}/${encodeURIComponent(varName)}?proof=0`;

  const response = await fetch(url, {
    headers: {
      ...HIRO_HEADERS,
    },
  });

  if (!response.ok) {
    const text = sanitizeErrorBody(await response.text());
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
  const isValid = validateStacksContractId(contractId);
  const [contractAddress = '', contractName = ''] = isValid ? contractId.split('.') : [];

  return useQuery({
    queryKey: ['dataVar', contractId, varName, network.networkId],
    queryFn: () =>
      fetchDataVarValue({
        contractAddress,
        contractName,
        varName,
        network,
      }),
    enabled: enabled && isValid,
    staleTime: 0,
  });
}
