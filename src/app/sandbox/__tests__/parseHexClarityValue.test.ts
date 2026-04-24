import { cvToHex, noneCV, uintCV } from '@stacks/transactions';

import { parseHexClarityValue } from '../utils';

describe('parseHexClarityValue', () => {
  it('parses a hex-prefixed clarity value', () => {
    expect(parseHexClarityValue(cvToHex(uintCV(42)))).toBe('u42');
  });

  it('parses a hex string without 0x prefix', () => {
    const hex = cvToHex(uintCV(7)).slice(2);
    expect(parseHexClarityValue(hex)).toBe('u7');
  });

  it('parses optional none', () => {
    expect(parseHexClarityValue(cvToHex(noneCV()))).toBe('none');
  });
});
