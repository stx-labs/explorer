import { UseQueryResult, useQuery } from '@tanstack/react-query';

import { ClarityAbiFunction, ClarityValue, cvToHex } from '@stacks/transactions';

import { HIRO_HEADERS } from '../constants/env';
import { ReadOnlyResponse } from '../types/ReadOnlyResponse';
import { Network } from '../types/network';

interface ReadOnlyOptions {
  senderAddress: string;
  contractName: string;
  contractAddress: string;
  functionName: string;
  functionArgs: ClarityValue[];
  network: Network;
}

export const callReadOnlyFunction = async ({
  senderAddress,
  contractName,
  contractAddress,
  functionName,
  functionArgs,
  network,
}: ReadOnlyOptions): Promise<ReadOnlyResponse> => {
  const url = `${
    network.url
  }/v2/contracts/call-read/${contractAddress}/${contractName}/${encodeURIComponent(functionName)}`;

  const args = functionArgs.map(arg => cvToHex(arg));

  const body = JSON.stringify({
    sender: senderAddress,
    arguments: args,
  });

  const response = await fetch(url, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      ...HIRO_HEADERS,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
};

export function useCallReadOnlyFunction(
  {
    contractId,
    fn,
    readOnlyValue,
    stxAddress,
    stacksNetwork,
  }: {
    contractId: string;
    fn: ClarityAbiFunction;
    readOnlyValue: ClarityValue[];
    stxAddress?: string;
    stacksNetwork: Network;
  },
  options: any = {}
): UseQueryResult<ReadOnlyResponse> {
  return useQuery({
    queryKey: [
      'readonly',
      contractId,
      fn.name,
      readOnlyValue.map(cvToHex),
      ...(stxAddress ? [stxAddress] : []),
      stacksNetwork.networkId,
    ],
    queryFn: () =>
      callReadOnlyFunction({
        contractName: contractId.split('.')[1],
        contractAddress: contractId.split('.')[0],
        functionName: fn.name,
        functionArgs: readOnlyValue,
        network: stacksNetwork,
        senderAddress: stxAddress!,
      }),
    staleTime: 0,
    cacheTime: 0,
    enabled: !!stxAddress,
    ...options,
  });
}
