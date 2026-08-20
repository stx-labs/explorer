import { NetworkModes } from '@/common/types/network';

import type { operations } from '@stacks/token-metadata-api-client/lib/generated/schema';

import {
  LEGIT_SBTC_DERIVATIVES,
  RISKY_TOKENS,
  getSbtcContractAddress,
} from '../token/[tokenId]/consts';

type FtBasicMetadataResponse =
  operations['getFungibleTokens']['responses']['200']['content']['application/json']['results'][number];

export const referencesSBTC = (
  tokenName: FtBasicMetadataResponse['name'],
  tokenSymbol: FtBasicMetadataResponse['symbol']
) => {
  if (!tokenName || !tokenSymbol) {
    return false;
  }
  return tokenName.toLowerCase().includes('sbtc') || tokenSymbol.toLowerCase().includes('sbtc');
};

export const isSBTC = (contractId: string, networkMode: NetworkModes | undefined) => {
  if (!contractId) {
    return false;
  }
  return contractId === getSbtcContractAddress(networkMode);
};

export function showSBTCTokenAlert(
  tokenName: string,
  tokenSymbol: string,
  contractId: string,
  networkMode: NetworkModes | undefined
) {
  return (
    referencesSBTC(tokenName, tokenSymbol) &&
    !isSBTC(contractId, networkMode) &&
    !LEGIT_SBTC_DERIVATIVES.includes(contractId)
  );
}

export function showRiskyTokenAlert(contractId: string) {
  return RISKY_TOKENS.includes(contractId);
}
