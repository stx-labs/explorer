import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

export const getSenderName = (txType: Transaction['tx_type']) => {
  switch (txType) {
    case 'smart_contract':
      return 'Deployed by';
    case 'contract_call':
      return 'Called by';
    default:
      return 'Sender address';
  }
};

export const isInMicroblock = (tx: Transaction | MempoolTransaction) =>
  tx?.tx_status === 'success' && tx.is_unanchored;

export const isInMempool = (tx: Transaction | MempoolTransaction): tx is MempoolTransaction => {
  return !('block_height' in tx);
};
