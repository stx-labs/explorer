import type { SmartContract } from '@stacks/stacks-blockchain-api-types';

/** Reject API error payloads before they enter the transaction page's contract-data context. */
export function asInitialContractData(value: unknown): SmartContract | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as { source_code?: unknown }).source_code !== 'string'
  ) {
    return undefined;
  }
  return value as SmartContract;
}
