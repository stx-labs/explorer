import { NetworkModeUrlMap } from '@/common/constants/network';
import { NetworkModes } from '@/common/types/network';
import { isAddressForNetworkMode, validateStacksAddress } from '@/common/utils/utils';

import { DEFAULT_DEVNET_SERVER } from '../../../common/constants/constants';

export type FaucetToken = 'stx' | 'sbtc';

// Both faucets are testnet-only, so a mainnet-version principal is never a valid recipient. That
// holds even on a node we can't classify — private testnets report chain ids NetworkIdModeMap
// doesn't cover, leaving activeNetwork.mode undefined.
export function getRecipientAddressError(address: string): string | undefined {
  if (!address) return 'Enter a Stacks address.';
  if (!validateStacksAddress(address)) return 'This is not a valid Stacks address.';
  if (!isAddressForNetworkMode(address, NetworkModes.Testnet)) {
    return 'This is not a testnet address.';
  }
  return undefined;
}

// The curl block is documentation the user is invited to paste into a shell, so it is built only
// from hosts we ship. A custom `?api=` value reaches here unencoded — `buildCustomNetworkUrl`
// leaves the path alone, so `$( )` in it would become command substitution on paste.
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
  // A transport failure (offline, or an edge rate-limiter answering without CORS headers) rejects
  // before any status exists.
  return 'Could not reach the faucet. It may be rate limited, please try again later.';
}
