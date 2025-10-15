import {
  CoinbaseTransaction,
  ContractCallTransaction,
  MempoolTransaction,
  SmartContractTransaction,
  TenureChangeTransaction,
  TokenTransferTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

export function getToAddress(tx: Transaction | MempoolTransaction): string {
  switch (tx.tx_type) {
    case 'token_transfer':
      return tx.token_transfer?.recipient_address || '';
    case 'smart_contract':
      return tx.smart_contract?.contract_id || '';
    case 'contract_call':
      return tx.contract_call?.contract_id || '';
    case 'coinbase':
      return '';
    case 'tenure_change':
      return '';
    default:
      return '';
  }
}

export function getAmount(tx: Transaction | MempoolTransaction): number {
  if (tx.tx_type === 'token_transfer') {
    return Number(tx.token_transfer?.amount || '0');
  }
  return 0;
}

export function isConfirmedTx<T extends Transaction, U extends MempoolTransaction>(
  tx: T | U
): tx is T {
  return 'block_height' in tx && tx.block_height !== undefined;
}

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

function extractBasicTransactionPayloads<T extends Transaction | MempoolTransaction>(
  transaction: T
): Pick<
  CompressedTxAndMempoolTxTableData,
  'tx_id' | 'tx_type' | 'tx_status' | 'fee_rate' | 'sender_address'
> {
  return {
    tx_id: transaction.tx_id,
    tx_type: transaction.tx_type,
    fee_rate: transaction.fee_rate,
    sender_address: transaction.sender_address,
  } as Pick<
    CompressedTxAndMempoolTxTableData,
    'tx_id' | 'tx_type' | 'tx_status' | 'fee_rate' | 'sender_address'
  >;
}

// Add this shared utility function before compressTransaction:
function extractTransactionTypePayloads<T extends Transaction | MempoolTransaction>(
  transaction: T
): Pick<
  CompressedTxAndMempoolTxTableData,
  | 'token_transfer'
  | 'smart_contract'
  | 'contract_call'
  | 'coinbase_payload'
  | 'tenure_change_payload'
> {
  const payloads: Partial<CompressedTxAndMempoolTxTableData> = {};

  if (transaction.tx_type === 'token_transfer' && transaction.token_transfer) {
    payloads.token_transfer = {
      amount: transaction.token_transfer.amount,
      recipient_address: transaction.token_transfer.recipient_address,
    };
  }

  if (transaction.tx_type === 'smart_contract' && transaction.smart_contract) {
    payloads.smart_contract = {
      contract_id: transaction.smart_contract.contract_id,
    };
  }

  if (transaction.tx_type === 'contract_call' && transaction.contract_call) {
    payloads.contract_call = {
      contract_id: transaction.contract_call.contract_id,
      function_name: transaction.contract_call.function_name,
    };
  }

  if (transaction.tx_type === 'coinbase' && transaction.coinbase_payload) {
    payloads.coinbase_payload = {
      alt_recipient: transaction.coinbase_payload.alt_recipient,
    };
  }

  if (transaction.tx_type === 'tenure_change' && transaction.tenure_change_payload) {
    payloads.tenure_change_payload = {
      cause: transaction.tenure_change_payload.cause,
    };
  }

  return payloads as Pick<
    CompressedTxAndMempoolTxTableData,
    | 'token_transfer'
    | 'smart_contract'
    | 'contract_call'
    | 'coinbase_payload'
    | 'tenure_change_payload'
  >;
}

export function compressTransaction(transaction: Transaction): CompressedTxTableData {
  const minimalTx: CompressedTxTableData = {
    ...extractBasicTransactionPayloads(transaction),
    ...extractTransactionTypePayloads(transaction),
    tx_status: transaction.tx_status,
    block_height: transaction.block_height,
    block_time: transaction.block_time,
    is_unanchored: transaction.is_unanchored,
    microblock_canonical: transaction.microblock_canonical,
    canonical: transaction.canonical,
  };

  return minimalTx;
}

export function compressTransactions(transactions: Transaction[]): CompressedTxTableData[] {
  return transactions.map(tx => compressTransaction(tx));
}

export function compressMempoolTransaction(
  transaction: MempoolTransaction
): CompressedMempoolTxTableData {
  const minimalTx: CompressedMempoolTxTableData = {
    ...extractBasicTransactionPayloads(transaction),
    ...extractTransactionTypePayloads(transaction),
    tx_status: transaction.tx_status,
    receipt_time: transaction.receipt_time,
    receipt_time_iso: transaction.receipt_time_iso,
  };

  return minimalTx;
}

export function compressMempoolTransactions(
  transactions: MempoolTransaction[]
): CompressedMempoolTxTableData[] {
  return transactions.map(tx => compressMempoolTransaction(tx));
}

export const getTicker = (name: string) => {
  if (name.includes('-')) {
    const parts = name.split('-');
    if (parts.length >= 3) {
      return `${parts[0][0]}${parts[1][0]}${parts[2][0]}`;
    } else {
      return `${parts[0][0]}${parts[1][0]}${parts[1][1]}`;
    }
  } else {
    if (name.length >= 3) {
      return `${name[0]}${name[1]}${name[2]}`;
    }
    return name;
  }
};
