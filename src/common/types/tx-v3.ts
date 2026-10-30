import { OperationResponse } from '@stacks/blockchain-api-client';
import type { operations } from '@stacks/blockchain-api-client/lib/generated/schema';

export type TransactionSummary = OperationResponse['get_transactions']['results'][number];

export type TransactionSummaryListResponse = OperationResponse['get_transactions'];

export type BlockTransactionSummaryListResponse = OperationResponse['get_block_transactions'];

export type PrincipalTransactionSummary =
  OperationResponse['get_principal_transactions']['results'][number];

export type PrincipalTransactionSummaryListResponse =
  OperationResponse['get_principal_transactions'];

export type MempoolTransactionSummary =
  OperationResponse['get_mempool_transactions']['results'][number];

export type MempoolTransactionSummaryListResponse = OperationResponse['get_mempool_transactions'];

/** A transaction as returned by `GET /extended/v3/transactions/{tx_id}`: mined or still pending. */
export type TxDetails = OperationResponse['get_transaction'];

export type ConfirmedTxDetails = Extract<TxDetails, { block: unknown }>;

export type TxDetailsType = TxDetails['type'];

export type TxDetailsIncludeField = NonNullable<
  NonNullable<operations['get_transaction']['parameters']['query']>['include']
>[number];

export type TxPostCondition = NonNullable<TxDetails['post_conditions']>[number];

export type TxPostConditionMode = NonNullable<TxDetails['post_condition_mode']>;

export type TxEventListResponse = OperationResponse['get_transaction_events'];

export type TxEvent = TxEventListResponse['results'][number];

export type TxDetailsOf<T extends TxDetailsType> = Extract<TxDetails, { type: T }>;
