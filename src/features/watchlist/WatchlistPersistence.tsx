'use client';

import { useAppDispatch } from '@/common/state/hooks';
import { useEffect } from 'react';

import { hydrateWatchlist } from './watchlist-slice';
import { loadNotificationsDisabled, loadWatchlistFromStorage } from './storage';

/** Loads persisted watchlist and notification preference into Redux once on the client. */
export function WatchlistPersistence() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const items = loadWatchlistFromStorage();
    const notificationsDisabled = loadNotificationsDisabled();
    dispatch(hydrateWatchlist({ items, notificationsDisabled }));
  }, [dispatch]);

  return null;
}
