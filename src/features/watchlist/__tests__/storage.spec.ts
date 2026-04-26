import {
  loadNotificationsDisabled,
  loadWatchlistFromStorage,
  parseWatchlistJson,
  saveNotificationsDisabled,
  saveWatchlistToStorage,
} from '../storage';
import type { WatchlistItem } from '../types';
import { WATCHLIST_NOTIFY_DISABLED_KEY, WATCHLIST_STORAGE_KEY } from '../types';

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

  it('saveWatchlistToStorage throws wrapped STORAGE_QUOTA on QuotaExceededError', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceeded', 'QuotaExceededError');
    });
    expect(() =>
      saveWatchlistToStorage([{ principal: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', addedAt: 1 }])
    ).toThrow('STORAGE_QUOTA');
    spy.mockRestore();
  });

  it('loadWatchlistFromStorage reads from localStorage', () => {
    const items: WatchlistItem[] = [
      { principal: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', addedAt: 7 },
    ];
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
    expect(loadWatchlistFromStorage()).toEqual(items);
  });

  it('loadWatchlistFromStorage returns empty array on bad JSON', () => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, '{');
    expect(loadWatchlistFromStorage()).toEqual([]);
  });

  it('saveNotificationsDisabled and loadNotificationsDisabled round-trip', () => {
    expect(loadNotificationsDisabled()).toBe(false);
    saveNotificationsDisabled(true);
    expect(localStorage.getItem(WATCHLIST_NOTIFY_DISABLED_KEY)).toBe('1');
    expect(loadNotificationsDisabled()).toBe(true);
    saveNotificationsDisabled(false);
    expect(localStorage.getItem(WATCHLIST_NOTIFY_DISABLED_KEY)).toBeNull();
    expect(loadNotificationsDisabled()).toBe(false);
  });
});
