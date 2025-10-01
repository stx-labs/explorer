import { getTokenDisplayName, hasMetadataNameDifference } from '../token-display-name';

describe('getTokenDisplayName', () => {
  it('should prioritize metadata name over contract name', () => {
    expect(getTokenDisplayName('dawgpool-stxcity', 'Dawgcoin')).toBe('Dawgcoin');
  });

  it('should fallback to contract name when no metadata name', () => {
    expect(getTokenDisplayName('dawgpool-stxcity', null)).toBe('dawgpool-stxcity');
    expect(getTokenDisplayName('wrapped-bitcoin', undefined)).toBe('wrapped-bitcoin');
  });

  it('should fallback to default when no names available', () => {
    expect(getTokenDisplayName(null, null)).toBe('FT Token');
    expect(getTokenDisplayName(undefined, undefined)).toBe('FT Token');
  });
});

describe('hasMetadataNameDifference', () => {
  it('should detect when names differ', () => {
    expect(hasMetadataNameDifference('Dawgpool', 'Dawgcoin')).toBe(true);
    expect(hasMetadataNameDifference('Dawgpool', 'Dawgpool')).toBe(false);
  });

  it('should return false when names are missing', () => {
    expect(hasMetadataNameDifference(null, 'Dawgcoin')).toBe(false);
    expect(hasMetadataNameDifference('Dawgpool', null)).toBe(false);
  });
});
