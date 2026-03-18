'use client';

import { getTicker } from '@/common/utils/transaction-utils';
import { Caption } from '@/ui/typography';

export function FtTokenSymbol({ asset, symbol }: { asset: string; symbol?: string }) {
  return <Caption>{symbol || getTicker(asset).toUpperCase()}</Caption>;
}

export function NftTokenSymbol({ asset }: { asset: string }) {
  return <Caption>{getTicker(asset).toUpperCase()}</Caption>;
}
