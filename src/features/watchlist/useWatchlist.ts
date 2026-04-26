'use client';

import { useAppDispatch, useAppSelector } from '@/common/state/hooks';
import { store } from '@/common/state/store';
import { useCallback, useMemo } from 'react';

import { saveWatchlistToStorage } from './storage';
import type { WatchlistErrorCode, WatchlistItem } from './types';
import { WATCHLIST_MAX_ADDRESSES } from './types';
import {
  addWatchlistItem,
  markWatchlistAddressViewed,
  markAllWatchlistViewed,
  removeWatchlistItem,
  updateWatchlistItem,
} from './watchlist-slice';
import { validateWatchlistPrincipal } from './validation';

export type WatchlistMutationResult =
  | { ok: true }
  | { ok: false; code: WatchlistErrorCode; message?: string };

export function useWatchlist() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(s => s.watchlist.items);
  const hydrated = useAppSelector(s => s.watchlist.hydrated);
  const notificationsDisabled = useAppSelector(s => s.watchlist.notificationsDisabled);

  const isInWatchlist = useCallback(
    (principal: string) => items.some(i => i.principal === principal),
    [items]
  );

  const getItem = useCallback(
    (principal: string) => items.find(i => i.principal === principal),
    [items]
  );

  const add = useCallback(
    (principal: string, options?: { bnsName?: string }): WatchlistMutationResult => {
      const trimmed = principal.trim();
      if (!validateWatchlistPrincipal(trimmed)) {
        return { ok: false, code: 'INVALID_PRINCIPAL' };
      }
      if (items.some(i => i.principal === trimmed)) {
        return { ok: false, code: 'DUPLICATE' };
      }
      if (items.length >= WATCHLIST_MAX_ADDRESSES) {
        return { ok: false, code: 'LIMIT' };
      }
      const entry: WatchlistItem = {
        principal: trimmed,
        bnsName: options?.bnsName,
        addedAt: Date.now(),
      };
      dispatch(addWatchlistItem(entry));
      try {
        saveWatchlistToStorage(store.getState().watchlist.items);
      } catch {
        dispatch(removeWatchlistItem(trimmed));
        return { ok: false, code: 'STORAGE_QUOTA' };
      }
      return { ok: true };
    },
    [dispatch, items]
  );

  const remove = useCallback(
    (principal: string): WatchlistMutationResult => {
      const snapshot = items.find(i => i.principal === principal);
      if (!snapshot) {
        return { ok: false, code: 'NOT_FOUND' };
      }
      const restored: WatchlistItem = { ...snapshot };
      dispatch(removeWatchlistItem(principal));
      try {
        saveWatchlistToStorage(store.getState().watchlist.items);
      } catch {
        dispatch(addWatchlistItem(restored));
        return { ok: false, code: 'STORAGE_QUOTA' };
      }
      return { ok: true };
    },
    [dispatch, items]
  );

  const toggle = useCallback(
    (principal: string, options?: { bnsName?: string }): WatchlistMutationResult => {
      if (isInWatchlist(principal)) {
        return remove(principal);
      }
      return add(principal, options);
    },
    [add, remove, isInWatchlist]
  );

  const markAddressViewed = useCallback(
    (principal: string) => {
      if (!isInWatchlist(principal)) return;
      dispatch(markWatchlistAddressViewed(principal));
      try {
        saveWatchlistToStorage(store.getState().watchlist.items);
      } catch {
        /* ignore persist failure for viewed marker */
      }
    },
    [dispatch, isInWatchlist]
  );

  const markAllViewed = useCallback(() => {
    dispatch(markAllWatchlistViewed());
    try {
      saveWatchlistToStorage(store.getState().watchlist.items);
    } catch {
      /* ignore */
    }
  }, [dispatch]);

  const setBnsName = useCallback(
    (principal: string, bnsName: string | undefined) => {
      if (!isInWatchlist(principal)) return;
      dispatch(updateWatchlistItem({ principal, patch: { bnsName } }));
      try {
        saveWatchlistToStorage(store.getState().watchlist.items);
      } catch {
        /* ignore */
      }
    },
    [dispatch, isInWatchlist]
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.addedAt - b.addedAt),
    [items]
  );

  return {
    items,
    sortedItems,
    hydrated,
    notificationsDisabled,
    isInWatchlist,
    getItem,
    add,
    remove,
    toggle,
    markAddressViewed,
    markAllViewed,
    setBnsName,
  };
}
