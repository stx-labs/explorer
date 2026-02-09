'use client';

import { showRiskyTokenAlert, showSBTCTokenAlert } from '@/app/tokens/utils';
import { NotSBTCTokenAlert, RiskyTokenAlert } from '@/app/txid/[txId]/redesign/Alert';
import { getAssetNameParts } from '@/common/utils/utils';

import { useTokenIdPageData } from './context/TokenIdPageContext';

export function TokenAlert() {
  const { assetId, tokenData } = useTokenIdPageData();
  const { address, contract } = getAssetNameParts(assetId || '');
  const contractId = `${address}.${contract}`;

  if (showSBTCTokenAlert(tokenData?.name || '', tokenData?.symbol || '', contractId)) {
    return <NotSBTCTokenAlert />;
  }

  if (showRiskyTokenAlert(contractId)) {
    return <RiskyTokenAlert />;
  }

  return null;
}
