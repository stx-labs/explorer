'use client';

import {
  WATCHLIST_TX_INITIAL_LIMIT,
  useWatchlistTransactionQueries,
} from '@/common/queries/useWatchlistQueries';

import { getTxUnixSeconds, unwrapAddressTransactionRow } from './unifiedTxMap';
import { useWatchlist } from './useWatchlist';

export function useWatchlistNewTxCount() {
  const { sortedItems, hydrated } = useWatchlist();
  const principals = sortedItems.map(i => i.principal);
  const enabled = hydrated && principals.length > 0;
  const queries = useWatchlistTransactionQueries(
    principals,
    WATCHLIST_TX_INITIAL_LIMIT,
    0,
    enabled
  );

  if (!enabled) return 0;

  let count = 0;
  sortedItems.forEach((item, index) => {
    const results = queries[index]?.data?.results;
    if (!results?.length) return;
    const baseline = item.lastViewedAt ?? item.addedAt;
    for (const row of results) {
      const { tx } = unwrapAddressTransactionRow(row);
      const ts = getTxUnixSeconds(tx);
      if (ts !== null && ts * 1000 > baseline) {
        count += 1;
      }
    }
  });
  return count;
}
