'use client';

import { useNftMetadata } from '../../../../common/queries/useNftMetadata';
import { TokenAvatar } from './TokenAvatar';

interface NftAvatarProps {
  asset: string;
  token: string;
  contractId: string;
  firstNftValue?: bigint;
}

export function NftAvatar({ token, contractId, firstNftValue, asset }: NftAvatarProps) {
  const { data: tokenMetadata } = useNftMetadata(
    { contractId, tokenId: firstNftValue !== undefined ? firstNftValue.toString() : undefined },
    { enabled: firstNftValue !== undefined, retry: 1, retryDelay: 2000 }
  );
  return <TokenAvatar metadataImageUrl={tokenMetadata?.metadata?.cached_image} asset={asset} />;
}
