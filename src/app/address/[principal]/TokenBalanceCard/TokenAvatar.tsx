'use client';

import { DefaultTokenImage } from './DefaultTokenImage';
import { TokenImage } from './TokenImage';
import { TokenVideo } from './TokenVideo';
import { useImageContentType } from './useImageUrl';

export function TokenAvatar({
  metadataImageUrl,
  asset,
}: {
  metadataImageUrl?: string;
  asset: string;
}) {
  const { url, contentType } = useImageContentType(metadataImageUrl);
  if (!url) return <DefaultTokenImage asset={asset} />;
  if (contentType?.startsWith('video')) {
    return <TokenVideo url={url} />;
  }
  return <TokenImage url={url} alt={asset} />;
}
