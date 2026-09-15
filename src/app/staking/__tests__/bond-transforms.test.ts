import { toBondRow } from '../BondsTable';
import type { Bond } from '../data';
import { bondLabel, formatBtc, formatUsd } from '../utils';
import bondFixture from './fixtures/bond.json';

const CURRENT_BURN_HEIGHT = 9508;
const NOW_MS = Date.UTC(2026, 7, 25, 19, 0, 0);
const toRow = (bond: Bond) => toBondRow(bond, CURRENT_BURN_HEIGHT, NOW_MS);

describe('toBondRow', () => {
  test('converts the target from basis points to a percentage', () => {
    expect(toRow(bondFixture).targetRatePercent).toBe(10);
  });

  test('marks an upcoming bond as pending rather than empty', () => {
    expect(toRow(bondFixture).isPending).toBe(false);
    expect(toRow({ ...bondFixture, status: 'upcoming' }).isPending).toBe(true);
  });

  test('preserves unavailable bond balances without turning them into zero', () => {
    const row = toRow({
      ...bondFixture,
      parameters: { ...bondFixture.parameters, btc_capacity: '' },
      balances: { ...bondFixture.balances, locked: { btc: 'invalid', stx: '0' } },
    });
    expect(row.capacitySats).toBeUndefined();
    expect(row.lockedSats).toBeUndefined();
    const zero = toRow({
      ...bondFixture,
      parameters: { ...bondFixture.parameters, btc_capacity: '0' },
      balances: { ...bondFixture.balances, locked: { btc: '0', stx: '0' } },
    });
    expect(zero.capacitySats).toBe(BigInt(0));
    expect(zero.lockedSats).toBe(BigInt(0));
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
});

test.each([
  [75441, '$75.44K'],
  [269.8, '$269.80'],
  [237, '$237.00'],
  [0, '$0.00'],
  [Number.NaN, 'N/A'],
])('formatUsd(%s) displays %s', (amount, expected) => {
  expect(formatUsd(amount)).toBe(expected);
});
