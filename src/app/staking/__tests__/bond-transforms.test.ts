import { toBondRow } from '../BondsTable';
import { Bond } from '../data';
import {
  aggregateBondTotals,
  formatBtc,
  formatUsd,
  getBondDisplayName,
  isBondPending,
} from '../utils';
import testnetBonds from './fixtures/testnet-bonds.json';

/**
 * Captured verbatim from /extended/v3/staking/bonds on testnet, which is the
 * only network with real bonds today (mainnet returns an empty list). These
 * assert against the actual payload shape rather than a hand-written mock.
 */
const bonds = testnetBonds as unknown as Bond[];

// Testnet was at this burn height when the fixture was captured. A fixed "now"
// keeps the projected dates deterministic across test runs.
const CURRENT_BURN_HEIGHT = 9508;
const NOW_MS = Date.UTC(2026, 7, 25, 19, 0, 0);
const toRow = (bond: Bond) => toBondRow(bond, CURRENT_BURN_HEIGHT, NOW_MS);

describe('bond fixtures', () => {
  test('cover both observed statuses', () => {
    const statuses = new Set(bonds.map(b => b.status));
    expect(statuses.has('upcoming')).toBe(true);
    expect(statuses.has('active')).toBe(true);
  });
});

describe('toBondRow', () => {
  test('maps an active bond with balances', () => {
    const bond = bonds.find(b => b.index === 3)!;
    const row = toRow(bond);
    expect(row.name).toBe('Bond 3');
    expect(row.status).toBe('Active');
    expect(row.isPending).toBe(false);
    expect(row.activationHeight).toBe(9000);
    expect(row.unlockHeight).toBe(19800);
    expect(row.activationCycle).toBe(10);
    expect(row.unlockCycle).toBe(22);
    expect(row.lockedSats).toBe(BigInt(19500));
    expect(row.capacitySats).toBe(BigInt(13686724000));
    expect(row.targetRatePercent).toBe(10);
    expect(row.registeredCount).toBe(1);
    expect(row.allowedCount).toBe(87);
  });

  test('marks an upcoming bond as pending rather than empty', () => {
    const bond = bonds.find(b => b.index === 4)!;
    const row = toRow(bond);
    // An upcoming bond has full parameters but no balances yet. That is a
    // different thing from an active bond nobody has staked into, and the UI
    // renders it as a dash rather than a hard zero.
    expect(row.isPending).toBe(true);
    expect(row.capacitySats).toBe(BigInt(13986724000));
    expect(row.lockedSats).toBe(BigInt(0));
  });

  test('term spans 12 pox cycles', () => {
    bonds.forEach(bond => {
      const row = toRow(bond);
      expect(row.unlockCycle - row.activationCycle).toBe(12);
    });
  });

  test('projects rough dates for the term from block heights', () => {
    const row = toRow(bonds.find(b => b.index === 3)!);
    const TEN_MIN = 10 * 60 * 1000;
    // Activation is 508 blocks behind the current height, so it is in the past.
    expect(row.activationMs).toBe(NOW_MS + (9000 - CURRENT_BURN_HEIGHT) * TEN_MIN);
    expect(row.activationMs).toBeLessThan(NOW_MS);
    // Unlock is 10,292 blocks ahead.
    expect(row.unlockMs).toBe(NOW_MS + (19800 - CURRENT_BURN_HEIGHT) * TEN_MIN);
    expect(row.unlockMs).toBeGreaterThan(NOW_MS);
  });
});

describe('aggregateBondTotals', () => {
  test('sums balances across every bond', () => {
    const totals = aggregateBondTotals(bonds);
    // Only bond 3 currently holds anything on testnet.
    expect(totals.lockedSats).toBe(BigInt(19500));
    expect(totals.lockedMicroStx).toBe(BigInt(1009750));
    expect(totals.paidOutSats).toBe(BigInt(0));
    expect(totals.capacitySats).toBeGreaterThan(BigInt(0));
  });

  test('tolerates an empty bond list, as mainnet returns today', () => {
    const totals = aggregateBondTotals([]);
    expect(totals.lockedSats).toBe(BigInt(0));
    expect(totals.capacitySats).toBe(BigInt(0));
  });
});

describe('display helpers', () => {
  test('names bonds by index, since there is no on-chain name', () => {
    expect(getBondDisplayName({ index: 1 })).toBe('Bond 1');
  });

  test('distinguishes a tiny holding from an empty one', () => {
    // 19,500 sats is 0.000195 BTC, which still renders as a number.
    expect(formatBtc(BigInt(19500))).toBe('0.0002 BTC');
    // Below the display threshold, show that something is there rather than 0.
    expect(formatBtc(BigInt(1000))).toBe('<0.0001 BTC');
    expect(formatBtc(BigInt(0))).toBe('0 BTC');
  });

  test('only upcoming bonds are pending', () => {
    expect(isBondPending('upcoming')).toBe(true);
    expect(isBondPending('active')).toBe(false);
  });
});

describe('formatUsd', () => {
  test('abbreviates large sums', () => {
    expect(formatUsd(106_005_982)).toBe('$106M');
    expect(formatUsd(1_250_000_000)).toBe('$1.3B');
  });

  test('abbreviates thousands, which the shared util does not', () => {
    expect(formatUsd(75_441)).toBe('$75.4K');
  });

  test('leaves small sums alone', () => {
    expect(formatUsd(237)).toBe('$237');
    expect(formatUsd(0)).toBe('$0');
  });

  test('is a dash when there is no number', () => {
    expect(formatUsd(Number.NaN)).toBe('-');
  });
});
