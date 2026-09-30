import { bondPageHref, clampBondPage, parseBondPage } from '../bonds/pagination';
import { getBondProjections, getTimelineBondWindow } from '../projections';
import bond from './fixtures/bond.json';

test.each([
  [undefined, 0],
  ['1', 0],
  ['2', 1],
  ['999', 998],
  ['-1', 0],
  ['1.5', 0],
  ['2junk', 0],
  ['NaN', 0],
  ['Infinity', 0],
  ['9007199254740992', 0],
])('parses page %s safely', (value, expected) => {
  expect(parseBondPage(value)).toBe(expected);
});

test('clamps against row counts, including an empty list and a short final page', () => {
  expect(clampBondPage(998, 45)).toBe(2);
  expect(clampBondPage(998, 0)).toBe(0);
  expect(clampBondPage(0, 45)).toBe(0);
});

test('canonical page links retain network/API settings and do not mutate the input', () => {
  const params = new URLSearchParams('chain=testnet&api=https%3A%2F%2Fexample.test&page=999');
  expect(bondPageHref(params, 0)).toBe(
    '/staking/bonds?chain=testnet&api=https%3A%2F%2Fexample.test'
  );
  expect(bondPageHref(params, 2)).toContain('&page=3');
  expect(params.get('page')).toBe('999');
});

test('on-chain next bond takes precedence over projections from the featured bond', () => {
  const next = {
    ...bond,
    index: 4,
    status: 'upcoming',
    schedule: {
      activation: { bitcoin_height: 12000, pox_cycle: 13 },
      unlock: { bitcoin_height: 22800, pox_cycle: 25 },
    },
  };
  const result = getBondProjections([next, bond], 900);
  expect(result.featuredIndex).toBe(3);
  expect(result.nextBond).toEqual({ index: 4, activationHeight: 12000, termEndHeight: 22800 });
  expect(result.scheduledBonds[0]).toEqual({
    index: 5,
    activationHeight: 13800,
    termEndHeight: 24600,
  });
});

test('projects the next missing bond and handles unknown cycle length or an empty chain', () => {
  expect(getBondProjections([bond], 900).nextBond).toEqual({
    index: 4,
    activationHeight: 10800,
    termEndHeight: 21600,
  });
  expect(getBondProjections([bond], 0).nextBond).toBeUndefined();
  expect(getBondProjections([], 900)).toEqual({
    featuredIndex: undefined,
    featuredBond: undefined,
    nextBond: undefined,
    scheduledBonds: [],
  });
});

test('timeline window contains five neighbors on each side without mutating input', () => {
  const bonds = Array.from({ length: 30 }, (_, index) => ({ ...bond, index: 30 - index }));
  const { onChain, forwardOnChain } = getTimelineBondWindow(bonds, 20, 0);
  expect(onChain.map(bond => bond.index)).toEqual([15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
  expect(forwardOnChain).toBe(6);
  expect(bonds[0].index).toBe(30);
});
