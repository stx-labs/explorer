import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { logError } from '@/common/utils/error-utils';

import {
  createRewardHistoryDeadline,
  fetchBondRewards,
  fetchCycleCalculationHeights,
  fetchCycleRewards,
} from '../data';

jest.mock('@/api/stacksAPIFetch');
jest.mock('@/common/utils/error-utils', () => ({
  ...jest.requireActual('@/common/utils/error-utils'),
  logError: jest.fn(),
}));
const fetchMock = jest.mocked(stacksAPIFetch);
const contract = 'SP000000000000000000002Q6VF78.pox-5';
const respond = (body: unknown) => ({ ok: true, json: async () => body }) as Response;
const summary = {
  number: 143,
  status: 'finished',
  locked: {
    stx: { stx_only: '438005558960464', bonds: '3570465300381', total: '441576024260845' },
  },
  rewards: {
    btc: {
      total: '493262476',
      claimed: '403265626',
      waterfall: {
        stx_only: '395795729',
        bonds: '27620444',
        reserve_deposit: '69846303',
      },
    },
  },
};
const distribution = (index = 1, id = '0xabc', height = 968449) => ({
  name: 'bond-distribution',
  bond_index: index,
  transaction: { tx_id: id, event_index: 0 },
  block: { time: 1790284217 },
  bitcoin_block: { height: 968451, time: 1790283979 },
  data: {
    calculation: { bitcoin_height: height, reward_cycle: 143 },
    rewards: { btc: '13810222' },
    staked: { btc: '23017037628' },
  },
});
const page = (results: unknown[], next: string | null = null) => ({
  results,
  total: results.length,
  cursor: { next },
});
const calculationTx = (tx_id: string, tx_status = 'success') => ({ tx_id, tx_status });
const calculationLog = (cycle: number, height: number, contract_id = contract) => ({
  contract_log: {
    contract_id,
    value: {
      repr: `(tuple (topic "calculate-rewards") (stx-cycle u${cycle}) (calculation-height u${height}))`,
    },
  },
});

const stalledRequest: typeof stacksAPIFetch = (_url, options) =>
  new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
      once: true,
    });
  });

beforeEach(() => fetchMock.mockReset());

test('uses the exact STX-only summary amounts and explicit cycle on the selected API', async () => {
  fetchMock.mockResolvedValue(respond(summary));
  await expect(
    fetchCycleRewards([143, 143], 'testnet', 'https://api.example.test')
  ).resolves.toEqual({
    143: {
      cycleNumber: 143,
      stakedMicroStx: BigInt('438005558960464'),
      rewardsSats: BigInt('395795729'),
    },
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://api.example.test/extended/v3/staking/cycles/143'
  );
  expect(fetchMock.mock.calls[0][1]?.next?.revalidate).toBe(60);
});

test('a known zero-stake cycle remains distinct from missing data', async () => {
  fetchMock.mockResolvedValue(
    respond({
      ...summary,
      locked: { stx: { stx_only: '0' } },
      rewards: { btc: { waterfall: { stx_only: '0' } } },
    })
  );
  await expect(fetchCycleRewards([143], 'mainnet')).resolves.toEqual({
    143: { cycleNumber: 143, stakedMicroStx: BigInt(0), rewardsSats: BigInt(0) },
  });
});

test.each([undefined, null, '', '-1', '1.2', 100])(
  'rejects invalid cycle amounts: %p',
  async amount => {
    fetchMock.mockResolvedValue(respond({ ...summary, locked: { stx: { stx_only: amount } } }));
    await expect(fetchCycleRewards([143], 'mainnet')).rejects.toThrow('Invalid staking amount');
  }
);

test('rejects a mismatched cycle', async () => {
  fetchMock.mockResolvedValueOnce(respond({ ...summary, number: 144 }));
  await expect(fetchCycleRewards([143], 'mainnet')).rejects.toThrow('another cycle');
});

test('falls back to contract reads when the cycle endpoint has not been deployed', async () => {
  const uint = (value: bigint) =>
    respond({ okay: true, result: `0x01${value.toString(16).padStart(32, '0')}` });
  fetchMock
    .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
    .mockResolvedValueOnce(uint(BigInt('1000000000000')))
    .mockResolvedValueOnce(uint(BigInt('2000000')));
  await expect(fetchCycleRewards([24], 'testnet', undefined, contract)).resolves.toEqual({
    24: { cycleNumber: 24, stakedMicroStx: BigInt(2000000), rewardsSats: BigInt(2) },
  });
  expect(fetchMock.mock.calls[1][0]).toContain('/get-rewards-per-token-for-cycle');
  expect(fetchMock.mock.calls[2][0]).toContain('/get-total-shares-staked-for-cycle');
});

test('does not mask cycle endpoint failures with the compatibility fallback', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, status: 503 } as Response);
  await expect(fetchCycleRewards([143], 'mainnet', undefined, contract)).rejects.toThrow('503');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('falls back to complete calculation history on deployments without bond events', async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
    .mockResolvedValueOnce(
      respond({
        results: [calculationTx('0xsuccess'), calculationTx('0xfailed', 'abort_by_response')],
      })
    )
    .mockResolvedValueOnce(
      respond({
        events: [
          calculationLog(143, 968449),
          {
            contract_log: {
              contract_id: contract,
              value: {
                repr: '(tuple (topic "bond-distribution") (bond-index u1) (bond-rewards u13810222) (bond-staked-sats u23017037628))',
              },
            },
          },
        ],
      })
    );
  const result = await fetchBondRewards([1], 'testnet', undefined, contract);
  expect(result.byBondIndex[1]).toBe(BigInt(13810222));
  expect(result.settlementsByBond[1][0]).toMatchObject({
    calculationHeight: 968449,
    principalSats: BigInt(23017037628),
    rewardedSats: BigInt(13810222),
  });
  expect(result.lastCalculationHeightByCycle).toEqual({ 143: 968449 });
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test('does not mask bond endpoint failures with the compatibility fallback', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, status: 503 } as Response);
  await expect(fetchBondRewards([1], 'mainnet', undefined, contract)).rejects.toThrow('503');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('reads all event pages, ignores other event kinds, and deduplicates overlaps', async () => {
  const first = distribution();
  fetchMock
    .mockResolvedValueOnce(
      respond(
        page(
          [{ ...distribution(1, '0xregistration'), name: 'register-for-bond', data: {} }, first],
          '8893725:2147483647:0:1'
        )
      )
    )
    .mockResolvedValueOnce(respond(page([first, distribution(1, '0xolder', 967399)])));
  const result = await fetchBondRewards([1, 1], 'testnet', 'https://api.example.test');
  expect(result.byBondIndex).toEqual({ 1: BigInt(27620444) });
  expect(result.lastCalculationHeightByCycle).toEqual({ 143: 968449 });
  expect(result.settlementsByBond[1]).toEqual([
    {
      calculationHeight: 968449,
      timestampMs: 1790284217000,
      principalSats: BigInt(23017037628),
      rewardedSats: BigInt(13810222),
    },
    {
      calculationHeight: 967399,
      timestampMs: 1790284217000,
      principalSats: BigInt(23017037628),
      rewardedSats: BigInt(13810222),
    },
  ]);
  const url = new URL(fetchMock.mock.calls[1][0]);
  expect(url.origin).toBe('https://api.example.test');
  expect(url.pathname).toBe('/extended/v3/staking/bonds/1/events');
  expect(url.searchParams.get('cursor')).toBe('8893725:2147483647:0:1');
});

test('keeps zero-credit settlements and integer precision above the safe number range', async () => {
  const event = distribution();
  event.data.rewards.btc = '0';
  event.data.staked.btc = '9007199254740993';
  fetchMock.mockResolvedValue(respond(page([event])));
  const result = await fetchBondRewards([1], 'mainnet');
  expect(result.byBondIndex[1]).toBe(BigInt(0));
  expect(result.settlementsByBond[1][0].principalSats).toBe(BigInt('9007199254740993'));
  expect(result.lastCalculationHeightByCycle[143]).toBe(968449);
});

test('complete empty histories are known zero rewards', async () => {
  fetchMock.mockResolvedValue(respond(page([])));
  await expect(fetchBondRewards([1], 'mainnet')).resolves.toEqual({
    byBondIndex: { 1: BigInt(0) },
    settlementsByBond: { 1: [] },
    lastCalculationHeightByCycle: {},
  });
});

test.each([
  null,
  {},
  { results: [] },
  { results: [], cursor: {} },
  page([{ ...distribution(), data: {} }]),
  page([
    {
      ...distribution(),
      data: { ...distribution().data, calculation: { bitcoin_height: NaN, reward_cycle: 143 } },
    },
  ]),
  page([{ ...distribution(), data: { ...distribution().data, rewards: {} } }]),
  page([distribution(2)]),
])('rejects malformed bond history rather than reporting zero: %j', async response => {
  fetchMock.mockResolvedValue(respond(response));
  await expect(fetchBondRewards([1], 'mainnet')).rejects.toThrow();
});

test('rejects conflicting duplicate events', async () => {
  fetchMock
    .mockResolvedValueOnce(respond(page([distribution()], 'next')))
    .mockResolvedValueOnce(respond(page([distribution(1, '0xabc', 967399)])));
  await expect(fetchBondRewards([1], 'mainnet')).rejects.toThrow('Conflicting');
});

test('a later page failure never returns partial reward totals', async () => {
  fetchMock
    .mockResolvedValueOnce(respond(page([distribution()], 'next')))
    .mockResolvedValueOnce({ ok: false, status: 503 } as Response);
  await expect(fetchBondRewards([1], 'mainnet')).rejects.toThrow('503');
});

test('a prematurely terminated history cannot be mistaken for complete rewards', async () => {
  fetchMock.mockResolvedValue(respond({ ...page([distribution()]), total: 2 }));
  await expect(fetchBondRewards([1], 'mainnet')).rejects.toThrow('Incomplete events');
});

test('rejects repeated cursors instead of looping', async () => {
  fetchMock.mockResolvedValue(respond(page([distribution()], 'next')));
  await expect(fetchBondRewards([1], 'mainnet')).rejects.toThrow('pagination did not advance');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('bounds concurrent histories and requests only the supplied bonds', async () => {
  let active = 0;
  let peak = 0;
  fetchMock.mockImplementation(async () => {
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 0));
    active--;
    return respond(page([]));
  });
  await fetchBondRewards([1, 2, 3, 4, 5, 6], 'mainnet');
  expect(peak).toBeLessThanOrEqual(4);
  expect(fetchMock).toHaveBeenCalledTimes(6);
});

test('stops unending cursor pagination at the shared request budget', async () => {
  let index = 0;
  fetchMock.mockImplementation(async () =>
    respond(page([distribution(1, `0x${++index}`)], String(index)))
  );
  await expect(fetchBondRewards([1], 'mainnet')).rejects.toThrow('request limit exceeded');
  expect(fetchMock).toHaveBeenCalledTimes(250);
  expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
});

test('aborts stalled reward history at the deadline', async () => {
  jest.useFakeTimers();
  try {
    fetchMock.mockImplementation(stalledRequest);
    const rejected = expect(fetchBondRewards([1], 'mainnet')).rejects.toThrow('timed out');
    await jest.advanceTimersByTimeAsync(15000);
    await rejected;
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

test('final bond calculations avoid the transaction fallback entirely', async () => {
  await expect(
    fetchCycleCalculationHeights({ 143: 968449 }, contract, 'mainnet', undefined, { 143: 968449 })
  ).resolves.toEqual({ 143: 968449 });
  expect(fetchMock).not.toHaveBeenCalled();
});

test('bond history and settlement share one deadline and retain verified cycle heights', async () => {
  jest.useFakeTimers();
  try {
    const deadline = createRewardHistoryDeadline();
    fetchMock.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve(respond(page([distribution()]))), 10000);
        })
    );
    const bondRequest = fetchBondRewards([1], 'mainnet', undefined, contract, deadline);
    await jest.advanceTimersByTimeAsync(10000);
    const bonds = await bondRequest;
    expect(bonds.byBondIndex[1]).toBe(BigInt(13810222));

    fetchMock
      .mockResolvedValueOnce(
        respond({ results: [calculationTx('0xverified'), calculationTx('0xstalled')] })
      )
      .mockResolvedValueOnce(respond({ events: [calculationLog(142, 966349)] }))
      .mockImplementationOnce(stalledRequest);
    let finished = false;
    const settlement = fetchCycleCalculationHeights(
      { 141: 964249, 142: 966349, 143: 968449 },
      contract,
      'mainnet',
      undefined,
      bonds.lastCalculationHeightByCycle,
      deadline
    ).then(heights => {
      finished = true;
      return heights;
    });
    await jest.advanceTimersByTimeAsync(4999);
    expect(finished).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await expect(settlement).resolves.toEqual({ 142: 966349, 143: 968449 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][1]?.signal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

test('a slow 404 does not give the legacy bond fallback a fresh timeout', async () => {
  jest.useFakeTimers();
  try {
    fetchMock
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve({ ok: false, status: 404 } as Response), 10000);
          })
      )
      .mockImplementationOnce(stalledRequest);
    const rejected = expect(fetchBondRewards([1], 'testnet', undefined, contract)).rejects.toThrow(
      'timed out'
    );
    await jest.advanceTimersByTimeAsync(10000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(5000);
    await rejected;
    expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

test('expired deadlines skip all requests and preserve known settlement heights', async () => {
  jest.mocked(logError).mockClear();
  const deadline = Date.now() - 1;
  await expect(fetchBondRewards([1], 'mainnet', undefined, contract, deadline)).rejects.toThrow(
    'timed out'
  );
  await expect(
    fetchCycleCalculationHeights(
      { 142: 966349, 143: 968449 },
      contract,
      'mainnet',
      undefined,
      { 143: 968449 },
      deadline
    )
  ).resolves.toEqual({ 143: 968449 });
  expect(fetchMock).not.toHaveBeenCalled();
  expect(logError).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'RewardHistoryTimeout' }),
    expect.any(String),
    { chain: 'mainnet' },
    'warning'
  );
});

test('verifies a cycle without bonds, ignores failed calculations and foreign logs', async () => {
  fetchMock
    .mockResolvedValueOnce(
      respond({
        results: [calculationTx('0xfailed', 'abort_by_response'), calculationTx('0xsuccess')],
      })
    )
    .mockResolvedValueOnce(
      respond({ events: [calculationLog(142, 999999, 'SP.other'), calculationLog(142, 966349)] })
    );
  await expect(
    fetchCycleCalculationHeights({ 142: 966349, 143: 968449 }, contract, 'mainnet', undefined, {
      143: 968449,
    })
  ).resolves.toEqual({ 142: 966349, 143: 968449 });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][0]).toContain('/tx/0xsuccess?');
});

test('mid-cycle calculation cannot stand in for the final calculation', async () => {
  fetchMock
    .mockResolvedValueOnce(respond({ results: [calculationTx('0xmid')] }))
    .mockResolvedValueOnce(respond({ events: [calculationLog(143, 967399)] }));
  await expect(fetchCycleCalculationHeights({ 143: 968449 }, contract, 'mainnet')).resolves.toEqual(
    { 143: 967399 }
  );
});

test('settlement fallback reads later event pages and rejects truncated logs', async () => {
  fetchMock
    .mockResolvedValueOnce(respond({ results: [calculationTx('0xsuccess')] }))
    .mockResolvedValueOnce(
      respond({ event_count: 101, events: Array.from({ length: 100 }, () => ({})) })
    )
    .mockResolvedValueOnce(respond({ event_count: 101, events: [calculationLog(143, 968449)] }));
  await expect(fetchCycleCalculationHeights({ 143: 968449 }, contract, 'mainnet')).resolves.toEqual(
    { 143: 968449 }
  );
  fetchMock
    .mockResolvedValueOnce(respond({ results: [calculationTx('0xtruncated')] }))
    .mockResolvedValueOnce(respond({ event_count: 10, events: [] }));
  await expect(fetchCycleCalculationHeights({ 143: 968449 }, contract, 'mainnet')).rejects.toThrow(
    'Incomplete events'
  );
});
