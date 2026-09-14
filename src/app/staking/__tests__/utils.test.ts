import {
  formatBtc,
  formatSbtc,
  formatStx,
  formatUsd,
  getBondStatusLabel,
  toBigInt,
} from '../utils';

test('keeps missing or invalid amounts distinct from zero', () => {
  for (const value of [undefined, null, '', '   ', 'invalid', '1.5']) {
    expect(toBigInt(value)).toBeUndefined();
  }
  expect(toBigInt('0')).toBe(BigInt(0));
  expect(toBigInt('9007199254740993')).toBe(BigInt('9007199254740993'));
});

test('handles unknown statuses without losing known or future labels', () => {
  for (const status of [undefined, null, '', '   ', 123 as unknown as string]) {
    expect(getBondStatusLabel(status)).toBe('Unknown');
  }
  expect(getBondStatusLabel('active')).toBe('Active');
  expect(getBondStatusLabel('unlocked')).toBe('Unlocked');
});

test('uses consistent US number formatting and the USD unavailable label', () => {
  const locale = jest.spyOn(Number.prototype, 'toLocaleString');
  try {
    expect(formatBtc(BigInt('123456789000'))).toBe('1,234.5679 BTC');
    expect(formatStx(BigInt('1234567890'))).toBe('1,234.57 STX');
    expect(formatSbtc(BigInt('123456789000'), 2)).toBe('1,234.57 sBTC');
    expect(locale.mock.calls.every(([language]) => language === 'en-US')).toBe(true);
  } finally {
    locale.mockRestore();
  }
  expect(formatUsd(NaN)).toBe('N/A');
  expect(formatUsd(Infinity)).toBe('N/A');
  expect(formatUsd(0)).toBe('$0.00');
});
