import { validateWatchlistPrincipal } from '../validation';

describe('validateWatchlistPrincipal', () => {
  it('accepts mainnet standard address', () => {
    expect(validateWatchlistPrincipal('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7')).toBe(true);
  });

  it('accepts contract id', () => {
    expect(
      validateWatchlistPrincipal('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.contract-name')
    ).toBe(true);
  });

  it('rejects garbage', () => {
    expect(validateWatchlistPrincipal('')).toBe(false);
    expect(validateWatchlistPrincipal('bitcoin')).toBe(false);
  });
});

