import type { WatchlistItem } from './types';
import { WATCHLIST_NOTIFY_DISABLED_KEY, WATCHLIST_STORAGE_KEY } from './types';

/** Shown when persisting the watchlist fails (e.g. `QuotaExceededError`). */
export const WATCHLIST_STORAGE_QUOTA_TOAST_MESSAGE =
  'Не удалось сохранить избранное: переполнено хранилище браузера.';

function isWatchlistItem(value: unknown): value is WatchlistItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as WatchlistItem;
  return (
    typeof v.principal === 'string' &&
    typeof v.addedAt === 'number' &&
    (v.bnsName === undefined || typeof v.bnsName === 'string') &&
    (v.lastViewedAt === undefined || typeof v.lastViewedAt === 'number') &&
    (v.order === undefined || typeof v.order === 'number')
  );
}

export function parseWatchlistJson(raw: string | null): WatchlistItem[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(isWatchlistItem);
  } catch {
    return [];
  }
}

export function loadWatchlistFromStorage(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseWatchlistJson(localStorage.getItem(WATCHLIST_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveWatchlistToStorage(items: WatchlistItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error('STORAGE_QUOTA');
    }
    throw e;
  }
}

export function loadNotificationsDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(WATCHLIST_NOTIFY_DISABLED_KEY) === '1';
}

export function saveNotificationsDisabled(disabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (disabled) {
    localStorage.setItem(WATCHLIST_NOTIFY_DISABLED_KEY, '1');
  } else {
    localStorage.removeItem(WATCHLIST_NOTIFY_DISABLED_KEY);
  }
}
