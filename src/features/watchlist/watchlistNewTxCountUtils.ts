import type { UseQueryResult } from '@tanstack/react-query';
import type { AddressTransactionsV2ListResponse } from '@stacks/stacks-blockchain-api-types';

import type { WatchlistItem } from './types';
import { getTxUnixSeconds, unwrapAddressTransactionRow } from './unifiedTxMap';

const DEV = process.env.NODE_ENV === 'development';

export function logWatchlistBadgeDebug(message: string, payload?: Record<string, unknown>): void {
  if (!DEV) return;
  // eslint-disable-next-line no-console -- intentional dev-only diagnostics
  console.debug(`[watchlist:badge] ${message}`, payload ?? '');
}

export type WatchlistTxQueryLike = Pick<
  UseQueryResult<AddressTransactionsV2ListResponse | undefined>,
  'data'
> & { dataUpdatedAt?: number };

/**
 * Count distinct transactions newer than each watchlist baseline, across all watched addresses.
 * The same `tx_id` can appear in more than one address feed — count once (fixes inflated badge).
 */
export function computeDedupedNewTxCount(
  sortedItems: WatchlistItem[],
  queries: WatchlistTxQueryLike[]
): number {
  const seen = new Set<string>();
  let count = 0;

  sortedItems.forEach((item, index) => {
    const results = queries[index]?.data?.results;
    if (!results?.length) return;
    const baseline = item.lastViewedAt ?? item.addedAt;
    for (const row of results) {
      const { tx } = unwrapAddressTransactionRow(row);
      const id = tx?.tx_id;
      if (!id || seen.has(id)) continue;
      const ts = getTxUnixSeconds(tx);
      if (ts !== null && ts * 1000 > baseline) {
        seen.add(id);
        count += 1;
      }
    }
  });

  return count;
}
