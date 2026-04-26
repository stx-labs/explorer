import type { WatchlistItem } from '../types';

/** Move array item from `from` to `to` (indices in current array). */
export function arrayMove<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

/**
 * Assigns monotonic `order` (0 = top) matching "newest `addedAt` first" when `order` is missing.
 */
export function ensureWatchlistOrders(items: WatchlistItem[]): WatchlistItem[] {
  if (items.length === 0) return items;
  if (items.every(i => typeof i.order === 'number' && Number.isFinite(i.order))) {
    return items;
  }
  const newestFirst = [...items].sort((a, b) => b.addedAt - a.addedAt);
  const rank = new Map(newestFirst.map((it, i) => [it.principal, i]));
  return items.map(it => ({ ...it, order: rank.get(it.principal) ?? 0 }));
}
