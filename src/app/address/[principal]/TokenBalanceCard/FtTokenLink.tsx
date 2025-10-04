'use client';

import React from 'react';

import { TokenLink } from '../../../../common/components/ExplorerLinks';
import { useFtMetadata } from '../../../../common/queries/useFtMetadata';
import { getTokenDisplayName } from '../../../../common/utils/token-display-name';

interface FtTokenLinkProps {
  contractId: string;
  asset: string;
  bnsName?: string;
}

export const FtTokenLink: React.FC<FtTokenLinkProps> = ({ contractId, asset, bnsName }) => {
  const { data: tokenMetadata } = useFtMetadata(contractId);

  const displayName = getTokenDisplayName(asset, tokenMetadata?.metadata?.name);

  return <TokenLink tokenId={contractId}>{bnsName || displayName}</TokenLink>;
};
