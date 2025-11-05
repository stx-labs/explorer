'use client';

import { isSBTC, referencesSBTC } from '@/app/tokens/utils';
import { NotSBTCTokenAlert, RiskyTokenAlert } from '@/app/txid/[txId]/redesign/Alert';
import { getAssetNameParts } from '@/common/utils/utils';

import { LEGIT_SBTC_DERIVATIVES, RISKY_TOKENS } from '../consts';
import { useTokenIdPageData } from './context/TokenIdPageContext';

export function TokenAlert() {
  const { assetId, tokenData } = useTokenIdPageData();
  const { address, contract } = getAssetNameParts(assetId || '');
  const contractId = `${address}.${contract}`;
  if (
    referencesSBTC(tokenData?.name || '', tokenData?.symbol || '') &&
    !isSBTC(contractId) &&
    !LEGIT_SBTC_DERIVATIVES.includes(contractId)
  ) {
    return <NotSBTCTokenAlert />;
  }

  if (RISKY_TOKENS.includes(contractId)) {
    return <RiskyTokenAlert />;
  }

  return null;
}
