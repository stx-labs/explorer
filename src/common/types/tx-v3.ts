import { OperationResponse } from '@stacks/blockchain-api-client';

export type TransactionSummary = OperationResponse['get_transactions']['results'][number];

export type TransactionSummaryListResponse = OperationResponse['get_transactions'];

export type BlockTransactionSummaryListResponse = OperationResponse['get_block_transactions'];
