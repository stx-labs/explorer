import { TransactionType } from '@stacks/stacks-blockchain-api-types';

import { TransactionStatus } from '../../common/constants/constants';
import { TxStatus } from '../../common/types/tx';
import { MempoolTransactionSummary, TransactionSummary } from '../../common/types/tx-v3';
import { getContractName, microToStacksFormatted } from '../../common/utils/utils';

// v3 list endpoints only return confirmed, canonical txs, so the microblock/non-canonical
// states that getTransactionStatus handles can't occur here.
export function getV3TxStatus(status: TransactionSummary['status']): TxStatus {
  if (status === 'success') return TransactionStatus.SUCCESS_ANCHOR_BLOCK;
  return TransactionStatus.FAILED;
}

export function getV3TxTitle(tx: TransactionSummary): string {
  switch (tx.type) {
    case 'smart_contract':
      return getContractName(tx.smart_contract.contract_id);
    case 'contract_call':
      return tx.contract_call.function_name;
    case 'token_transfer':
      if (tx.block.height === 1) return 'Stacks 2.0 genesis transfer';
      return `Send ${microToStacksFormatted(tx.token_transfer.amount)} STX`;
    case 'coinbase':
      return `Block #${tx.block.height}`;
    case 'poison_microblock':
      return 'Poison microblock transaction';
    case 'tenure_change':
      return `Tenure ${tx.tenure_change.cause} (#${tx.block.height})`;
    default:
      return (tx as TransactionSummary).tx_id;
  }
}

export function getV3ToAddress(tx: TransactionSummary | MempoolTransactionSummary): string {
  switch (tx.type) {
    case 'token_transfer':
      return tx.token_transfer.recipient;
    case 'smart_contract':
      return tx.smart_contract.contract_id;
    case 'contract_call':
      return tx.contract_call.contract_id;
    default:
      return '';
  }
}

/**
 * Title for a mempool (pending) transaction summary. Mempool summaries carry no `block`, so unlike
 * {@link getV3TxTitle} the block-height-derived labels fall back to generic ones.
 */
export function getV3MempoolTxTitle(tx: MempoolTransactionSummary): string {
  switch (tx.type) {
    case 'smart_contract':
      return getContractName(tx.smart_contract.contract_id);
    case 'contract_call':
      return tx.contract_call.function_name;
    case 'token_transfer':
      return `Send ${microToStacksFormatted(tx.token_transfer.amount)} STX`;
    case 'coinbase':
      return 'Coinbase';
    case 'poison_microblock':
      return 'Poison microblock transaction';
    case 'tenure_change':
      return 'Tenure change';
    default:
      return (tx as MempoolTransactionSummary).tx_id;
  }
}

export const getTransactionTypeLabel = (value: TransactionType) => {
  switch (value) {
    case 'token_transfer':
      return 'Token transfer';
    case 'coinbase':
      return 'Coinbase';
    case 'contract_call':
      return 'Function call';
    case 'smart_contract':
      return 'Contract deploy';
    case 'poison_microblock':
      return 'Poison microblock';
    case 'tenure_change':
      return 'Tenure change';
  }
};

/**
 * Applies the type filter (the FilterButton selection) client-side: v3 list endpoints only take
 * `limit` + `cursor`, so filtering happens over the pages already fetched. No filter keeps every tx.
 * Pass `getType` for wrapped items (e.g. principal summaries, whose tx is under `transaction`).
 */
export function filterByType<T extends { type: string }>(txs: T[], types: string[]): T[];
export function filterByType<T>(items: T[], types: string[], getType: (item: T) => string): T[];
export function filterByType<T>(
  items: T[],
  types: string[],
  getType: (item: T) => string = item => (item as { type: string }).type
): T[] {
  return types.length === 0 ? items : items.filter(item => types.includes(getType(item)));
}

/** The tx types the FilterButton offers, i.e. the values accepted in the `transactionType` URL param. */
export const TX_TYPE_FILTER_VALUES = [
  'coinbase',
  'smart_contract',
  'contract_call',
  'tenure_change',
  'token_transfer',
] as const;

/**
 * Parses the comma-separated `transactionType` URL param into known filter values, ignoring unknown
 * ones. Returns undefined when the param is absent or has no known type.
 */
export function parseTransactionTypeParam(value: string | null | undefined): string[] | undefined {
  const types = (value ?? '')
    .split(',')
    .map(type => type.trim())
    .filter(type => (TX_TYPE_FILTER_VALUES as readonly string[]).includes(type));
  const unique = types.filter((type, index) => types.indexOf(type) === index);
  return unique.length > 0 ? unique : undefined;
}
