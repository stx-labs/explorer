'use client';

import { showRiskyTokenAlert, showSBTCTokenAlert } from '@/app/tokens/utils';
import { NotSBTCTokenAlert, RiskyTokenAlert } from '@/app/txid/[txId]/redesign/Alert';
import { useSbtcNetworkMode } from '@/common/hooks/useSbtcNetworkMode';

import { useTokenIdPageData } from './context/TokenIdPageContext';

export function TokenAlert() {
  const { tokenId, tokenData } = useTokenIdPageData();
  const networkMode = useSbtcNetworkMode();

  if (showSBTCTokenAlert(tokenData?.name || '', tokenData?.symbol || '', tokenId, networkMode)) {
    return <NotSBTCTokenAlert />;
  }

  if (showRiskyTokenAlert(tokenId)) {
    return <RiskyTokenAlert />;
  }

  return null;
}
