import { OperationResponse } from '@stacks/blockchain-api-client';

/**
 * Lean transaction summary returned by the v3 list endpoints
 * (`/extended/v3/transactions` and `/extended/v3/blocks/{height_or_hash}/transactions`).
 * Note: only `limit` + `cursor` are supported as query params, no filtering/sorting.
 */
export type TransactionSummary = OperationResponse['get_transactions']['results'][number];

export type BlockTransactionSummaryListResponse = OperationResponse['get_block_transactions'];
