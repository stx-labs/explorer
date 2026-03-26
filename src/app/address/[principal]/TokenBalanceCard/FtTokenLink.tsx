'use client';

import React from 'react';

import type { operations } from '@stacks/token-metadata-api-client/lib/generated/schema';

import { TokenLink } from '../../../../common/components/ExplorerLinks';
import { getTokenDisplayName } from '../../../../common/utils/token-display-name';

type FtMetadataResponse =
  operations['getFtMetadata']['responses']['200']['content']['application/json'];

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
