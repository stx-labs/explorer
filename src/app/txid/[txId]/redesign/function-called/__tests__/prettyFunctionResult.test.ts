import { cvToHex, responseErrorCV, responseOkCV, uintCV } from '@stacks/transactions';

import { prettyFunctionResult } from '../utils';

describe('prettyFunctionResult', () => {
  it('returns the pretty-printed clarity value on success', () => {
    expect(prettyFunctionResult(cvToHex(uintCV(42)))).toEqual({
      display: 'u42',
      ok: true,
      success: undefined,
    });
  });

  it('reports response-ok status', () => {
    const result = prettyFunctionResult(cvToHex(responseOkCV(uintCV(1))));
    expect(result.ok).toBe(true);
    expect(result.success).toBe(true);
  });

  it('reports response-err status', () => {
    const result = prettyFunctionResult(cvToHex(responseErrorCV(uintCV(1))));
    expect(result.ok).toBe(true);
    expect(result.success).toBe(false);
  });

  it('returns the full raw hex in the fallback on malformed input', () => {
    const result = prettyFunctionResult('not-hex');
    expect(result.ok).toBe(false);
    expect(result.display).toBe('Unable to decode value:\nnot-hex');
  });
});
