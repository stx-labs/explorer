'use client';

import React from 'react';

import { getTicker } from '../../../app/txid/[txId]/Events';
import { Caption } from '../../../ui/typography';
import { useFtMetadata } from '../../queries/useFtMetadata';

export function FtTokenSymbol({
  asset,
  contractId,
}: {
  asset: string;
  ftMetadata?: any;
  contractId: string;
}) {
  const { data: tokenMetadata } = useFtMetadata(contractId);
  return <Caption>{tokenMetadata?.symbol || getTicker(asset).toUpperCase()}</Caption>;
}

export function NftTokenSymbol({ asset }: { asset: string }) {
  return <Caption>{getTicker(asset).toUpperCase()}</Caption>;
}
