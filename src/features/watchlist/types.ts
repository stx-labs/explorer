export interface WatchlistItem {
  principal: string;
  bnsName?: string;
  addedAt: number;
  lastViewedAt?: number;
  /** Lower = higher in the list (manual order). Assigned on load / add / drag. */
  order?: number;
}

export interface PortfolioSummary {
  totalStx: string;
  totalUsd: number;
  addressesCount: number;
  lastUpdated: number;
}

export type UnifiedTxType = 'transfer' | 'contract_call' | 'token_transfer';

export interface UnifiedTransaction {
  txId: string;
  type: UnifiedTxType;
  direction: 'in' | 'out';
  amount: string;
  token?: string;
  from: string;
  to: string;
  timestamp: number;
  principal: string;
}

export const WATCHLIST_STORAGE_KEY = 'stacks-explorer-watchlist';
export const WATCHLIST_NOTIFY_DISABLED_KEY = 'stacks-explorer-watchlist-notifications-disabled';
export const WATCHLIST_MAX_ADDRESSES = 50;

export type WatchlistErrorCode =
  | 'INVALID_PRINCIPAL'
  | 'DUPLICATE'
  | 'LIMIT'
  | 'STORAGE_QUOTA'
  | 'NOT_FOUND';
