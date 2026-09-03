import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { diagnoseSync, isFailedContractCall } from '../../tx-diagnosis';
import {
  getContractName,
  getFunctionName,
  getMemoString,
  microToStacksFormatted,
  truncateMiddleDeprecated,
} from '../../utils/utils';

export const getTxErrorMessage = (tx: Transaction | MempoolTransaction): string | undefined => {
  // Failed contract calls get the deterministic headline; the generic strings below are wrong for
  // post-condition failures whose result is `(err …)`.
  if (isFailedContractCall(tx)) return diagnoseSync(tx, null).headline;
  switch (tx.tx_status) {
    case 'abort_by_post_condition':
      return 'This transaction would have succeeded, but was rolled back by a supplied post-condition.';
    case 'abort_by_response':
      return 'This transaction did not succeed because the transaction was aborted during its execution.';
    default:
      return undefined;
  }
};

export const getContractId = (transaction: Transaction | MempoolTransaction) => {
  switch (transaction.tx_type) {
    case 'contract_call':
      return transaction.contract_call.contract_id;
    case 'smart_contract':
      return transaction.smart_contract.contract_id;
    default:
      return undefined;
  }
};

export const getOgTitle = (tx: Transaction | MempoolTransaction) => {
  switch (tx.tx_type) {
    case 'contract_call': {
      const functionName = getFunctionName(tx);
      const contract = getContractId(tx);
      const name = contract && getContractName(contract);
      return `${functionName} ← ${name}`;
    }
    case 'smart_contract': {
      const contract = getContractId(tx);
      const name = contract && getContractName(contract);
      return `${name}`;
    }
    case 'token_transfer': {
      return `${microToStacksFormatted(tx.token_transfer.amount)} STX transferred`;
    }
    case 'coinbase':
      return `Coinbase${
        tx.tx_status !== 'pending' && ` for block #${(tx as Transaction).block_height}`
      }`;
    case 'poison_microblock':
      return truncateMiddleDeprecated(tx.tx_id);
  }
};

export const getDescription = (tx: Transaction | MempoolTransaction) => {
  switch (tx.tx_type) {
    case 'token_transfer': {
      const amount = `${microToStacksFormatted(tx.token_transfer.amount)} STX`;
      return `This transaction transferred ${amount} from ${truncateMiddleDeprecated(
        tx.sender_address
      )} to ${truncateMiddleDeprecated(tx.token_transfer.recipient_address)}${
        tx.token_transfer.memo
          ? ` with the message "${getMemoString(tx.token_transfer.memo)}".`
          : '.'
      }`;
    }
    case 'smart_contract': {
      const contract = getContractId(tx);
      const contractName = contract && getContractName(contract);
      return `This transaction deployed a smart contract with the name '${contractName}' from the address ${truncateMiddleDeprecated(
        tx.sender_address,
        8
      )}.${
        tx.tx_status !== 'success' && tx.tx_status !== 'pending' ? ` ${getTxErrorMessage(tx)}` : ''
      }${
        'events' in tx && tx.events.length
          ? ` The transaction generated a total of ${tx.events.length} events during its execution.`
          : ''
      }`;
    }
    case 'contract_call':
      const functionName = getFunctionName(tx);
      const contract = getContractId(tx);
      return `This transaction called the public function '${functionName}' from the contract ${
        contract && truncateMiddleDeprecated(contract)
      }.${
        tx.tx_status !== 'success' && tx.tx_status !== 'pending' ? ` ${getTxErrorMessage(tx)}` : ''
      }${
        'events' in tx && tx.events.length
          ? ` This transaction generated a total of ${tx.events.length} events during its execution.`
          : ''
      }`;
  }
};
