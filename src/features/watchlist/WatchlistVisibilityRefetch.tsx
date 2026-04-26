'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { watchlistBalancesQueryKey } from '@/common/queries/useWatchlistQueries';
import { useWatchlist } from '@/features/watchlist/useWatchlist';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

const DEV = process.env.NODE_ENV === 'development';

/**
 * When the tab becomes visible, refetch watchlist balances + tx queries so badge/toasts
 * see fresh data without relying on `refetchOnWindowFocus` (interval + visibility only).
 */
export function WatchlistVisibilityRefetch() {
  const queryClient = useQueryClient();
  const { activeNetworkKey: baseUrl } = useGlobalContext();
  const { sortedItems, hydrated } = useWatchlist();
  const principalsKey = sortedItems.map(i => i.principal).join('|');

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (!hydrated || sortedItems.length === 0) return;

      if (DEV) {
        // eslint-disable-next-line no-console -- dev-only trace for watchlist refetch strategy
        console.debug('[watchlist:visibility] invalidate balances + watchlist tx queries');
      }

      void queryClient.invalidateQueries({
        queryKey: watchlistBalancesQueryKey(baseUrl, principalsKey),
      });
      void queryClient.invalidateQueries({
        predicate: q => {
          const key = q.queryKey;
          return Array.isArray(key) && key[key.length - 1] === 'watchlist';
        },
      });
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [queryClient, baseUrl, principalsKey, hydrated, sortedItems.length]);

  return null;
}
