import { FtBasicMetadataResponse } from '@hirosystems/token-metadata-api-client';

import { getTokenDisplayName, hasMetadataNameDifference } from '../token-display-name';

describe('getTokenDisplayName', () => {
  const mockToken: FtBasicMetadataResponse = {
    name: 'Dawgpool',
    symbol: 'DAWG',
    contract_principal: 'SP123.token',
    tx_id: 'tx123',
    sender_address: 'SP456',
    decimals: 6,
    total_supply: '1000000',
    image_uri: 'https://example.com/image.png',
  };

  it('should prioritize metadata name over contract name', () => {
    expect(getTokenDisplayName(mockToken, 'Dawgcoin')).toBe('Dawgcoin');
    expect(getTokenDisplayName('Dawgpool', 'Dawgcoin')).toBe('Dawgcoin');
  });

  it('should fallback to contract name when no metadata name', () => {
    expect(getTokenDisplayName(mockToken, null)).toBe('Dawgpool');
    expect(getTokenDisplayName('Dawgpool', null)).toBe('Dawgpool');
  });

  it('should fallback to default when no names available', () => {
    const tokenWithoutName = { ...mockToken, name: null };
    expect(getTokenDisplayName(tokenWithoutName, null)).toBe('FT Token');
    expect(getTokenDisplayName(null, null)).toBe('FT Token');
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
