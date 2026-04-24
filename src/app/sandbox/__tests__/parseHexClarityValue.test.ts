import { cvToHex, noneCV, uintCV } from '@stacks/transactions';

import { parseHexClarityValue } from '../utils';

describe('parseHexClarityValue', () => {
  it('parses a hex-prefixed clarity value', () => {
    expect(parseHexClarityValue(cvToHex(uintCV(42)))).toEqual({ display: 'u42', parsed: true });
  });

  it('parses a hex string without 0x prefix', () => {
    const hex = cvToHex(uintCV(7)).slice(2);
    expect(parseHexClarityValue(hex)).toEqual({ display: 'u7', parsed: true });
  });

  it('parses optional none', () => {
    expect(parseHexClarityValue(cvToHex(noneCV()))).toEqual({ display: 'none', parsed: true });
  });

  it('returns the raw input and parsed=false on malformed hex', () => {
    expect(parseHexClarityValue('not-hex')).toEqual({ display: 'not-hex', parsed: false });
  });
});
