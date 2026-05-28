import { TransactionType } from '@stacks/stacks-blockchain-api-types';

import { TransactionStatus } from '../../common/constants/constants';
import { TxStatus } from '../../common/types/tx';
import { TransactionSummary } from '../../common/types/tx-v3';

/**
 * The v3 transaction list endpoints only return confirmed, canonical transactions,
 * so status maps directly from the lean `status` field (no microblock/canonical flags).
 * Both non-success values in the v3 union (`abort_by_response`, `abort_by_post_condition`)
 * are failures.
 */
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
