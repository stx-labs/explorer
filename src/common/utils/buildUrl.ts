import { NetworkModeUrlMap } from '../constants/network';
import { Network } from '../types/network';
import { isLocalhost } from './network-utils';

export function getQueryParams(network: Network) {
  let suffix = `?chain=${encodeURIComponent(network?.mode || 'mainnet')}`;

  if (network?.isSubnet) {
    suffix += `&subnet=${network.url}`;
  } else if (network?.isCustomNetwork || network?.url !== NetworkModeUrlMap[network?.mode]) {
    // Any network served from a non-default URL (devnet, staking testnet, user-added APIs) needs
    // the api param so server-side fetchers hit the same API as the client.
    suffix += `&api=${network.url}`;
  }

  // Add ssr=false for devnet
  if (isLocalhost(network.url)) {
    suffix += '&ssr=false';
  }

  return suffix;
}

export const buildUrl = (href: string, network: Network): string => {
  const queryParams = getQueryParams(network);
  // If href already has query params, replace the leading ? with &
  const separator = href.includes('?') ? queryParams.replace('?', '&') : queryParams;
  return `${href}${separator}`;
};
