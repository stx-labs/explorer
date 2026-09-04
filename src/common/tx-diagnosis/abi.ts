import type { ContractInterfaceResponse } from '@stacks/stacks-blockchain-api-types';

/** Accept the API's string ABI as well as already-parsed values, and degrade on malformed JSON. */
export function parseContractAbi(abi: unknown): ContractInterfaceResponse | undefined {
  if (typeof abi !== 'string') return (abi ?? undefined) as ContractInterfaceResponse | undefined;
  try {
    return JSON.parse(abi) as ContractInterfaceResponse;
  } catch {
    return undefined;
  }
}
