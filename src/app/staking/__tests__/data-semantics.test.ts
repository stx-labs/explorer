import { stacksAPIFetch } from '@/api/stacksAPIFetch';

import { MAINNET_HISTORIC_CYCLES } from '../consts';
import { toCycleRow } from '../cycleColumns';
import { fetchBurnBlockTimes } from '../data';
import { getBondLifecycleState, getBondSchedule } from '../projections';
import { formatBurnDate } from '../utils';

jest.mock('@/api/stacksAPIFetch');
const fetchMock = stacksAPIFetch as jest.MockedFunction<typeof stacksAPIFetch>;

const cycle = {
  cycle_number: 143,
  block_height: 100,
  total_weight: 1,
  total_stacked_amount: '999000000',
  total_signers: 1,
};
const input = {
  cycle,
  rewards: {
    cycleNumber: 143,
    rewardsPerMicroStx: BigInt('1000000000000'),
    stakedMicroStx: BigInt('2000000'),
  },
  pox5FirstCycleId: 141,
  cycleStartHeight: (n: number) => 666050 + n * 2100,
  burnBlockTimes: {},
  currentBurnHeight: 968450,
  nowMs: Date.UTC(2026, 8, 8),
};

test('matches STX-only stake to its tranche instead of the combined API total', () => {
  const row = toCycleRow(input);
  expect(row.totalStackedStx).toBe(2);
  expect(row.rewardsSats).toBe(BigInt(2));
  expect(row.satsPerStx).toBe(1);
});

test('does not call an ended cycle settled before its final calculation', () => {
  const end = input.cycleStartHeight(144);
  expect(toCycleRow(input).settled).toBe(false);
  expect(toCycleRow({ ...input, lastCalculationHeightByCycle: { 143: end - 1051 } }).settled).toBe(
    false
  );
  expect(toCycleRow({ ...input, lastCalculationHeightByCycle: { 143: end - 1 } }).settled).toBe(
    true
  );
});

test('a zero-share STX tranche stays zero instead of receiving a projected residual', () => {
  const row = toCycleRow({
    ...input,
    rewards: { ...input.rewards, stakedMicroStx: BigInt(0), rewardsPerMicroStx: BigInt(0) },
  });
  expect(row.totalStackedStx).toBe(0);
  expect(row.rewardsSats).toBe(BigInt(0));
});

test('missing PoX-5 rewards do not fall back to combined stake', () => {
  expect(toCycleRow({ ...input, rewards: undefined }).totalStackedStx).toBeUndefined();
});

test.each([
  [140, 2.72, 7.72],
  [139, 2.79, 5.76],
])('preserves stacking-tracker rewards and gross yield for cycle %i', (cycleNumber, btc, apy) => {
  const row = toCycleRow({
    ...input,
    cycle: { ...cycle, cycle_number: cycleNumber },
    historic: MAINNET_HISTORIC_CYCLES,
  });
  expect(row.historic).toEqual({ rewardsBtc: btc, apyPercent: apy });
  expect(row.totalStackedStx).toBe(999);
  expect(row.hasRewardData).toBe(false);
  expect(row.satsPerStx).toBeUndefined();
});

test('historical snapshots never replace PoX-5 data or leak into a network without history', () => {
  const testnet = toCycleRow({
    ...input,
    cycle: { ...cycle, cycle_number: 140 },
    pox5FirstCycleId: 4,
  });
  expect(testnet.historic).toBeUndefined();
  const current = toCycleRow({ ...input, historic: { 143: MAINNET_HISTORIC_CYCLES[140] } });
  expect(current.historic).toBeUndefined();
  expect(current.totalStackedStx).toBe(2);
});

test('enrollment closes at the prepare-phase cutoff before activation', () => {
  const schedule = getBondSchedule(966350, 991550, 2100, 100);
  expect(getBondLifecycleState(schedule, 966249, true)).toBe('enrolling');
  expect(getBondLifecycleState(schedule, 966250, true)).toBe('awaitingActivation');
  expect(getBondLifecycleState(schedule, 966350, true)).toBe('active');
});

test('missing block timestamps use marked estimates and fetched timestamps remain exact', () => {
  const now = Date.UTC(2026, 8, 8);
  expect(formatBurnDate(100, 200, now)).toMatch(/^~/);
  expect(formatBurnDate(100, 300, now + 86400000)).toMatch(/^~/);
  expect(formatBurnDate(300, 200, now)).toMatch(/^~/);
  expect(formatBurnDate(100, 200, now, { 100: now - 86400000 })).not.toMatch(/^~/);
  const row = toCycleRow(input);
  expect(row.startedDate).toMatch(/^~/);
  expect(row.endedDate).toMatch(/^~/);
  const exact = toCycleRow({
    ...input,
    burnBlockTimes: { [input.cycleStartHeight(143)]: now },
  });
  expect(exact.startedDate).not.toMatch(/^~/);
});

test('timestamp retrieval deduplicates exact mined heights and never probes adjacent blocks', async () => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ burn_block_time: 123 }),
  } as Response);
  const times = await fetchBurnBlockTimes([100, 100, 200, 300], 250, 'mainnet');
  expect(times).toEqual({ 200: 123000 });
  expect(fetchMock.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
    '/extended/v2/burn-blocks/100',
    '/extended/v2/burn-blocks/200',
  ]);
});
