import { FtBasicMetadataResponse } from '@hirosystems/token-metadata-api-client';

import { sbtcContractAddress } from '../token/[tokenId]/consts';

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
