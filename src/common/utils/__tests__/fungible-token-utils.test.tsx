import { Metadata } from '@hirosystems/token-metadata-api-client';

import {
  calculateHoldingPercentage,
  deriveTokenTickerFromAssetId,
  formatHoldingPercentage,
  getTokenImageUrlFromTokenMetadata,
  isRiskyToken,
  isVerifiedToken,
} from '../fungible-token-utils';

// Mock the constants
jest.mock('@/app/token/[tokenId]/consts', () => ({
  RISKY_TOKENS: [
    'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.risky-token',
    'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.scam-coin',
  ],
  VERIFIED_TOKENS: [
    'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.verified-token',
    'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.trusted-coin',
  ],
}));

describe('deriveTokenTickerFromAssetId', () => {
  it('should derive ticker from asset ID with hyphens (3+ parts)', () => {
    const result = deriveTokenTickerFromAssetId('bitcoin-wrapped-token');
    expect(result).toBe('BWT');
  });

  it('should derive ticker from asset ID with hyphens (2 parts)', () => {
    const result = deriveTokenTickerFromAssetId('stacks-token');
    expect(result).toBe('STO');
  });

  it('should derive ticker from asset ID without hyphens (3+ characters)', () => {
    const result = deriveTokenTickerFromAssetId('bitcoin');
    expect(result).toBe('BIT');
  });

  it('should return full ticker for short asset IDs without hyphens', () => {
    const result = deriveTokenTickerFromAssetId('bt');
    expect(result).toBe('BT');
  });

  it('should handle single character asset IDs', () => {
    const result = deriveTokenTickerFromAssetId('x');
    expect(result).toBe('X');
  });

  it('should convert to uppercase', () => {
    const result = deriveTokenTickerFromAssetId('bitcoin-wrapped-token');
    expect(result).toBe('BWT');
  });

  it('should handle empty string', () => {
    const result = deriveTokenTickerFromAssetId('');
    expect(result).toBe('');
  });

  it('should handle complex hyphenated names', () => {
    const result = deriveTokenTickerFromAssetId('my-super-awesome-token-name');
    expect(result).toBe('MSA');
  });

  it('should handle mixed case input', () => {
    const result = deriveTokenTickerFromAssetId('Bitcoin-Wrapped-Token');
    expect(result).toBe('BWT');
  });
});

describe('isVerifiedToken', () => {
  it('should return true for verified tokens', () => {
    const result = isVerifiedToken('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.verified-token');
    expect(result).toBe(true);
  });

  it('should return true for another verified token', () => {
    const result = isVerifiedToken('ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.trusted-coin');
    expect(result).toBe(true);
  });

  it('should return false for non-verified tokens', () => {
    const result = isVerifiedToken('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.unknown-token');
    expect(result).toBe(false);
  });

  it('should return false for empty string', () => {
    const result = isVerifiedToken('');
    expect(result).toBe(false);
  });

  it('should be case sensitive', () => {
    const result = isVerifiedToken('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.VERIFIED-TOKEN');
    expect(result).toBe(false);
  });
});

describe('isRiskyToken', () => {
  it('should return true for risky tokens', () => {
    const result = isRiskyToken('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.risky-token');
    expect(result).toBe(true);
  });

  it('should return true for another risky token', () => {
    const result = isRiskyToken('ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.scam-coin');
    expect(result).toBe(true);
  });

  it('should return false for safe tokens', () => {
    const result = isRiskyToken('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.safe-token');
    expect(result).toBe(false);
  });

  it('should return false for empty string', () => {
    const result = isRiskyToken('');
    expect(result).toBe(false);
  });

  it('should be case sensitive', () => {
    const result = isRiskyToken('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.RISKY-TOKEN');
    expect(result).toBe(false);
  });
});

describe('getTokenImageUrlFromTokenMetadata', () => {
  it('should return cached_thumbnail_image when available', () => {
    const metadata: Metadata = {
      cached_thumbnail_image: 'https://example.com/thumbnail.jpg',
      cached_image: 'https://example.com/cached.jpg',
      image: 'https://example.com/image.jpg',
    } as any as Metadata;

    const result = getTokenImageUrlFromTokenMetadata(metadata);
    expect(result).toBe('https://example.com/thumbnail.jpg');
  });

  it('should return cached_image when cached_thumbnail_image is not available', () => {
    const metadata: Metadata = {
      cached_image: 'https://example.com/cached.jpg',
      image: 'https://example.com/image.jpg',
    } as any as Metadata;

    const result = getTokenImageUrlFromTokenMetadata(metadata);
    expect(result).toBe('https://example.com/cached.jpg');
  });

  it('should return image when only image is available', () => {
    const metadata: Metadata = {
      image: 'https://example.com/image.jpg',
    } as any as Metadata;

    const result = getTokenImageUrlFromTokenMetadata(metadata);
    expect(result).toBe('https://example.com/image.jpg');
  });

  it('should return undefined when no image properties are available', () => {
    const metadata: Metadata = {} as any as Metadata;

    const result = getTokenImageUrlFromTokenMetadata(metadata);
    expect(result).toBeUndefined();
  });

  it('should return undefined when image properties are not strings', () => {
    const metadata: Metadata = {
      cached_thumbnail_image: { uri: 'https://example.com/thumbnail.jpg' } as any,
      cached_image: 123 as any,
      image: null as any,
    } as any as Metadata;

    const result = getTokenImageUrlFromTokenMetadata(metadata);
    expect(result).toBeUndefined();
  });

  it('should handle mixed types and return first valid string', () => {
    const metadata: Metadata = {
      cached_thumbnail_image: null as any,
      cached_image: 'https://example.com/cached.jpg',
      image: { uri: 'https://example.com/image.jpg' } as any,
    } as any as Metadata;

    const result = getTokenImageUrlFromTokenMetadata(metadata);
    expect(result).toBe('https://example.com/cached.jpg');
  });

  it('should handle empty string images', () => {
    const metadata: Metadata = {
      cached_thumbnail_image: '',
      cached_image: 'https://example.com/cached.jpg',
      image: 'https://example.com/image.jpg',
    } as any as Metadata;

    const result = getTokenImageUrlFromTokenMetadata(metadata);
    expect(result).toBe('https://example.com/cached.jpg');
  });
});

describe('calculateHoldingPercentage', () => {
  it('should calculate holding percentage correctly', () => {
    const result = calculateHoldingPercentage('1000', '10000');
    expect(result).toBe(10);
  });

  it('should calculate percentage for decimal balances', () => {
    const result = calculateHoldingPercentage('0.5', '100');
    expect(result).toBe(0.5);
  });

  it('should calculate percentage for very small holdings', () => {
    const result = calculateHoldingPercentage('1', '1000000');
    expect(result).toBeCloseTo(0.0001);
  });

  it('should calculate 100% when balance equals total supply', () => {
    const result = calculateHoldingPercentage('1000', '1000');
    expect(result).toBe(100);
  });

  it('should return undefined when total supply is undefined', () => {
    const result = calculateHoldingPercentage('1000', undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined when total supply is empty string', () => {
    const result = calculateHoldingPercentage('1000', '');
    expect(result).toBeUndefined();
  });

  it('should handle zero balance', () => {
    const result = calculateHoldingPercentage('0', '1000');
    expect(result).toBe(0);
  });

  it('should handle zero total supply', () => {
    const result = calculateHoldingPercentage('100', '0');
    expect(result).toBe(Infinity);
  });

  it('should handle string numbers with decimals', () => {
    const result = calculateHoldingPercentage('123.456', '1000.789');
    expect(result).toBeCloseTo(12.336);
  });
});

describe('formatHoldingPercentage', () => {
  it('should format normal percentages with 4 decimal places', () => {
    const result = formatHoldingPercentage(12.3456789);
    expect(result).toBe('12.3457%');
  });

  it('should format zero percentage', () => {
    const result = formatHoldingPercentage(0);
    expect(result).toBe('0.0000%');
  });

  it('should format 100% correctly', () => {
    const result = formatHoldingPercentage(100);
    expect(result).toBe('100.0000%');
  });

  it('should format very small percentages as "<0.0001%"', () => {
    const result = formatHoldingPercentage(0.00005);
    expect(result).toBe('<0.0001%');
  });

  it('should format exactly 0.0001% normally', () => {
    const result = formatHoldingPercentage(0.0001);
    expect(result).toBe('0.0001%');
  });

  it('should return "-" for undefined percentage', () => {
    const result = formatHoldingPercentage(undefined);
    expect(result).toBe('-');
  });

  it('should return "-" for null percentage', () => {
    const result = formatHoldingPercentage(null as any);
    expect(result).toBe('-');
  });

  it('should handle very large percentages', () => {
    const result = formatHoldingPercentage(999999.123456);
    expect(result).toBe('999999.1235%');
  });

  it('should handle negative percentages', () => {
    const result = formatHoldingPercentage(-5.1234);
    expect(result).toBe('-5.1234%');
  });

  it('should handle very small positive percentages correctly', () => {
    const result = formatHoldingPercentage(0.000001);
    expect(result).toBe('<0.0001%');
  });

  it('should handle edge case at 0.0001 boundary', () => {
    const result1 = formatHoldingPercentage(0.00009999);
    const result2 = formatHoldingPercentage(0.00010001);

    expect(result1).toBe('<0.0001%');
    expect(result2).toBe('0.0001%');
  });
});
