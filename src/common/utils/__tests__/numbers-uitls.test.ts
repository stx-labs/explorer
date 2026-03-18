import { bigintPow, isUint128 } from '../number-utils';

describe('bigintPow', () => {
  test('returns 1 for exponent 0 for any base', () => {
    expect(bigintPow(BigInt(1), 0)).toBe(BigInt(1));
    expect(bigintPow(BigInt(2), 0)).toBe(BigInt(1));
    expect(bigintPow(BigInt(10), 0)).toBe(BigInt(1));
    expect(bigintPow(BigInt(0), 0)).toBe(BigInt(1));
  });

  test('returns base for exponent 1', () => {
    expect(bigintPow(BigInt(1), 1)).toBe(BigInt(1));
    expect(bigintPow(BigInt(2), 1)).toBe(BigInt(2));
    expect(bigintPow(BigInt(10), 1)).toBe(BigInt(10));
  });

  test('computes small powers correctly', () => {
    expect(bigintPow(BigInt(10), 2)).toBe(BigInt(100));
    expect(bigintPow(BigInt(3), 3)).toBe(BigInt(27));
    expect(bigintPow(BigInt(5), 4)).toBe(BigInt(625));
  });

  test('handles non-10 bases and larger exponents', () => {
    expect(bigintPow(BigInt(2), 10)).toBe(BigInt(1024));
    expect(bigintPow(BigInt(7), 5)).toBe(BigInt(16807));
  });

  test('handles large results without bigint literal syntax in expectations', () => {
    // 10^18
    const expected = BigInt('1000000000000000000');
    expect(bigintPow(BigInt(10), 18)).toBe(expected);
  });

  test('zero base with positive exponent yields zero', () => {
    expect(bigintPow(BigInt(0), 5)).toBe(BigInt(0));
  });
});

describe('isUint128', () => {
  test('accepts valid small numbers', () => {
    expect(isUint128(0)).toBe(true);
    expect(isUint128(1)).toBe(true);
    expect(isUint128(1000000)).toBe(true);
  });

  test('rejects negative numbers', () => {
    expect(isUint128(-1)).toBe(false);
  });

  test('accepts large integers as strings', () => {
    expect(isUint128('340282366920938463463374607431768211455')).toBe(true);
  });

  test('rejects values exceeding uint128 max', () => {
    expect(isUint128('340282366920938463463374607431768211456')).toBe(false);
  });

  test('rejects non-numeric strings', () => {
    expect(isUint128('abc')).toBe(false);
  });
});
