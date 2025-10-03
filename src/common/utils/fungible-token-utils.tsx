import { RISKY_TOKENS, VERIFIED_TOKENS } from '@/app/token/[tokenId]/consts';
import { Metadata } from '@hirosystems/token-metadata-api-client';

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
  balance: string,
  totalSupply: string | undefined
): number | undefined {
  if (!totalSupply) return undefined;
  return (parseFloat(balance) / parseFloat(totalSupply)) * 100;
}

export function formatHoldingPercentage(percentage: number | undefined): string {
  if (!percentage) return '-';
  return percentage < 0.0001 && percentage > 0 ? '<0.0001%' : `${percentage.toFixed(4)}%`;
}
