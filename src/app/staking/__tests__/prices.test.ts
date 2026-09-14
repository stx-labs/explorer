import { toCycleRow } from '../cycleColumns';
import { getCyclePrices } from '../prices';

const endedMs = Date.UTC(2026, 8, 1);
const prices = {
  btc: new Map([
    ['2026-09-01', 100000],
    ['2026-08-31', 90000],
  ]),
  stx: new Map([['2026-08-31', 1]]),
};

test('historical BTC and STX prices come from the same day', () => {
  expect(getCyclePrices(prices, endedMs)).toEqual({ btcPriceUsd: 90000, stxPriceUsd: 1 });
});

test('a single historical asset never becomes a mixed historical/current pair', () => {
  expect(getCyclePrices({ ...prices, stx: new Map() }, endedMs)).toEqual({});
});

const input = {
  cycle: {
    cycle_number: 141,
    block_height: 0,
    total_weight: 1,
    total_stacked_amount: '1000000',
    total_signers: 1,
  },
  rewards: {
    cycleNumber: 141,
    rewardsPerMicroStx: BigInt('1000000000000'),
    stakedMicroStx: BigInt('1000000'),
  },
  pox5FirstCycleId: 141,
  cycleStartHeight: (cycle: number) => cycle * 2100,
  currentBurnHeight: 142 * 2100,
  nowMs: endedMs,
  burnBlockTimes: { [142 * 2100]: endedMs },
  lastCalculationHeightByCycle: { 141: 142 * 2100 - 1 },
  btcPrice: 100000,
  stxPrice: 1,
};

test('a settled cycle retains percentage APY with a labeled current-price fallback', () => {
  const row = toCycleRow({ ...input, prices: { ...prices, stx: new Map() } });
  // One sat/STX at these prices is 0.1% per cycle, compounded over about 25.03 cycles/year.
  expect(row.apyPercent).toBeCloseTo(2.53315928, 6);
  expect(row.yieldEstimated).toBe(true);
});

test('matched historical prices take precedence over current market prices', () => {
  const row = toCycleRow({ ...input, prices });
  const changedMarket = toCycleRow({ ...input, prices, btcPrice: 200000, stxPrice: 2 });
  expect(row.apyPercent).toBe(changedMarket.apyPercent);
  expect(row.yieldEstimated).toBe(false);
});

test('an unverified final calculation does not produce a completed-cycle APY', () => {
  expect(
    toCycleRow({ ...input, lastCalculationHeightByCycle: undefined }).apyPercent
  ).toBeUndefined();
});
