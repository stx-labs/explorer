import { computeDedupedNewTxCount } from '../watchlistNewTxCountUtils';
import type { WatchlistItem } from '../types';

const TX = (id: string, tsSec: number) => ({
  tx: {
    tx_id: id,
    tx_type: 'token_transfer' as const,
    sender_address: 'SPAAA',
    token_transfer: { recipient_address: 'SPBBB', amount: '1' },
    block_time: tsSec,
  },
});

describe('computeDedupedNewTxCount', () => {
  it('counts the same tx_id once when it would appear in multiple address feeds', () => {
    const t0 = 1_700_000_000;
    const items: WatchlistItem[] = [
      { principal: 'SPAAA', addedAt: 1, lastViewedAt: (t0 - 100) * 1000 },
      { principal: 'SPBBB', addedAt: 2, lastViewedAt: (t0 - 100) * 1000 },
    ];
    const sharedId = '0xabc';
    const queries = [
      { data: { results: [TX(sharedId, t0), TX('0x2', t0 + 1)] } },
      { data: { results: [TX(sharedId, t0), TX('0x3', t0 + 2)] } },
    ];
    expect(computeDedupedNewTxCount(items, queries)).toBe(3);
  });

  it('returns 0 when nothing is newer than baseline', () => {
    const t0 = 1_700_000_000;
    const items: WatchlistItem[] = [{ principal: 'SPAAA', addedAt: 1, lastViewedAt: t0 * 1000 }];
    const queries = [{ data: { results: [TX('0x1', t0 - 10)] } }];
    expect(computeDedupedNewTxCount(items, queries)).toBe(0);
  });
});
