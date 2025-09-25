import { RISKY_TOKENS, VERIFIED_TOKENS } from '@/app/token/[tokenId]/consts';
import { Metadata } from '@hirosystems/token-metadata-api-client';

import { bigintPow } from './number-utils';

export const deriveTokenTickerFromAssetId = (assetId: string) => {
  const ticker = assetId.toUpperCase();
  if (ticker.includes('-')) {
    const parts = ticker.split('-');
    if (parts.length >= 3) {
      return `${parts[0][0]}${parts[1][0]}${parts[2][0]}`;
    } else {
      return `${parts[0][0]}${parts[1][0]}${parts[1][1]}`;
    }
  }
  if (ticker.length >= 3) {
    return `${ticker[0]}${ticker[1]}${ticker[2]}`;
  }
  return ticker;
};

export function isVerifiedToken(tokenId: string) {
  return VERIFIED_TOKENS.includes(tokenId);
}

export function isRiskyToken(tokenId: string) {
  return RISKY_TOKENS.includes(tokenId);
}

export function getTokenImageUrlFromTokenMetadata(tokenMetadata: Metadata): string | undefined {
  const cachedThumbnailImage =
    'cached_thumbnail_image' in tokenMetadata ? tokenMetadata.cached_thumbnail_image : undefined;
  const cachedImage = 'cached_image' in tokenMetadata ? tokenMetadata.cached_image : undefined;
  const image = 'image' in tokenMetadata ? tokenMetadata.image : undefined;
  const result = cachedThumbnailImage || cachedImage || image;
  return typeof result === 'string' ? result : undefined;
}

export function calculateHoldingPercentage(
  balance: string | number | bigint | undefined,
  totalSupply: string | number | bigint | undefined,
  precision: number = 4
): number | undefined {
  if (balance === undefined || totalSupply === undefined) {
    return undefined;
  }

  // Convert to BigInt if possible for precision, otherwise fallback to Number
  try {
    const b = BigInt(balance);
    const t = BigInt(totalSupply);

    if (t <= BigInt(0) || b < BigInt(0)) return undefined;

    // Multiply before dividing to preserve precision, then convert to number
    const percentage = Number((b * bigintPow(BigInt(10), precision)) / t) / 100; // 2 decimals by default
    return parseFloat(percentage.toFixed(precision));
  } catch {
    // Fallback for cases where balance/totalSupply aren't integer-like
    const balNum = Number(balance);
    const totalNum = Number(totalSupply);
    if (!isFinite(balNum) || !isFinite(totalNum) || totalNum <= 0 || balNum < 0) {
      return undefined;
    }

    const percentage = (balNum / totalNum) * 100;
    return parseFloat(percentage.toFixed(precision));
  }
}

export function formatHoldingPercentage(percentage: number | undefined): string {
  if (percentage === undefined || percentage < 0) return '-';
  return percentage === 0
    ? '0%'
    : percentage >= 100
      ? '100%'
      : percentage > 0 && percentage < 0.0001
        ? '<0.0001%'
        : `${percentage.toFixed(4)}%`;
}
