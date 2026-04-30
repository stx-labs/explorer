import { cvToHex, uintCV } from '@stacks/transactions';

import { prettyFunctionResult } from '../utils';

describe('prettyFunctionResult', () => {
  it('returns the pretty-printed clarity value on success', () => {
    expect(prettyFunctionResult(cvToHex(uintCV(42)))).toEqual({ display: 'u42', ok: true });
  });

  it('returns a fallback message on malformed hex', () => {
    const result = prettyFunctionResult('not-hex');
    expect(result.ok).toBe(false);
    expect(result.display).toContain('Unable to decode');
  });

  it('truncates the raw hex in the fallback', () => {
    const longHex = 'a'.repeat(1000);
    const result = prettyFunctionResult(longHex);
    expect(result.ok).toBe(false);
    expect(result.display.length).toBeLessThan(longHex.length);
    expect(result.display).toContain('…');
  });
});
