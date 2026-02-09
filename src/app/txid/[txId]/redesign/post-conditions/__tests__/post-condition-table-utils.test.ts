import { getAmount } from '../post-condition-table-utils';

describe('getAmount', () => {
  test('returns amount for stx when present', () => {
    const pc: any = { type: 'stx', amount: '123' };
    expect(getAmount(pc)).toBe('123');
  });

  test('returns empty string for stx when amount is missing', () => {
    const pc: any = { type: 'stx' };
    expect(getAmount(pc)).toBe('');
  });

  test('returns amount for fungible when present', () => {
    const pc: any = { type: 'fungible', amount: '456' };
    expect(getAmount(pc)).toBe('456');
  });

  test('returns empty string for fungible when amount is missing', () => {
    const pc: any = { type: 'fungible' };
    expect(getAmount(pc)).toBe('');
  });

  test('returns 1 for non_fungible regardless of amount', () => {
    const pcWithAmount: any = { type: 'non_fungible', amount: '999' };
    const pcNoAmount: any = { type: 'non_fungible' };
    expect(getAmount(pcWithAmount)).toBe('1');
    expect(getAmount(pcNoAmount)).toBe('1');
  });

  test('returns empty string for unknown type', () => {
    const pc: any = { type: 'unknown', amount: '1000' };
    expect(getAmount(pc)).toBe('');
  });
});
