import { stacksAPIFetch } from '@/api/stacksAPIFetch';

import {
  MempoolTransaction,
  SmartContract,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

export const getTxTag = (txId: string) => `tx-id-${txId}`;
export const getContractTag = (contractId: string) => `contract-id-${contractId}`;

const CONFIRMED_TX_REVALIDATION_TIMEOUT_IN_SECONDS = 3; // 3 seconds
const CONFIRMED_CONTRACT_REVALIDATION_TIMEOUT_IN_SECONDS = 3; // 3 seconds

export async function fetchTxById(
  apiUrl: string,
  txId: string
): Promise<Transaction | MempoolTransaction> {
  const response = await stacksAPIFetch(`${apiUrl}/extended/v1/tx/${txId}`, {
    cache: 'default',
    next: {
      revalidate: CONFIRMED_TX_REVALIDATION_TIMEOUT_IN_SECONDS,
      tags: [getTxTag(txId)],
    },
  });

  const tx: Transaction | MempoolTransaction = await response.json();
  return tx;
}

export async function fetchContractById(
  apiUrl: string,
  contractId: string
): Promise<SmartContract> {
  const response = await stacksAPIFetch(`${apiUrl}/extended/v1/contract/${contractId}`, {
    cache: 'default',
    next: {
      revalidate: CONFIRMED_CONTRACT_REVALIDATION_TIMEOUT_IN_SECONDS,
      tags: [getContractTag(contractId)],
    },
  });

  const contract: SmartContract = await response.json();
  return contract;
}
