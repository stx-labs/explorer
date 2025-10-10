'use client';

import { FtMetadataResponse } from '@hirosystems/token-metadata-api-client/dist/api';
import React from 'react';

import { TokenLink } from '../../../../common/components/ExplorerLinks';
import { getTokenDisplayName } from '../../../../common/utils/token-display-name';

interface FtTokenLinkProps {
  contractId: string;
  asset: string;
  bnsName?: string;
  ftMetadata?: FtMetadataResponse;
}

export const FtTokenLink: React.FC<FtTokenLinkProps> = ({
  contractId,
  asset,
  bnsName,
  ftMetadata,
}) => {
  const displayName = getTokenDisplayName(asset, ftMetadata?.metadata?.name);

  return <TokenLink tokenId={contractId}>{bnsName || displayName}</TokenLink>;
};
