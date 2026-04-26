import { arrayMove, ensureWatchlistOrders } from '../utils/reorderUtils';
import type { WatchlistItem } from '../types';

describe('arrayMove', () => {
  it('moves an item from one index to another', () => {
    expect(arrayMove(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
});

describe('ensureWatchlistOrders', () => {
  it('assigns order from newest addedAt when order is missing', () => {
    const items: WatchlistItem[] = [
      { principal: 'old', addedAt: 100 },
      { principal: 'new', addedAt: 200 },
    ];
    const out = ensureWatchlistOrders(items);
    expect(out.find(i => i.principal === 'new')?.order).toBe(0);
    expect(out.find(i => i.principal === 'old')?.order).toBe(1);
  });

  it('leaves items unchanged when all have finite order', () => {
    const items: WatchlistItem[] = [
      { principal: 'a', addedAt: 1, order: 0 },
      { principal: 'b', addedAt: 2, order: 1 },
    ];
    expect(ensureWatchlistOrders(items)).toEqual(items);
  });
});
