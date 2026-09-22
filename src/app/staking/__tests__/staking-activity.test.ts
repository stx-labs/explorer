import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { logError } from '@/common/utils/error-utils';

import { fetchStakingActivity } from '../data';
import bondFixture from './fixtures/bond.json';

jest.mock('@/api/stacksAPIFetch');
jest.mock('@/common/utils/error-utils');

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

function serveChain(txs: TxStub[], { failingFunction }: { failingFunction?: string } = {}) {
  const byId = new Map(txs.map(tx => [tx.txId, tx]));

  fetchMock.mockImplementation(async (url: string) => {
    const bondIndex = /\/extended\/v3\/staking\/bonds\/(\d+)$/.exec(url)?.[1];
    if (bondIndex) return respond({ ...bondFixture, index: Number(bondIndex) });
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
          .sort((a, b) => b.blockHeight - a.blockHeight)
          .slice(
            Number(new URL(url).searchParams.get('offset') ?? 0),
            Number(new URL(url).searchParams.get('offset') ?? 0) +
              Number(new URL(url).searchParams.get('limit'))
          )
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
    return respond({
      events: events.map(repr => ({
        contract_log: { contract_id: POX_CONTRACT, value: { repr } },
      })),
    });
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
  jest.mocked(logError).mockClear();
});

describe('fetchStakingActivity', () => {
  test('reports an initial metadata failure while preserving activity rows', async () => {
    serveChain([enrollmentTx(1, 100_000_000)]);
    const serve = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url, options) =>
      url.includes('/extended/v3/staking/bonds?')
        ? Promise.resolve({ ok: false, status: 503 } as Response)
        : serve(url, options)
    );
    const result = await fetchStakingActivity(POX_CONTRACT, 'mainnet');
    expect(result.incomplete).toBe(true);
    expect(result.events[0].amount).toBe('1 BTC');
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to fetch bonds: 503' }),
      'Staking activity: partial fetch failure',
      { chain: 'mainnet' },
      'error'
    );
  });

  test('ignores another contract emitting the same activity topic', async () => {
    serveChain([enrollmentTx(1, 100_000_000)]);
    const serve = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) => {
      const response = await serve(url, options);
      if (!url.includes('/extended/v1/tx/')) return response;
      const body = await response.json();
      body.events.unshift({
        contract_log: {
          contract_id: 'SP000000000000000000002Q6VF78.other-contract',
          value: { repr: enrollment(99, 900_000_000, 1) },
        },
      });
      return respond(body);
    });
    const { events } = await fetchStakingActivity(POX_CONTRACT, 'mainnet');
    expect(events[0]).toMatchObject({ bondIndex: 1, amount: '1 BTC' });
  });

  test('marks invalid setup capacity unavailable instead of showing zero', async () => {
    serveChain([
      {
        ...enrollmentTx(1, 0),
        functionName: 'setup-bond',
        events: ['(tuple (topic "setup-bond") (bond-index u100))'],
      },
    ]);
    const serve = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url, options) =>
      url.endsWith('/bonds/100')
        ? Promise.resolve(respond({ ...bondFixture, parameters: { btc_capacity: 'invalid' } }))
        : serve(url, options)
    );
    const { events } = await fetchStakingActivity(POX_CONTRACT, 'mainnet');
    expect(events[0].amount).toBeUndefined();
    expect(events[0].amountUnavailable).toBe(true);
  });

  test('loads capacity for a setup bond absent from the first page', async () => {
    serveChain([
      {
        ...enrollmentTx(1, 0),
        functionName: 'setup-bond',
        events: ['(tuple (topic "setup-bond") (bond-index u100))'],
      },
    ]);
    const { events, incomplete } = await fetchStakingActivity(
      POX_CONTRACT,
      'mainnet',
      undefined,
      5,
      'bonds'
    );
    expect(incomplete).toBe(false);
    expect(events[0].amount).toBe('136.8672 BTC');
    expect(events[0].amountUnavailable).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/bonds/100'))).toBe(true);
  });

  test('marks an actual setup-bond lookup failure as unavailable', async () => {
    serveChain([
      {
        ...enrollmentTx(1, 0),
        functionName: 'setup-bond',
        events: ['(tuple (topic "setup-bond") (bond-index u100))'],
      },
    ]);
    const serve = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) =>
      url.endsWith('/bonds/100') ? ({ ok: false, status: 503 } as Response) : serve(url, options)
    );
    const { events, incomplete } = await fetchStakingActivity(
      POX_CONTRACT,
      'mainnet',
      undefined,
      5,
      'bonds'
    );
    expect(incomplete).toBe(true);
    expect(events[0].amount).toBeUndefined();
    expect(events[0].amountUnavailable).toBe(true);
  });

  test('does not claim a fetch failed when a successful event has no amount', async () => {
    serveChain([
      { ...enrollmentTx(1, 0), events: ['(tuple (topic "register-for-bond") (bond-index u1))'] },
    ]);
    const { events, incomplete } = await fetchStakingActivity(
      POX_CONTRACT,
      'mainnet',
      undefined,
      5
    );
    expect(incomplete).toBe(false);
    expect(events[0].amount).toBeUndefined();
    expect(events[0].amountUnavailable).toBe(false);
  });
  test('paginates past the API limit to inspect the advertised 60 transactions', async () => {
    serveChain(Array.from({ length: 65 }, (_, index) => enrollmentTx(index + 1, 100_000)));

    const { events, incomplete } = await fetchStakingActivity(
      POX_CONTRACT,
      'mainnet',
      undefined,
      60,
      'enrollments'
    );

    expect(incomplete).toBe(false);
    expect(events).toHaveLength(60);
    expect(events.at(-1)?.blockHeight).toBe(8_900_006);
    expect(fetchMock.mock.calls.some(([url]) => url.includes('offset=50'))).toBe(true);
    for (const [url, options] of fetchMock.mock.calls) {
      if (url.includes('function_name=')) {
        expect(options?.cache).toBe('no-store');
        expect(options?.next).toBeUndefined();
      } else if (url.includes('/extended/v1/tx/')) {
        expect(options?.next?.revalidate).toBe(86400);
      }
    }
  });

  test('filters a bond before capping expanded distribution events', async () => {
    serveChain([
      {
        txId: '0xfeed',
        functionName: 'calculate-rewards',
        burnBlockTime: 1_788_999_999,
        blockHeight: 8_999_999,
        events: [1, 2, 3].map(
          index => `(tuple (bond-index u${index}) (bond-rewards u100) (topic "bond-distribution"))`
        ),
      },
    ]);

    const { events } = await fetchStakingActivity(
      POX_CONTRACT,
      'mainnet',
      undefined,
      1,
      'distributions',
      3
    );

    expect(events).toHaveLength(1);
    expect(events[0].bondIndex).toBe(3);
  });

  test('reads the bonded BTC and the paired STX off an enrollment', async () => {
    serveChain([enrollmentTx(1, 2_500_000_000)]);

    const { events } = await fetchStakingActivity(POX_CONTRACT, 'mainnet', undefined, 5);

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

    const { events } = await fetchStakingActivity(POX_CONTRACT, 'mainnet', undefined, 5);

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

    const { events, incomplete } = await fetchStakingActivity(
      POX_CONTRACT,
      'mainnet',
      undefined,
      5
    );

    expect(incomplete).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('Bond created');
  });

  test('returns the newest rows first, capped at the limit', async () => {
    serveChain([1, 2, 3, 4, 5, 6, 7, 8].map(seq => enrollmentTx(seq, 100_000)));

    const { events } = await fetchStakingActivity(POX_CONTRACT, 'mainnet', undefined, 3);

    expect(events.map(event => event.blockHeight)).toEqual([8_900_008, 8_900_007, 8_900_006]);
  });

  test.each([
    ['update-bond-registration', 'amount-sats', '25 BTC'],
    ['unstake-sbtc', 'amount-withdrawn-sats', '25 sBTC'],
  ])('reads the amount and bond from %s events', async (functionName, amountField, expected) => {
    serveChain([
      {
        ...enrollmentTx(1, 0),
        functionName,
        events: [`(tuple (topic "${functionName}") (bond-index u1) (${amountField} u2500000000))`],
      },
    ]);
    const { events } = await fetchStakingActivity(POX_CONTRACT, 'mainnet', undefined, 5);
    expect(events[0].amount).toBe(expected);
    expect(events[0].bondIndex).toBe(1);
    expect(events[0].amountUnavailable).toBe(false);
  });

  test('recovers the amount after a transient transaction-detail failure', async () => {
    serveChain([enrollmentTx(1, 2500000000)]);
    const serve = fetchMock.getMockImplementation()!;
    let detailRequests = 0;
    fetchMock.mockImplementation(async (url, options) => {
      if (url.includes('/extended/v1/tx/0x') && ++detailRequests === 1) {
        return { ok: false, status: 429 } as Response;
      }
      return serve(url, options);
    });
    const { events, incomplete } = await fetchStakingActivity(
      POX_CONTRACT,
      'mainnet',
      undefined,
      5
    );
    expect(detailRequests).toBe(2);
    expect(incomplete).toBe(false);
    expect(events[0].amount).toBe('25 BTC');
  });

  test('identifies a persistently unavailable amount instead of an unexplained dash', async () => {
    serveChain([enrollmentTx(1, 2500000000)]);
    const serve = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) =>
      url.includes('/extended/v1/tx/0x')
        ? ({ ok: false, status: 503 } as Response)
        : serve(url, options)
    );
    const { events, incomplete } = await fetchStakingActivity(
      POX_CONTRACT,
      'mainnet',
      undefined,
      5
    );
    expect(incomplete).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0].amount).toBeUndefined();
    expect(events[0].amountUnavailable).toBe(true);
  });

  test('limits concurrent detail requests while preserving all amounts and ordering', async () => {
    serveChain(Array.from({ length: 12 }, (_, index) => enrollmentTx(index + 1, 2500000000)));
    const serve = fetchMock.getMockImplementation()!;
    let active = 0;
    let peak = 0;
    fetchMock.mockImplementation(async (url, options) => {
      if (!url.includes('/extended/v1/tx/0x')) return serve(url, options);
      active++;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      return serve(url, options);
    });
    const { events, incomplete } = await fetchStakingActivity(
      POX_CONTRACT,
      'mainnet',
      undefined,
      12
    );
    expect(peak).toBeLessThanOrEqual(4);
    expect(incomplete).toBe(false);
    expect(events).toHaveLength(12);
    expect(events.every(event => event.amount === '25 BTC')).toBe(true);
    expect(events[0].blockHeight).toBe(8900012);
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

    const { events } = await fetchStakingActivity(
      POX_CONTRACT,
      'mainnet',
      undefined,
      5,
      'enrollments'
    );

    expect(events.map(event => event.label)).toEqual(['Enrolled']);
    const requested = fetchMock.mock.calls
      .map(([url]) => /function_name=([^&]+)/.exec(url as string)?.[1])
      .filter(Boolean);
    expect(requested).not.toContain('setup-bond');
  });
});
