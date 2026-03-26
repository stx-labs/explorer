import type { operations } from '@stacks/token-metadata-api-client/lib/generated/schema';

import {
  LEGIT_SBTC_DERIVATIVES,
  RISKY_TOKENS,
  sbtcContractAddress,
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

export const isSBTC = (contractId: string) => {
  if (!contractId) {
    return false;
  }
  return contractId === sbtcContractAddress;
};

export function showSBTCTokenAlert(tokenName: string, tokenSymbol: string, contractId: string) {
  return (
    referencesSBTC(tokenName, tokenSymbol) &&
    !isSBTC(contractId) &&
    !LEGIT_SBTC_DERIVATIVES.includes(contractId)
  );
}

export function showRiskyTokenAlert(contractId: string) {
  return RISKY_TOKENS.includes(contractId);
}
