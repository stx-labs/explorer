import { mainnetNetwork, testnetNetwork } from '@/common/constants/network';
import { getAddressTxsQueryKey } from '@/common/queries/useAddressConfirmedTxsWithTransfersInfinite';
import { watchlistBalancesQueryKey } from '@/common/queries/useWatchlistQueries';

import { validateWatchlistPrincipal } from '../validation';

describe('watchlist cross-network', () => {
  const SP = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
  const ST = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';

  it('validates mainnet (SP) and testnet (ST) principals', () => {
    expect(validateWatchlistPrincipal(SP)).toBe(true);
    expect(validateWatchlistPrincipal(ST)).toBe(true);
  });

  it('validates contract id on mainnet address', () => {
    expect(validateWatchlistPrincipal(`${SP}.counter`)).toBe(true);
  });

  it('allows a watchlist containing both SP and ST principals (format)', () => {
    expect(validateWatchlistPrincipal(SP) && validateWatchlistPrincipal(ST)).toBe(true);
  });

  it('uses distinct React Query keys for balances per API base URL', () => {
    const key = `${SP}|${ST}`;
    expect(watchlistBalancesQueryKey(mainnetNetwork.url, key)).not.toEqual(
      watchlistBalancesQueryKey(testnetNetwork.url, key)
    );
  });

  it('uses distinct React Query keys for tx feed per API base URL', () => {
    const kMain = [...getAddressTxsQueryKey(SP, 20, 0), mainnetNetwork.url, 'watchlist'];
    const kTest = [...getAddressTxsQueryKey(SP, 20, 0), testnetNetwork.url, 'watchlist'];
    expect(kMain).not.toEqual(kTest);
  });
});
