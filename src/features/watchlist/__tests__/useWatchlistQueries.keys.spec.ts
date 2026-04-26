import { mainnetNetwork, testnetNetwork } from '@/common/constants/network';
import { getAddressTxsQueryKey } from '@/common/queries/useAddressConfirmedTxsWithTransfersInfinite';
import {
  WATCHLIST_QUERY_GC_MS,
  WATCHLIST_QUERY_STALE_MS,
  WATCHLIST_TX_ITEMS_PER_PAGE,
  watchlistBalancesQueryKey,
} from '@/common/queries/useWatchlistQueries';

describe('useWatchlistQueries cache keys & timing', () => {
  it('watchlistBalancesQueryKey isolates network base URL', () => {
    const principals = 'a|b';
    expect(watchlistBalancesQueryKey(mainnetNetwork.url, principals)).not.toEqual(
      watchlistBalancesQueryKey(testnetNetwork.url, principals)
    );
  });

  it('watchlistBalancesQueryKey isolates principals list', () => {
    const url = mainnetNetwork.url;
    expect(watchlistBalancesQueryKey(url, 'a')).not.toEqual(watchlistBalancesQueryKey(url, 'a|b'));
  });

  it('watchlist tx query key shape ends with [baseUrl, "watchlist"]', () => {
    const principal = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const baseUrl = mainnetNetwork.url;
    const key = [...getAddressTxsQueryKey(principal, 20, 0), baseUrl, 'watchlist'];
    expect(key[key.length - 1]).toBe('watchlist');
    expect(key[key.length - 2]).toBe(baseUrl);
    expect(key[0]).toBe('address-txs');
  });

  it('different baseUrl yields different watchlist tx cache keys for same principal', () => {
    const principal = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const limit = WATCHLIST_TX_ITEMS_PER_PAGE;
    const a = [...getAddressTxsQueryKey(principal, limit, 0), mainnetNetwork.url, 'watchlist'];
    const b = [...getAddressTxsQueryKey(principal, limit, 0), testnetNetwork.url, 'watchlist'];
    expect(a).not.toEqual(b);
  });

  it('exposes stable stale and gc windows for watchlist queries', () => {
    expect(WATCHLIST_QUERY_STALE_MS).toBe(30_000);
    expect(WATCHLIST_QUERY_GC_MS).toBe(300_000);
  });
});
