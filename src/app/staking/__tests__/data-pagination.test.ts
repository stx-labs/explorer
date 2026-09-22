import { stacksAPIFetch } from '@/api/stacksAPIFetch';

import {
  fetchBondRegistrations,
  fetchBondRewards,
  fetchBondsPage,
  fetchCycleRewards,
  fetchPoxInfo,
} from '../data';

jest.mock('@/api/stacksAPIFetch');
const fetchMock = stacksAPIFetch as jest.MockedFunction<typeof stacksAPIFetch>;
const POX_CONTRACT = 'SP000000000000000000002Q6VF78.pox-5';

function respond(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

beforeEach(() => fetchMock.mockReset());

test('returns and forwards the opaque next bond cursor', async () => {
  fetchMock
    .mockResolvedValueOnce(
      respond({ results: [{ index: 2 }], total: 2, cursor: { next: '1:next' } })
    )
    .mockResolvedValueOnce(respond({ results: [{ index: 1 }], total: 2, cursor: { next: null } }));
  const page = await fetchBondsPage('mainnet');
  expect(page.nextCursor).toBe('1:next');
  const last = await fetchBondsPage('mainnet', undefined, 50, page.nextCursor!);
  expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('cursor')).toBe('1:next');
  expect(last.nextCursor).toBeNull();
});

test('omits cycles with no stake but keeps a staked cycle with zero rewards', async () => {
  fetchMock.mockImplementation(async (url, options) => {
    const cycle = BigInt(`0x${JSON.parse(options?.body as string).arguments[0].slice(4)}`);
    const amount =
      url.endsWith('get-total-shares-staked-for-cycle') && cycle === BigInt(1)
        ? BigInt(100)
        : BigInt(0);
    return respond({ okay: true, result: `0x01${amount.toString(16).padStart(32, '0')}` });
  });
  await expect(fetchCycleRewards([0, 1], POX_CONTRACT, 'mainnet')).resolves.toEqual({
    1: { cycleNumber: 1, rewardsPerMicroStx: BigInt(0), stakedMicroStx: BigInt(100) },
  });
});

test('rejects PoX data without a current cycle so the page can use its unavailable state', async () => {
  fetchMock.mockResolvedValue(respond({ contract_id: 'SP000000000000000000002Q6VF78.pox-5' }));
  await expect(fetchPoxInfo('mainnet')).rejects.toThrow('missing the current cycle');
});

test.each([200, 201, 245])(
  'reads all %i reward transactions with bounded concurrency',
  async count => {
    let active = 0;
    let peak = 0;
    fetchMock.mockImplementation(async (url, options) => {
      const params = new URL(url).searchParams;
      if (params.has('function_name')) {
        expect(options?.cache).toBe('default');
        expect(options?.next?.revalidate).toBe(60);
        const offset = Number(params.get('offset'));
        return respond({
          results: Array.from({ length: Math.min(50, count - offset) }, (_, i) => ({
            tx_id: `0x${offset + i}`,
            tx_status: 'success',
            burn_block_time: 1700000000,
          })),
        });
      }
      active++;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 0));
      active--;
      expect(options?.next?.revalidate).toBe(86400);
      return respond({
        events: [
          {
            contract_log: {
              contract_id: POX_CONTRACT,
              value: {
                repr: '(tuple (topic "calculate-rewards") (total-bond-rewards u1) (stx-cycle u143) (calculation-height u967399))',
              },
            },
          },
          {
            contract_log: {
              contract_id: POX_CONTRACT,
              value: {
                repr: '(tuple (topic "bond-distribution") (bond-index u1) (bond-rewards u1) (bond-staked-sats u10000))',
              },
            },
          },
        ],
      });
    });
    const rewards = await fetchBondRewards('SP000000000000000000002Q6VF78.pox-5', 'mainnet');
    expect(rewards?.byCycle[143]).toBe(BigInt(count));
    expect(rewards?.byBondIndex[1]).toBe(BigInt(count));
    expect(rewards?.settlementsByBond[1]).toHaveLength(count);
    expect(peak).toBeLessThanOrEqual(4);
    if (count === 245) expect(fetchMock).toHaveBeenCalledTimes(250);
  }
);

test.each(['transactions', 'events'])(
  'stops unending %s pagination at the shared request budget',
  async pagination => {
    fetchMock.mockImplementation(async url => {
      const params = new URL(url).searchParams;
      if (params.has('function_name')) {
        const offset = Number(params.get('offset'));
        return respond({
          results: Array.from({ length: pagination === 'transactions' ? 50 : 1 }, (_, i) => ({
            tx_id: `0x${offset + i}`,
            tx_status: 'success',
          })),
        });
      }
      return respond({ events: Array.from({ length: 100 }, () => ({ asset: {} })) });
    });

    await expect(
      fetchBondRewards('SP000000000000000000002Q6VF78.pox-5', 'mainnet')
    ).rejects.toThrow('Reward history request limit exceeded');
    expect(fetchMock).toHaveBeenCalledTimes(250);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  }
);

test('aborts a stalled reward-history request at the deadline', async () => {
  jest.useFakeTimers();
  try {
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
            once: true,
          });
        })
    );
    const result = fetchBondRewards('SP000000000000000000002Q6VF78.pox-5', 'mainnet');
    const rejected = expect(result).rejects.toThrow('Reward history request timed out');
    await jest.advanceTimersByTimeAsync(15_000);
    await rejected;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

test('rejects a repeating reward-history page rather than looping or returning partial totals', async () => {
  fetchMock.mockResolvedValue(
    respond({ results: Array.from({ length: 50 }, (_, i) => ({ tx_id: `0x${i}` })) })
  );
  await expect(fetchBondRewards('SP000000000000000000002Q6VF78.pox-5', 'mainnet')).rejects.toThrow(
    'pagination did not advance'
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('rejects a later reward-history page failure instead of returning the earlier totals', async () => {
  fetchMock.mockImplementation(async url => {
    const offset = Number(new URL(url).searchParams.get('offset'));
    if (offset >= 200) return { ok: false, status: 503 } as Response;
    return respond({
      results: Array.from({ length: 50 }, (_, i) => ({ tx_id: `0x${offset + i}` })),
    });
  });
  await expect(fetchBondRewards('SP000000000000000000002Q6VF78.pox-5', 'mainnet')).rejects.toThrow(
    '503'
  );
});

test('includes every registration using the returned opaque cursor', async () => {
  fetchMock
    .mockResolvedValueOnce(
      respond({
        results: [{ staker: 'first', balances: { btc: '100', stx: '200' } }],
        cursor: { next: '123:0:4' },
      })
    )
    .mockResolvedValueOnce(
      respond({
        results: [{ staker: 'second', balances: { btc: '300', stx: '400' } }],
        cursor: { next: null },
      })
    );

  const registrations = await fetchBondRegistrations(1, 'mainnet');

  expect(registrations.map(row => row.staker)).toEqual(['first', 'second']);
  expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('cursor')).toBe('123:0:4');
});

test('does not return a partial enrollment total when a later page fails', async () => {
  fetchMock
    .mockResolvedValueOnce(
      respond({
        results: [{ staker: 'first', balances: { btc: '100', stx: '200' } }],
        cursor: { next: '123:0:4' },
      })
    )
    .mockResolvedValueOnce({ ok: false, status: 503 } as Response);

  await expect(fetchBondRegistrations(1, 'mainnet')).rejects.toThrow('503');
});

test.each([
  null,
  { cursor: { next: null } },
  { results: {}, cursor: { next: null } },
  { results: [] },
  { results: [], cursor: {} },
  { results: [], cursor: { next: 123 } },
])('rejects a malformed later registration page: %j', async page => {
  fetchMock
    .mockResolvedValueOnce(
      respond({
        results: [{ staker: 'first', balances: { btc: '100', stx: '200' } }],
        cursor: { next: '123:0:4' },
      })
    )
    .mockResolvedValueOnce(respond(page));

  await expect(fetchBondRegistrations(1, 'mainnet')).rejects.toThrow(
    'Invalid registrations page for bond 1'
  );
});

test('accepts a complete empty registration page', async () => {
  fetchMock.mockResolvedValue(respond({ results: [], cursor: { next: null } }));
  await expect(fetchBondRegistrations(1, 'mainnet')).resolves.toEqual([]);
});

test('filters foreign contract logs without losing later event pages', async () => {
  const log = (repr: string) => ({ contract_log: { contract_id: POX_CONTRACT, value: { repr } } });
  fetchMock.mockImplementation(async url => {
    if (url.includes('function_name=')) {
      return respond({
        results: [{ tx_id: '0xabc', tx_status: 'success', burn_block_time: 1700000000 }],
      });
    }
    const offset = Number(new URL(url).searchParams.get('event_offset'));
    return respond({
      event_count: 103,
      events:
        offset === 0
          ? Array.from({ length: 100 }, () => ({
              contract_log: {
                contract_id: 'SP000000000000000000002Q6VF78.other-contract',
                value: {
                  repr: '(tuple (topic "calculate-rewards") (total-bond-rewards u999) (stx-cycle u143) (calculation-height u967399))',
                },
              },
            }))
          : [
              log(
                '(tuple (topic "calculate-rewards") (total-bond-rewards u123) (stx-cycle u143) (calculation-height u967399))'
              ),
              log(
                '(tuple (topic "bond-distribution") (bond-index u1) (bond-rewards u123) (bond-staked-sats u10000))'
              ),
              {
                contract_log: {
                  contract_id: 'SP000000000000000000002Q6VF78.other-contract',
                  value: {
                    repr: '(tuple (topic "bond-distribution") (bond-index u1) (bond-rewards u999))',
                  },
                },
              },
            ],
    });
  });

  await expect(fetchBondRewards('SP000000000000000000002Q6VF78.pox-5', 'mainnet')).resolves.toEqual(
    {
      byBondIndex: { 1: BigInt(123) },
      byCycle: { 143: BigInt(123) },
      lastCalculationHeightByCycle: { 143: 967399 },
      settlementsByBond: {
        1: [
          {
            calculationHeight: 967399,
            timestampMs: 1700000000000,
            principalSats: BigInt(10000),
            rewardedSats: BigInt(123),
          },
        ],
      },
    }
  );
});

test('rejects a truncated event response instead of reporting an incomplete reward total', async () => {
  fetchMock
    .mockResolvedValueOnce(
      respond({ results: [{ tx_id: '0xabc', tx_status: 'success', burn_block_time: 1700000000 }] })
    )
    .mockResolvedValueOnce(respond({ event_count: 10, events: [] }));

  await expect(fetchBondRewards('SP000000000000000000002Q6VF78.pox-5', 'mainnet')).rejects.toThrow(
    'Incomplete events'
  );
});

test('complete empty history is distinguishable from unavailable settlement history', async () => {
  fetchMock.mockResolvedValue(respond({ results: [] }));
  await expect(fetchBondRewards('SP000000000000000000002Q6VF78.pox-5', 'mainnet')).resolves.toEqual(
    {
      byBondIndex: {},
      byCycle: {},
      lastCalculationHeightByCycle: {},
      settlementsByBond: {},
    }
  );
});

test('zero-credit settlement is recorded with the transaction timestamp', async () => {
  fetchMock.mockImplementation(async url => {
    if (url.includes('function_name='))
      return respond({
        results: [{ tx_id: '0xzero', tx_status: 'success', block_time: 200, burn_block_time: 100 }],
      });
    return respond({
      event_count: 2,
      events: [
        {
          contract_log: {
            contract_id: POX_CONTRACT,
            value: {
              repr: '(tuple (topic "calculate-rewards") (total-bond-rewards u0) (stx-cycle u143) (calculation-height u967399))',
            },
          },
        },
        {
          contract_log: {
            contract_id: POX_CONTRACT,
            value: {
              repr: '(tuple (topic "bond-distribution") (bond-index u1) (bond-rewards u0))',
            },
          },
        },
      ],
    });
  });
  const rewards = await fetchBondRewards('SP000000000000000000002Q6VF78.pox-5', 'mainnet');
  expect(rewards?.byBondIndex[1]).toBe(BigInt(0));
  expect(rewards?.settlementsByBond[1]).toEqual([
    {
      calculationHeight: 967399,
      timestampMs: 200000,
      principalSats: undefined,
      rewardedSats: BigInt(0),
    },
  ]);
});
