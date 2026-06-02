import { stxToMicro } from '../utils';

describe('stxToMicro', () => {
  test('converts whole STX to micro-STX', () => {
    expect(stxToMicro('1847542056.872070')).toBe(1847542056872070);
  });

  test('handles integer values', () => {
    expect(stxToMicro('1')).toBe(1000000);
  });

  test('returns undefined for empty or invalid input', () => {
    expect(stxToMicro(undefined)).toBeUndefined();
    expect(stxToMicro('')).toBeUndefined();
    expect(stxToMicro('not-a-number')).toBeUndefined();
  });
});
