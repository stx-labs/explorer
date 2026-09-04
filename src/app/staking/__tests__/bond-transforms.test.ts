import { toBondRow } from '../BondsTable';
import type { Bond } from '../data';
import { bondLabel, formatBtc, formatUsd, isBondPending } from '../utils';
import testnetBonds from './fixtures/testnet-bonds.json';

const bonds = testnetBonds as unknown as Bond[];

const CURRENT_BURN_HEIGHT = 9508;
const NOW_MS = Date.UTC(2026, 7, 25, 19, 0, 0);
const toRow = (bond: Bond) => toBondRow(bond, CURRENT_BURN_HEIGHT, NOW_MS);

describe('toBondRow', () => {
  test('derives an active bond row from its parameters', () => {
    const bond = bonds.find(b => b.index === 3)!;
    const row = toRow(bond);
    expect(row.name).toBe('Bond 3');
    expect(row.status).toBe('Active');
    expect(row.isPending).toBe(false);
    // 1000 bps on the fixture, read as a percentage
    expect(row.targetRatePercent).toBe(10);
  });

  test('marks an upcoming bond as pending rather than empty', () => {
    const bond = bonds.find(b => b.index === 4)!;
    const row = toRow(bond);
    expect(row.isPending).toBe(true);
    expect(row.capacitySats).toBe(BigInt(13986724000));
    expect(row.lockedSats).toBe(BigInt(0));
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
