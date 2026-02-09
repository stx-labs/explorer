import { FtBasicMetadataResponse } from '@hirosystems/token-metadata-api-client';

import {
  LEGIT_SBTC_DERIVATIVES,
  RISKY_TOKENS,
  sbtcContractAddress,
} from '../token/[tokenId]/consts';

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
