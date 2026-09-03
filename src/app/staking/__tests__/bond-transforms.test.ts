import { toBondRow } from '../BondsTable';
import type { Bond } from '../data';
import { bondLabel, formatBtc, formatUsd, isBondPending } from '../utils';
import testnetBonds from './fixtures/testnet-bonds.json';

const bonds = testnetBonds as unknown as Bond[];

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
    expect(row.activationMs).toBe(NOW_MS + (9000 - CURRENT_BURN_HEIGHT) * TEN_MIN);
    expect(row.activationMs).toBeLessThan(NOW_MS);
    expect(row.unlockMs).toBe(NOW_MS + (19800 - CURRENT_BURN_HEIGHT) * TEN_MIN);
    expect(row.unlockMs).toBeGreaterThan(NOW_MS);
  });
});

describe('display helpers', () => {
  test('names bonds by index, except the first, which goes by name', () => {
    expect(bondLabel(1)).toBe('Genesis');
    expect(bondLabel(2)).toBe('Bond 2');
    expect(bondLabel(316)).toBe('Bond 316');
  });

  test('distinguishes a tiny holding from an empty one', () => {
    expect(formatBtc(BigInt(19500))).toBe('0.0002 BTC');
    expect(formatBtc(BigInt(1000))).toBe('<0.0001 BTC');
    expect(formatBtc(BigInt(0))).toBe('0 BTC');
  });

  test('a headline figure never rounds a real balance down to zero', () => {
    expect(formatBtc(BigInt(350000), 1)).toBe('0.0035 BTC');
    expect(formatBtc(BigInt(14730000000), 1)).toBe('147.3 BTC');
    expect(formatBtc(BigInt(0), 1)).toBe('0 BTC');
  });

  test('only upcoming bonds are pending', () => {
    expect(isBondPending('upcoming')).toBe(true);
    expect(isBondPending('active')).toBe(false);
  });
});

describe('formatUsd', () => {
  test('abbreviates large sums', () => {
    expect(formatUsd(106_005_982)).toBe('$106.01M');
    expect(formatUsd(1_250_000_000)).toBe('$1.25B');
  });

  test('abbreviates thousands, which the shared util does not', () => {
    expect(formatUsd(75_441)).toBe('$75.44K');
  });

  test('always shows cents, so a column of amounts aligns', () => {
    expect(formatUsd(269.8)).toBe('$269.80');
    expect(formatUsd(237)).toBe('$237.00');
    expect(formatUsd(0)).toBe('$0.00');
  });

  test('is a dash when there is no number', () => {
    expect(formatUsd(Number.NaN)).toBe('-');
  });
});
