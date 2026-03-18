'use client';

import React from 'react';

import { getAssetNameParts } from '../../../../common/utils/utils';
import { TokenAvatar } from './TokenAvatar';

interface FtAvatarProps {
  token: string;
  contractId: string;
  metadataImageUrl?: string;
}

export function FtAvatar({ token, metadataImageUrl }: FtAvatarProps) {
  const { asset } = getAssetNameParts(token);
  return <TokenAvatar metadataImageUrl={metadataImageUrl} asset={asset} />;
}
