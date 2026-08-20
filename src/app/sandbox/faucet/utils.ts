import { NetworkModeUrlMap } from '@/common/constants/network';
import { NetworkModes } from '@/common/types/network';
import { isAddressForNetworkMode, validateStacksAddress } from '@/common/utils/utils';

import { DEFAULT_DEVNET_SERVER } from '../../../common/constants/constants';

export type FaucetToken = 'stx' | 'sbtc';

export function getRecipientAddressError(address: string): string | undefined {
  if (!address) return 'Enter a Stacks address.';
  if (!validateStacksAddress(address)) return 'This is not a valid Stacks address.';
  if (!isAddressForNetworkMode(address, NetworkModes.Testnet)) {
    return 'This is not a testnet address.';
  }
  return undefined;
}

const DOCUMENTABLE_FAUCET_HOSTS = [NetworkModeUrlMap[NetworkModes.Testnet], DEFAULT_DEVNET_SERVER];

export function getDocumentableFaucetApiUrl(apiUrl: string | undefined) {
  return apiUrl && DOCUMENTABLE_FAUCET_HOSTS.includes(apiUrl) ? apiUrl : undefined;
}

export function getFaucetCurlCommand(apiUrl: string, token: FaucetToken) {
  return `curl -X POST "${apiUrl}/extended/v1/faucets/${token}?address=<STX_ADDRESS>"`;
}

export function getFaucetErrorMessage(error: any) {
  if (!error) return '';
  switch (error?.status) {
    case 429:
      return 'Too many requests, please try again later.';
    case 403:
      return 'This faucet is not available right now.';
    case undefined:
      break;
    default:
      return 'Something went wrong, please try again later.';
  }
  return 'Could not reach the faucet. It may be rate limited, please try again later.';
}
