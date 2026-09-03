import { readCumulativePaidSats, readTopic, readUint } from '../data';

const BOND_DISTRIBUTION =
  '(tuple (accrued-rewards-per-sat u2000000000000000) (bond-index u306) (bond-rewards u400) ' +
  '(bond-staked-sats u200000) (cumulative-rewards-per-sat u4000000000000000) ' +
  '(target-yield u400) (topic "bond-distribution"))';

const REGISTER_FOR_BOND =
  '(tuple (amount-ustx u50000) (bond-index u306) (btc-lockup (tuple (txs (some (list ' +
  '(tuple (output-index u0) (txid 0x4558)))))) (type "l1"))) (first-reward-cycle u623) ' +
  "(is-l1-lock true) (sats-total u100000) (signer 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0.signer-manager)";

describe('readTopic', () => {
  test('identifies a distribution event', () => {
    expect(readTopic(BOND_DISTRIBUTION)).toBe('bond-distribution');
  });

  test('is undefined when a tuple carries no topic', () => {
    expect(readTopic(REGISTER_FOR_BOND)).toBeUndefined();
  });
});

describe('readUint', () => {
  test('pulls out the fields the feed displays', () => {
    expect(readUint(BOND_DISTRIBUTION, 'bond-index')).toBe(BigInt(306));
    expect(readUint(BOND_DISTRIBUTION, 'bond-rewards')).toBe(BigInt(400));
    expect(readUint(BOND_DISTRIBUTION, 'bond-staked-sats')).toBe(BigInt(200000));
  });

  test('does not confuse one key for another that contains it', () => {
    expect(readUint(BOND_DISTRIBUTION, 'cumulative-rewards-per-sat')).toBe(
      BigInt('4000000000000000')
    );
    expect(readUint(BOND_DISTRIBUTION, 'accrued-rewards-per-sat')).toBe(BigInt('2000000000000000'));
  });

  test('reads fields from other event shapes too', () => {
    expect(readUint(REGISTER_FOR_BOND, 'sats-total')).toBe(BigInt(100000));
    expect(readUint(REGISTER_FOR_BOND, 'amount-ustx')).toBe(BigInt(50000));
  });

  test('is undefined for a key that is not present', () => {
    expect(readUint(BOND_DISTRIBUTION, 'not-a-field')).toBeUndefined();
  });
});

describe('readCumulativePaidSats', () => {
  test('multiplies the per-sat rate back out by what the bond holds', () => {
    expect(readCumulativePaidSats(BOND_DISTRIBUTION)).toBe(BigInt(800));
  });

  test('is at least the amount of the distribution that produced it', () => {
    const cumulative = readCumulativePaidSats(BOND_DISTRIBUTION);
    const thisDistribution = readUint(BOND_DISTRIBUTION, 'bond-rewards');
    expect(cumulative).toBeGreaterThanOrEqual(thisDistribution!);
  });

  test('is undefined for an event that reports no rewards', () => {
    expect(readCumulativePaidSats(REGISTER_FOR_BOND)).toBeUndefined();
  });
});
