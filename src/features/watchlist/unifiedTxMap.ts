import { getToAddress } from '@/common/utils/transaction-utils';

import {
  AddressTransaction,
  MempoolTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import type { UnifiedTransaction, UnifiedTxType } from './types';

type TxTimeFields = {
  block_time?: number;
  burn_block_time?: number;
  parent_burn_block_time?: number;
  receipt_time?: number;
};

export function getTxUnixSeconds(tx: Transaction | MempoolTransaction): number | null {
  const t = tx as unknown as TxTimeFields;
  if (t.block_time != null && t.block_time !== -1) {
    return t.block_time;
  }
  if (t.burn_block_time != null && t.burn_block_time !== -1) {
    return t.burn_block_time;
  }
  if (t.burn_block_time === -1 && t.parent_burn_block_time != null) {
    return t.parent_burn_block_time;
  }
  if (t.receipt_time != null) {
    return t.receipt_time;
  }
  return null;
}

function mapTxType(tx: Transaction | MempoolTransaction): UnifiedTxType {
  switch (tx.tx_type) {
    case 'token_transfer':
      return 'transfer';
    case 'contract_call':
      return 'contract_call';
    default:
      return 'token_transfer';
  }
}

/** v2 address-tx list wraps `tx` with per-address STX totals — use for unified `token_transfer` bucket. */
export function unwrapAddressTransactionRow(
  row: AddressTransaction | Transaction | MempoolTransaction
): {
  tx: Transaction | MempoolTransaction;
  v2Totals?: { stx_sent: string; stx_received: string };
} {
  if (row && typeof row === 'object' && 'tx' in row) {
    const at = row as AddressTransaction;
    if (at.tx) {
      return {
        tx: at.tx,
        v2Totals: { stx_sent: at.stx_sent, stx_received: at.stx_received },
      };
    }
  }
  return { tx: row as Transaction | MempoolTransaction };
}

export function transactionToUnified(
  tx: Transaction | MempoolTransaction,
  watchPrincipal: string,
  v2Totals?: { stx_sent: string; stx_received: string }
): UnifiedTransaction {
  const timestamp = getTxUnixSeconds(tx) ?? 0;
  const from = tx.sender_address || '';
  const to = getToAddress(tx) || '';
  const direction: 'in' | 'out' = from === watchPrincipal ? 'out' : 'in';

  const type = mapTxType(tx);

  let amount = '0';
  if (tx.tx_type === 'token_transfer' && 'token_transfer' in tx && tx.token_transfer) {
    amount = tx.token_transfer.amount ?? '0';
  } else if (type === 'token_transfer' && v2Totals) {
    amount = direction === 'in' ? (v2Totals.stx_received ?? '0') : (v2Totals.stx_sent ?? '0');
  }

  return {
    txId: tx.tx_id,
    type,
    direction,
    amount,
    token: 'STX',
    from,
    to,
    timestamp,
    principal: watchPrincipal,
  };
}
