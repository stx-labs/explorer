import {
  CoinbaseTransaction,
  ContractCallTransaction,
  MempoolTransaction,
  SmartContractTransaction,
  TenureChangeTransaction,
  TokenTransferTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

export type CompressedTxTableData = Pick<
  Transaction,
  | 'tx_id'
  | 'tx_type'
  | 'tx_status'
  | 'block_height'
  | 'fee_rate'
  | 'block_time'
  | 'block_height'
  | 'sender_address'
  | 'is_unanchored'
  | 'microblock_canonical'
  | 'canonical'
> & {
  token_transfer?: Pick<
    NonNullable<TokenTransferTransaction['token_transfer']>,
    'amount' | 'recipient_address'
  >;
  smart_contract?: Pick<NonNullable<SmartContractTransaction['smart_contract']>, 'contract_id'>;
  contract_call?: Pick<
    NonNullable<ContractCallTransaction['contract_call']>,
    'contract_id' | 'function_name'
  >;
  coinbase_payload?: Pick<NonNullable<CoinbaseTransaction['coinbase_payload']>, 'alt_recipient'>;
  tenure_change_payload?: Pick<
    NonNullable<TenureChangeTransaction['tenure_change_payload']>,
    'cause'
  >;
};

export type CompressedMempoolTxTableData = Pick<
  MempoolTransaction,
  | 'tx_id'
  | 'tx_type'
  | 'tx_status'
  | 'fee_rate'
  | 'sender_address'
  | 'receipt_time'
  | 'receipt_time_iso'
> & {
  token_transfer?: Pick<
    NonNullable<TokenTransferTransaction['token_transfer']>,
    'amount' | 'recipient_address'
  >;
  smart_contract?: Pick<NonNullable<SmartContractTransaction['smart_contract']>, 'contract_id'>;
  contract_call?: Pick<
    NonNullable<ContractCallTransaction['contract_call']>,
    'contract_id' | 'function_name'
  >;
  coinbase_payload?: Pick<NonNullable<CoinbaseTransaction['coinbase_payload']>, 'alt_recipient'>;
  tenure_change_payload?: Pick<
    NonNullable<TenureChangeTransaction['tenure_change_payload']>,
    'cause'
  >;
};

export type CompressedTxAndMempoolTxTableData =
  | CompressedMempoolTxTableData
  | CompressedTxTableData;

export function compressTransaction(transaction: Transaction): CompressedTxTableData {
  const minimalTx: CompressedTxTableData = {
    tx_id: transaction.tx_id,
    tx_type: transaction.tx_type,
    tx_status: transaction.tx_status,
    block_height: transaction.block_height,
    fee_rate: transaction.fee_rate,
    block_time: transaction.block_time,
    sender_address: transaction.sender_address,
    is_unanchored: transaction.is_unanchored,
    microblock_canonical: transaction.microblock_canonical,
    canonical: transaction.canonical,
  };

  if ('token_transfer' in transaction && transaction.token_transfer) {
    minimalTx.token_transfer = {
      amount: transaction.token_transfer.amount,
      recipient_address: transaction.token_transfer.recipient_address,
    };
  }

  if ('smart_contract' in transaction && transaction.smart_contract) {
    minimalTx.smart_contract = {
      contract_id: transaction.smart_contract.contract_id,
    };
  }

  if ('contract_call' in transaction && transaction.contract_call) {
    minimalTx.contract_call = {
      contract_id: transaction.contract_call.contract_id,
      function_name: transaction.contract_call.function_name,
    };
  }

  if ('coinbase_payload' in transaction && transaction.coinbase_payload) {
    minimalTx.coinbase_payload = {
      alt_recipient: transaction.coinbase_payload.alt_recipient,
    };
  }

  if ('tenure_change_payload' in transaction && transaction.tenure_change_payload) {
    minimalTx.tenure_change_payload = {
      cause: transaction.tenure_change_payload.cause,
    };
  }

  return minimalTx;
}

export function compressTransactions(transactions: Transaction[]): CompressedTxTableData[] {
  return transactions.map(tx => compressTransaction(tx));
}

export function compressMempoolTransaction(
  transaction: MempoolTransaction
): CompressedMempoolTxTableData {
  const minimalTx: CompressedMempoolTxTableData = {
    tx_id: transaction.tx_id,
    tx_type: transaction.tx_type,
    tx_status: transaction.tx_status,
    fee_rate: transaction.fee_rate,
    sender_address: transaction.sender_address,
    receipt_time: transaction.receipt_time,
    receipt_time_iso: transaction.receipt_time_iso,
  };

  if ('token_transfer' in transaction && transaction.token_transfer) {
    minimalTx.token_transfer = {
      amount: transaction.token_transfer.amount,
      recipient_address: transaction.token_transfer.recipient_address,
    };
  }

  if ('smart_contract' in transaction && transaction.smart_contract) {
    minimalTx.smart_contract = {
      contract_id: transaction.smart_contract.contract_id,
    };
  }

  if ('contract_call' in transaction && transaction.contract_call) {
    minimalTx.contract_call = {
      contract_id: transaction.contract_call.contract_id,
      function_name: transaction.contract_call.function_name,
    };
  }

  if ('coinbase_payload' in transaction && transaction.coinbase_payload) {
    minimalTx.coinbase_payload = {
      alt_recipient: transaction.coinbase_payload.alt_recipient,
    };
  }

  if ('tenure_change_payload' in transaction && transaction.tenure_change_payload) {
    minimalTx.tenure_change_payload = {
      cause: transaction.tenure_change_payload.cause,
    };
  }

  return minimalTx;
}

export function compressMempoolTransactions(
  transactions: MempoolTransaction[]
): CompressedMempoolTxTableData[] {
  return transactions.map(tx => compressMempoolTransaction(tx));
}
