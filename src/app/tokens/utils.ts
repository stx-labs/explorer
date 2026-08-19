import type { operations } from '@stacks/token-metadata-api-client/lib/generated/schema';

import { LEGIT_SBTC_DERIVATIVES, RISKY_TOKENS, isSbtcContractId } from '../token/[tokenId]/consts';

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

/** True for the official sBTC token contract of any network */
export const isSBTC = (contractId: string) => isSbtcContractId(contractId);

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
