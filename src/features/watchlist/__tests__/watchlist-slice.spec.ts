import type { WatchlistItem } from '../types';
import {
  addWatchlistItem,
  hydrateWatchlist,
  markAllWatchlistViewed,
  markWatchlistAddressViewed,
  removeWatchlistItem,
  reorderWatchlist,
  setWatchlistNotificationsDisabled,
  updateWatchlistItem,
  watchlistInitialState,
  watchlistSlice,
} from '../watchlist-slice';

const reducer = watchlistSlice.reducer;

const item = (p: string, addedAt: number, extra?: Partial<WatchlistItem>): WatchlistItem => ({
  principal: p,
  addedAt,
  ...extra,
});

describe('watchlistSlice', () => {
  it('hydrateWatchlist sets items, notification flag, and hydrated', () => {
    const items = [item('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 1)];
    const s = reducer(
      watchlistInitialState,
      hydrateWatchlist({ items, notificationsDisabled: true })
    );
    expect(s.items).toEqual(items);
    expect(s.notificationsDisabled).toBe(true);
    expect(s.hydrated).toBe(true);
  });

  it('addWatchlistItem ignores duplicate principal', () => {
    const i = item('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 1);
    let s = reducer({ ...watchlistInitialState, hydrated: true }, addWatchlistItem(i));
    s = reducer(s, addWatchlistItem({ ...i, addedAt: 99 }));
    expect(s.items).toHaveLength(1);
    expect(s.items[0].addedAt).toBe(1);
  });

  it('removeWatchlistItem filters by principal', () => {
    const a = item('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 1);
    const b = item('ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5', 2);
    let s = reducer(watchlistInitialState, hydrateWatchlist({ items: [a, b], notificationsDisabled: false }));
    s = reducer(s, removeWatchlistItem(a.principal));
    expect(s.items).toEqual([b]);
  });

  it('updateWatchlistItem patches an existing row', () => {
    const i = item('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 1);
    let s = reducer(watchlistInitialState, hydrateWatchlist({ items: [i], notificationsDisabled: false }));
    s = reducer(
      s,
      updateWatchlistItem({ principal: i.principal, patch: { bnsName: 'hello.btc' } })
    );
    expect(s.items[0].bnsName).toBe('hello.btc');
  });

  it('markWatchlistAddressViewed sets lastViewedAt', () => {
    const i = item('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 1);
    let s = reducer(watchlistInitialState, hydrateWatchlist({ items: [i], notificationsDisabled: false }));
    const before = Date.now();
    s = reducer(s, markWatchlistAddressViewed(i.principal));
    expect(s.items[0].lastViewedAt).toBeGreaterThanOrEqual(before);
  });

  it('markAllWatchlistViewed updates every item', () => {
    const items = [
      item('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 1),
      item('ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5', 2),
    ];
    let s = reducer(watchlistInitialState, hydrateWatchlist({ items, notificationsDisabled: false }));
    s = reducer(s, markAllWatchlistViewed());
    const t = s.items[0].lastViewedAt;
    expect(t).toBeDefined();
    expect(s.items.every(i => i.lastViewedAt === t)).toBe(true);
  });

  it('reorderWatchlist replaces items array', () => {
    const a = item('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 1, { order: 0 });
    const b = item('ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5', 2, { order: 1 });
    let s = reducer(watchlistInitialState, hydrateWatchlist({ items: [a, b], notificationsDisabled: false }));
    const swapped: WatchlistItem[] = [
      { ...b, order: 0 },
      { ...a, order: 1 },
    ];
    s = reducer(s, reorderWatchlist(swapped));
    expect(s.items[0].principal).toBe(b.principal);
  });

  it('setWatchlistNotificationsDisabled toggles flag', () => {
    let s = reducer(watchlistInitialState, setWatchlistNotificationsDisabled(true));
    expect(s.notificationsDisabled).toBe(true);
    s = reducer(s, setWatchlistNotificationsDisabled(false));
    expect(s.notificationsDisabled).toBe(false);
  });
});
