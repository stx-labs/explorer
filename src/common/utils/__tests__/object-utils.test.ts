import { reverseRecord } from '../object-utils';

describe('reverseRecord', () => {
  it('should reverse a simple string-to-string record', () => {
    const input = {
      a: 'x',
      b: 'y',
      c: 'z',
    };

    const expected = {
      x: 'a',
      y: 'b',
      z: 'c',
    };

    expect(reverseRecord(input)).toEqual(expected);
  });

  it('should reverse a number-to-string record', () => {
    const input = {
      1: 'one',
      2: 'two',
      3: 'three',
    };

    const expected = {
      one: '1',
      two: '2',
      three: '3',
    };

    expect(reverseRecord(input)).toEqual(expected);
  });

  it('should handle empty record', () => {
    const input = {};
    const expected = {};

    expect(reverseRecord(input)).toEqual(expected);
  });

  it('should handle single entry record', () => {
    const input = { key: 'value' };
    const expected = { value: 'key' };

    expect(reverseRecord(input)).toEqual(expected);
  });

  it('should work with enum-like objects', () => {
    enum TestEnum {
      First = 'first-value',
      Second = 'second-value',
    }

    const input = {
      [TestEnum.First]: 'mapped-first',
      [TestEnum.Second]: 'mapped-second',
    };

    const expected = {
      'mapped-first': 'first-value',
      'mapped-second': 'second-value',
    };

    expect(reverseRecord(input)).toEqual(expected);
  });

  it('should preserve type information in TypeScript', () => {
    // This test is more about TypeScript compilation than runtime behavior
    type OriginalKeys = 'a' | 'b' | 'c';
    type OriginalValues = 'x' | 'y' | 'z';

    const input: Record<OriginalKeys, OriginalValues> = {
      a: 'x',
      b: 'y',
      c: 'z',
    };

    const result: Record<OriginalValues, OriginalKeys> = reverseRecord(input);

    expect(result.x).toBe('a');
    expect(result.y).toBe('b');
    expect(result.z).toBe('c');
  });
});
