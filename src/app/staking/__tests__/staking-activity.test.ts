import { stacksAPIFetch } from '@/api/stacksAPIFetch';

import { fetchStakingActivity } from '../data';

jest.mock('@/api/stacksAPIFetch');

const fetchMock = stacksAPIFetch as jest.MockedFunction<typeof stacksAPIFetch>;

const POX_CONTRACT = 'SP000000000000000000002Q6VF78.pox-5';

interface TxStub {
  txId: string;
  functionName: string;
  burnBlockTime: number;
  blockHeight: number;
  status?: string;
  events?: string[];
}

function enrollment(index: number, sats: number, microStx: number): string {
  return (
    `(tuple (amount-ustx u${microStx}) (bond-index u${index}) (first-reward-cycle u143) ` +
    `(sats-total u${sats}) (topic "register-for-bond") (unlock-cycle u155))`
  );
}

function respond(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

/** Serves the three endpoints the activity feed reads, from a list of stub transactions. */
function serveChain(txs: TxStub[], { failingFunction }: { failingFunction?: string } = {}) {
  const byId = new Map(txs.map(tx => [tx.txId, tx]));

  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes('/extended/v3/staking/bonds')) {
      return respond({ results: [], total: 0 });
    }

    const requestedFunction = /function_name=([^&]+)/.exec(url)?.[1];
    if (requestedFunction) {
      if (requestedFunction === failingFunction) {
        return { ok: false, status: 429 } as unknown as Response;
      }
      return respond({
        results: txs
          .filter(tx => tx.functionName === requestedFunction)
          .map(tx => ({
            tx_id: tx.txId,
            tx_status: tx.status ?? 'success',
            burn_block_time: tx.burnBlockTime,
            block_height: tx.blockHeight,
            contract_call: { function_name: tx.functionName },
          })),
      });
    }

    const txId = /\/extended\/v1\/tx\/(0x[0-9a-f]+)/.exec(url)?.[1];
    const events = (txId ? byId.get(txId)?.events : undefined) ?? [];
    return respond({ events: events.map(repr => ({ contract_log: { value: { repr } } })) });
  });
}

function enrollmentTx(seq: number, sats: number): TxStub {
  return {
    txId: `0x${seq.toString(16).padStart(4, '0')}`,
    functionName: 'register-for-bond',
    burnBlockTime: 1_788_000_000 + seq,
    blockHeight: 8_900_000 + seq,
    events: [enrollment(1, sats, 387_796_250_000)],
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('fetchStakingActivity', () => {
  test('reads the bonded BTC and the paired STX off an enrollment', async () => {
    serveChain([enrollmentTx(1, 2_500_000_000)]);

    const events = await fetchStakingActivity(POX_CONTRACT, 'mainnet', undefined, 5);

    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('Enrolled');
    expect(events[0].amount).toBe('25 BTC');
    expect(events[0].detail).toBe('Genesis · 387,796 STX paired');
    expect(events[0].bondIndex).toBe(1);
  });

  test('a distribution that paid nobody does not take a row from the feed', async () => {
    // A calculate-rewards transaction can settle without paying any bond, so it
    // carries a summary event and no bond-distribution events.
    serveChain([
      {
        txId: '0xfeed',
        functionName: 'calculate-rewards',
        burnBlockTime: 1_788_999_999,
        blockHeight: 8_999_999,
        events: ['(tuple (calculation-height u8999999) (topic "calculate-rewards"))'],
      },
      ...[1, 2, 3, 4, 5].map(seq => enrollmentTx(seq, 100_000)),
    ]);

    const events = await fetchStakingActivity(POX_CONTRACT, 'mainnet', undefined, 5);

    expect(events).toHaveLength(5);
    expect(events.every(event => event.label === 'Enrolled')).toBe(true);
  });

  test('one failing request costs only its own rows', async () => {
    serveChain(
      [
        enrollmentTx(1, 100_000),
        {
          txId: '0xb0nd',
          functionName: 'setup-bond',
          burnBlockTime: 1_788_500_000,
          blockHeight: 8_950_000,
          events: ['(tuple (bond-index u2) (first-reward-cycle u145) (topic "setup-bond"))'],
        },
      ],
      { failingFunction: 'register-for-bond' }
    );

    const events = await fetchStakingActivity(POX_CONTRACT, 'mainnet', undefined, 5);

    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('Bond created');
  });

  test('returns the newest rows first, capped at the limit', async () => {
    serveChain([1, 2, 3, 4, 5, 6, 7, 8].map(seq => enrollmentTx(seq, 100_000)));

    const events = await fetchStakingActivity(POX_CONTRACT, 'mainnet', undefined, 3);

    expect(events.map(event => event.blockHeight)).toEqual([8_900_008, 8_900_007, 8_900_006]);
  });

  test('reads only the requested group when one is given', async () => {
    serveChain([
      enrollmentTx(1, 100_000),
      {
        txId: '0xb0nd',
        functionName: 'setup-bond',
        burnBlockTime: 1_788_500_000,
        blockHeight: 8_950_000,
        events: ['(tuple (bond-index u2) (first-reward-cycle u145) (topic "setup-bond"))'],
      },
    ]);

    const events = await fetchStakingActivity(POX_CONTRACT, 'mainnet', undefined, 5, 'enrollments');

    expect(events.map(event => event.label)).toEqual(['Enrolled']);
    const requested = fetchMock.mock.calls
      .map(([url]) => /function_name=([^&]+)/.exec(url as string)?.[1])
      .filter(Boolean);
    expect(requested).not.toContain('setup-bond');
  });
});
