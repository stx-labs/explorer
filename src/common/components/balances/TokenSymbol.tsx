'use client';

import { useFtMetadata } from '@/common/queries/useFtMetadata';
import { getTicker } from '@/common/utils/transaction-utils';
import { Caption } from '@/ui/typography';

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
