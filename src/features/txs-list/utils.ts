import { TransactionType } from '@stacks/stacks-blockchain-api-types';

import { TransactionStatus } from '../../common/constants/constants';
import { TxStatus } from '../../common/types/tx';
import { TransactionSummary } from '../../common/types/tx-v3';
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
  }
}

export function getV3ToAddress(tx: TransactionSummary): string {
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
