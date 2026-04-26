'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  WATCHLIST_TX_INITIAL_LIMIT,
  useWatchlistTransactionQueries,
} from '@/common/queries/useWatchlistQueries';

import { computeDedupedNewTxCount, logWatchlistBadgeDebug } from './watchlistNewTxCountUtils';
import { useWatchlist } from './useWatchlist';

const BADGE_THROTTLE_MS = 5000;
const DEV = process.env.NODE_ENV === 'development';

/**
 * Throttle **increases** in the displayed count (rapid refetches / tab churn).
 * Drops to zero or a lower count apply immediately so clearing `/watchlist` feels instant.
 */
function useThrottledWatchlistBadgeCount(raw: number): number {
  const [display, setDisplay] = useState(raw);
  const lastIncreaseEmittedAtRef = useRef(0);
  const pendingIncreaseRef = useRef(raw);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pendingIncreaseRef.current = raw;

    if (raw === 0 || raw < display) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setDisplay(raw);
      lastIncreaseEmittedAtRef.current = Date.now();
      return;
    }

    if (raw === display) {
      return;
    }

    const now = Date.now();
    const elapsed = now - lastIncreaseEmittedAtRef.current;
    if (elapsed >= BADGE_THROTTLE_MS) {
      lastIncreaseEmittedAtRef.current = now;
      setDisplay(raw);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      lastIncreaseEmittedAtRef.current = Date.now();
      setDisplay(pendingIncreaseRef.current);
      timeoutRef.current = null;
    }, BADGE_THROTTLE_MS - elapsed);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [raw, display]);

  return display;
}

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

  const rawCount = useMemo(
    () => (enabled ? computeDedupedNewTxCount(sortedItems, queries) : 0),
    [enabled, sortedItems, queries]
  );

  const prevRawRef = useRef(rawCount);
  useEffect(() => {
    if (DEV && prevRawRef.current !== rawCount) {
      logWatchlistBadgeDebug('raw count changed', { from: prevRawRef.current, to: rawCount });
      prevRawRef.current = rawCount;
    }
  }, [rawCount]);

  return useThrottledWatchlistBadgeCount(rawCount);
}
