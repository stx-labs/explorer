import type { Bond, BondRewards } from '../data';
import {
  estimatePendingStackerRewards,
  getRealizedBondRate,
  projectCycleRewards,
} from '../reward-metrics';
import bondFixture from './fixtures/bond.json';

const bond: Bond = {
  ...bondFixture,
  schedule: {
    activation: { bitcoin_height: 1000, pox_cycle: 0 },
    unlock: { bitcoin_height: 26200, pox_cycle: 12 },
  },
};
const history = (): BondRewards['settlementsByBond'][number] =>
  Array.from({ length: 24 }, (_, index) => ({
    calculationHeight: 1000 + (index + 1) * 1050 - 1,
    timestampMs: index,
    principalSats: BigInt(index < 12 ? 10000000000 : 5000000000),
    rewardedSats: BigInt(index < 12 ? 6000000 : 3000000),
  }));

test('projects the observed reward pace through the full cycle without adding credits twice', () => {
  expect(projectCycleRewards(BigInt(150000000), 1050, 2100)).toBe(BigInt(300000000));
  expect(projectCycleRewards(BigInt(300000000), 2100, 2100)).toBe(BigInt(300000000));
  expect(projectCycleRewards(BigInt(0), 100, 2100)).toBe(BigInt(0));
});

test.each([0, -1, 2101, Number.NaN, 1.5])(
  'does not project from an invalid elapsed block count: %s',
  elapsed => {
    expect(projectCycleRewards(BigInt(100), elapsed, 2100)).toBeUndefined();
  }
);

test('weights the annualized rate by historical eligible principal, independent of withdrawals', () => {
  expect(getRealizedBondRate(bond, 26200, history()).percent).toBe(3);
  const withdrawn = {
    ...bond,
    balances: { ...bond.balances, locked: { ...bond.balances.locked, btc: '0' } },
  };
  expect(getRealizedBondRate(withdrawn, 30000, history()).percent).toBe(3);
});

test('requires the term and all 24 calculation intervals to be complete', () => {
  expect(getRealizedBondRate(bond, 26199, history()).percent).toBeUndefined();
  expect(getRealizedBondRate(bond, 26200, history().slice(1)).percent).toBeUndefined();
  expect(
    getRealizedBondRate(
      bond,
      26200,
      history().map(entry => ({ ...entry, principalSats: undefined }))
    ).percent
  ).toBeUndefined();
});

test('distinguishes zero credits from an undefined rate without principal', () => {
  expect(
    getRealizedBondRate(
      bond,
      26200,
      history().map(entry => ({ ...entry, rewardedSats: BigInt(0) }))
    ).percent
  ).toBe(0);
  expect(
    getRealizedBondRate(
      bond,
      26200,
      history().map(entry => ({ ...entry, rewardedSats: BigInt(0), principalSats: BigInt(0) }))
    ).percent
  ).toBeUndefined();
});

test('deduplicates identical slots and rejects conflicting records', () => {
  expect(getRealizedBondRate(bond, 26200, [...history(), history()[0]]).percent).toBe(3);
  expect(
    getRealizedBondRate(bond, 26200, [...history(), { ...history()[0], rewardedSats: BigInt(1) }])
      .percent
  ).toBeUndefined();
});

test('reserves the full bond targets before estimating the STX share', () => {
  const targets = [{ principalSats: BigInt(100000000), targetRateBps: BigInt(300) }];
  expect(estimatePendingStackerRewards(BigInt(100000), BigInt(1), targets)).toBe(BigInt(34000));
  expect(estimatePendingStackerRewards(BigInt(50000), BigInt(1), targets)).toBe(BigInt(0));
  expect(estimatePendingStackerRewards(BigInt(100000), BigInt(0), targets)).toBe(BigInt(0));
});

test('matches contract integer rounding and rejects invalid inputs', () => {
  expect(estimatePendingStackerRewards(BigInt(1), BigInt(1), [])).toBe(BigInt(1));
  expect(() => estimatePendingStackerRewards(BigInt(-1), BigInt(1), [])).toThrow();
});
