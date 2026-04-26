import { parseWatchlistJson, saveWatchlistToStorage } from '../storage';
import type { WatchlistItem } from '../types';
import { WATCHLIST_STORAGE_KEY } from '../types';

describe('watchlist storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('parseWatchlistJson accepts valid items', () => {
    const items: WatchlistItem[] = [
      { principal: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', addedAt: 1, bnsName: 'foo.btc' },
    ];
    expect(parseWatchlistJson(JSON.stringify(items))).toEqual(items);
  });

  it('parseWatchlistJson rejects malformed payloads', () => {
    expect(parseWatchlistJson('not-json')).toEqual([]);
    expect(parseWatchlistJson(JSON.stringify({}))).toEqual([]);
    expect(parseWatchlistJson(JSON.stringify([{ principal: 1 }]))).toEqual([]);
  });

  it('saveWatchlistToStorage writes JSON', () => {
    const items: WatchlistItem[] = [
      { principal: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', addedAt: 10 },
    ];
    saveWatchlistToStorage(items);
    expect(localStorage.getItem(WATCHLIST_STORAGE_KEY)).toBe(JSON.stringify(items));
  });
});
