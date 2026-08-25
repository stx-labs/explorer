import { getAmount, getPostConditionCellText } from '../post-condition-table-utils';

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

  test('returns amount for staking when present', () => {
    const pc: any = { type: 'staking', amount: '1100000' };
    expect(getAmount(pc)).toBe('1100000');
  });

  test('returns empty string for pox, which has no amount', () => {
    const pc: any = { type: 'pox', condition_code: 'performed' };
    expect(getAmount(pc)).toBe('');
  });

  test('returns empty string for unknown type', () => {
    const pc: any = { type: 'unknown', amount: '1000' };
    expect(getAmount(pc)).toBe('');
  });
});

describe('getPostConditionCellText', () => {
  test('uses transfer wording for token post-conditions', () => {
    expect(getPostConditionCellText('sent_equal_to', 'stx')).toBe('Transfers exactly');
    expect(getPostConditionCellText('not_sent', 'non_fungible')).toBe('Must not transfer');
    expect(getPostConditionCellText('maybe_sent', 'fungible')).toBe('May transfer');
  });

  test('uses stake wording for staking post-conditions', () => {
    expect(getPostConditionCellText('sent_equal_to', 'staking')).toBe('Stakes exactly');
    expect(getPostConditionCellText('sent_greater_than_or_equal_to', 'staking')).toBe(
      'Stakes at least'
    );
    expect(getPostConditionCellText('not_sent', 'staking')).toBe('Must not stake');
  });

  test('uses PoX action wording for pox post-conditions', () => {
    expect(getPostConditionCellText('not_performed', 'pox')).toBe('Must not perform PoX action');
    expect(getPostConditionCellText('maybe_performed', 'pox')).toBe('May perform PoX action');
    expect(getPostConditionCellText('performed', 'pox')).toBe('Must perform PoX action');
  });

  test('falls back for unknown condition codes', () => {
    expect(getPostConditionCellText('bogus' as any, 'stx')).toBe('Undefined post condition code');
    expect(getPostConditionCellText('bogus' as any, 'pox')).toBe('Undefined post condition code');
  });
});
