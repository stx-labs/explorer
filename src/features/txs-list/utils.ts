import { TransactionType } from '@stacks/stacks-blockchain-api-types';

import { TransactionStatus } from '../../common/constants/constants';
import { TxStatus } from '../../common/types/tx';
import { TransactionSummary } from '../../common/types/tx-v3';

// v3 list endpoints only return confirmed, canonical txs, so the microblock/non-canonical
// states that getTransactionStatus handles can't occur here.
export function getV3TxStatus(status: TransactionSummary['status']): TxStatus {
  if (status === 'success') return TransactionStatus.SUCCESS_ANCHOR_BLOCK;
  return TransactionStatus.FAILED;
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
