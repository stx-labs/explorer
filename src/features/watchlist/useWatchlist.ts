'use client';

import { useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';

import { useAppDispatch, useAppSelector } from '@/common/state/hooks';
import { store } from '@/common/state/store';

import { saveWatchlistToStorage, WATCHLIST_STORAGE_QUOTA_TOAST_MESSAGE } from './storage';
import type { WatchlistErrorCode, WatchlistItem } from './types';
import { WATCHLIST_MAX_ADDRESSES } from './types';
import {
  addWatchlistItem,
  markWatchlistAddressViewed,
  markAllWatchlistViewed,
  removeWatchlistItem,
  reorderWatchlist,
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
      const maxOrder = items.reduce((m, i) => Math.max(m, i.order ?? 0), -1);
      const entry: WatchlistItem = {
        principal: trimmed,
        bnsName: options?.bnsName,
        addedAt: Date.now(),
        order: maxOrder + 1,
      };
      dispatch(addWatchlistItem(entry));
      try {
        saveWatchlistToStorage(store.getState().watchlist.items);
      } catch {
        dispatch(removeWatchlistItem(trimmed));
        toast.error(WATCHLIST_STORAGE_QUOTA_TOAST_MESSAGE);
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
        toast.error(WATCHLIST_STORAGE_QUOTA_TOAST_MESSAGE);
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

  const reorderRowsByPrincipalOrder = useCallback(
    (orderedPrincipals: string[]): WatchlistMutationResult => {
      if (orderedPrincipals.length !== items.length) {
        return { ok: false, code: 'NOT_FOUND' };
      }
      const principalSet = new Set(items.map(i => i.principal));
      if (!orderedPrincipals.every(p => principalSet.has(p))) {
        return { ok: false, code: 'NOT_FOUND' };
      }
      const snapshot = items.map(i => ({ ...i }));
      const byP = Object.fromEntries(items.map(i => [i.principal, { ...i }]));
      const next: WatchlistItem[] = orderedPrincipals.map((p, i) => ({
        ...byP[p],
        order: i,
      }));
      dispatch(reorderWatchlist(next));
      try {
        saveWatchlistToStorage(store.getState().watchlist.items);
      } catch {
        dispatch(reorderWatchlist(snapshot));
        toast.error(WATCHLIST_STORAGE_QUOTA_TOAST_MESSAGE);
        return { ok: false, code: 'STORAGE_QUOTA' };
      }
      return { ok: true };
    },
    [dispatch, items]
  );

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
    () =>
      [...items].sort((a, b) => {
        const ao = a.order ?? a.addedAt;
        const bo = b.order ?? b.addedAt;
        if (ao !== bo) return ao - bo;
        return a.principal.localeCompare(b.principal);
      }),
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
    reorderRowsByPrincipalOrder,
    setBnsName,
  };
}
