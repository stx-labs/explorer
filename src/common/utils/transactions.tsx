'use client';

// use client is required due to the use of Phosphor icons
import ClarityIcon from '@/ui/icons/ClarityIcon';
import TransferIcon from '@/ui/icons/TransferIcon';
import { ArrowsClockwise, Clock, Cube, PhoneCall, Question, XCircle } from '@phosphor-icons/react';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr';

import {
  CoinbaseTransaction,
  MempoolCoinbaseTransaction,
  MempoolTenureChangeTransaction,
  MempoolTransaction,
  TenureChangeTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import { TransactionStatus } from '../constants/constants';
import { getContractName, getFunctionName, microToStacksFormatted } from './utils';

export function getTransactionStatus(tx: Transaction | MempoolTransaction) {
  if (tx?.tx_status === 'success' && (tx.is_unanchored || tx?.block_hash === '0x')) {
    return TransactionStatus.SUCCESS_MICROBLOCK;
  } else if (tx?.tx_status === 'success' && !tx.is_unanchored) {
    if (!tx.canonical || !tx.microblock_canonical) {
      return TransactionStatus.NON_CANONICAL;
    } else {
      return TransactionStatus.SUCCESS_ANCHOR_BLOCK;
    }
  } else if (tx?.tx_status === 'abort_by_response' || tx?.tx_status === 'abort_by_post_condition') {
    return TransactionStatus.FAILED;
  } else if (tx?.tx_status.startsWith('dropped_')) {
    return TransactionStatus.DROPPED;
  }
  return TransactionStatus.PENDING;
}

export function getTxTypeIcon(txType: string, isBold?: boolean) {
  switch (txType) {
    case 'token_transfer':
      return <TransferIcon {...(isBold ? { weight: 'bold' } : {})} />;
    case 'contract_call':
      return <PhoneCall {...(isBold ? { weight: 'bold' } : {})} />;
    case 'smart_contract':
      return <ClarityIcon {...(isBold ? { weight: 'bold' } : {})} />;
    case 'tenure_change':
      return <ArrowsClockwise {...(isBold ? { weight: 'bold' } : {})} />;
    case 'coinbase':
      return <Cube {...(isBold ? { weight: 'bold' } : {})} />;
    default:
      return <Question {...(isBold ? { weight: 'bold' } : {})} />;
  }
}

export function getTxTypeLabel(txType: string) {
  switch (txType) {
    case 'token_transfer':
      return 'Token transfer';
    case 'contract_call':
      return 'Contract call';
    case 'smart_contract':
      return 'Contract deploy';
    case 'tenure_change':
      return 'Tenure change';
    case 'coinbase':
      return 'Coinbase';
    default:
      return 'Unknown';
  }
}

export function getTxTypeColor(txType: string) {
  switch (txType) {
    case 'token_transfer':
      return 'var(--stacks-colors-transaction-types-token-transfer)';
    case 'contract_call':
      return 'var(--stacks-colors-transaction-types-contract-call)';
    case 'smart_contract':
      return 'var(--stacks-colors-transaction-types-contract-deploy)';
    case 'tenure_change':
      return 'var(--stacks-colors-transaction-types-tenure-change)';
    case 'coinbase':
      return 'var(--stacks-colors-transaction-types-coinbase)';
    default:
      return 'var(--stacks-colors-transaction-types-token-transfer)';
  }
}

export function getTxStatusIcon(tx: Transaction | MempoolTransaction, isBold?: boolean) {
  const txStatus = getTransactionStatus(tx);
  if (txStatus === TransactionStatus.PENDING) {
    return <Clock {...(isBold ? { weight: 'bold' } : {})} />;
  }
  if (txStatus === TransactionStatus.SUCCESS_ANCHOR_BLOCK) {
    return <CheckCircle {...(isBold ? { weight: 'bold' } : {})} />;
  }
  if (txStatus === TransactionStatus.SUCCESS_MICROBLOCK) {
    return <CheckCircle {...(isBold ? { weight: 'bold' } : {})} />;
  }
  if (txStatus === TransactionStatus.NON_CANONICAL) {
    return <CheckCircle {...(isBold ? { weight: 'bold' } : {})} />;
  }
  if (txStatus === TransactionStatus.FAILED) {
    return <XCircle {...(isBold ? { weight: 'bold' } : {})} />;
  }
  if (txStatus === TransactionStatus.DROPPED) {
    return <XCircle {...(isBold ? { weight: 'bold' } : {})} />;
  }
  return <Question {...(isBold ? { weight: 'bold' } : {})} />;
}

export const TX_STATUS_ICON_COLORS = {
  [TransactionStatus.PENDING]: 'feedback.bronze-600',
  [TransactionStatus.SUCCESS_ANCHOR_BLOCK]: 'feedback.green-500',
  [TransactionStatus.SUCCESS_MICROBLOCK]: 'feedback.green-500',
  [TransactionStatus.NON_CANONICAL]: 'feedback.green-500',
  [TransactionStatus.FAILED]: 'iconError',
  [TransactionStatus.DROPPED]: 'iconError',
  default: 'iconError',
};

export function getTxStatusIconColor(tx: Transaction | MempoolTransaction) {
  const txStatus = getTransactionStatus(tx);
  const iconColor = TX_STATUS_ICON_COLORS[txStatus] || TX_STATUS_ICON_COLORS.default;
  return iconColor;
}

export const TX_STATUS_BG_COLORS = {
  [TransactionStatus.PENDING]: 'transactionStatus.pending',
  [TransactionStatus.SUCCESS_ANCHOR_BLOCK]: 'transactionStatus.confirmed',
  [TransactionStatus.SUCCESS_MICROBLOCK]: 'transactionStatus.confirmed',
  [TransactionStatus.NON_CANONICAL]: 'transactionStatus.confirmed',
  [TransactionStatus.FAILED]: 'transactionStatus.failed',
  [TransactionStatus.DROPPED]: 'transactionStatus.failed',
  default: 'surfacePrimary',
};

export function getTxStatusBgColor(tx: Transaction | MempoolTransaction) {
  const txStatus = getTransactionStatus(tx);
  const bgColor = TX_STATUS_BG_COLORS[txStatus] || TX_STATUS_BG_COLORS.default;
  return bgColor;
}

const TX_STATUS_LABELS = {
  [TransactionStatus.PENDING]: 'Pending',
  [TransactionStatus.SUCCESS_ANCHOR_BLOCK]: 'Confirmed',
  [TransactionStatus.SUCCESS_MICROBLOCK]: 'Confirmed',
  [TransactionStatus.NON_CANONICAL]: 'Confirmed',
  [TransactionStatus.FAILED]: 'Failed',
  [TransactionStatus.DROPPED]: 'Failed',
  default: 'Unknown',
};

export function getTxStatusLabel(tx: Transaction | MempoolTransaction) {
  const txStatus = getTransactionStatus(tx);
  const label = TX_STATUS_LABELS[txStatus] || TX_STATUS_LABELS.default;
  return label;
}

export function isConfirmedTx<T extends Transaction, U extends MempoolTransaction>(
  tx: T | U
): tx is T {
  return 'block_height' in tx && tx.block_height !== undefined;
}
export const getTxTitle = (tx: Transaction | MempoolTransaction) => {
  switch (tx.tx_type) {
    case 'smart_contract':
      return getContractName(tx?.smart_contract?.contract_id);
    case 'contract_call':
      return getFunctionName(tx);
    case 'token_transfer':
      return `Send ${microToStacksFormatted(tx.token_transfer.amount)} STX`;
    case 'coinbase':
      return isConfirmedTx<CoinbaseTransaction, MempoolCoinbaseTransaction>(tx)
        ? `Block #${tx.block_height}`
        : 'Coinbase';
    case 'poison_microblock':
      return `Poison microblock transaction`;
    case 'tenure_change':
      return `Tenure ${tx.tenure_change_payload?.cause} ${isConfirmedTx<TenureChangeTransaction, MempoolTenureChangeTransaction>(tx) ? `(#${tx?.block_height})` : ''}`;
  }
};
