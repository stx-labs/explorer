import { getValue } from './FunctionSummaryClarityValue';

describe('getValue', () => {
  it('should return the correct value for uint type', () => {
    const arg = {
      type: 'uint',
      repr: 'u123',
      name: 'some-name',
    };
    const btc = null;
    const expected = '123';

    const result = getValue(arg, btc);

    expect(result).toBe(expected);
  });

  it('should return the correct value for uint type (with microToStacks conversion)', () => {
    const arg = {
      type: 'uint',
      repr: 'u100000000',
      name: 'ustx-amount',
    };
    const btc = null;
    const expected = '100.00 STX';

    const result = getValue(arg, btc);

    expect(result).toBe(expected);
  });

  it('should return the correct value for JSON string', () => {
    const arg = {
      type: 'some-type',
      repr: '{"value": 123}',
      name: 'some-name',
    };
    const btc = null;
    const expected = '{"value": 123}';

    const result = getValue(arg, btc);

    expect(result).toStrictEqual(expected);
  });
});
