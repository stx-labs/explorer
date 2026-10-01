import { DEFAULT_MAINNET_SERVER, DEFAULT_TESTNET_SERVER } from '@/common/constants/env';
import { NetworkModes } from '@/common/types/network';
import { getApiUrl } from '@/common/utils/network-utils';

function parseApiUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

const configuredApis = [DEFAULT_MAINNET_SERVER, DEFAULT_TESTNET_SERVER]
  .map(parseApiUrl)
  .filter((url): url is URL => url !== undefined);

/** Only operator-configured HTTPS origins may receive the server API key. */
export function isTrustedStacksApiUrl(value: string): boolean {
  const url = parseApiUrl(value);
  return url !== undefined && configuredApis.some(api => api.origin === url.origin);
}

/** URL parameters may select a configured API, never an arbitrary server-side destination. */
export function getAllowedStakingApiUrl(chain: string, api?: string): string | undefined {
  if (chain !== NetworkModes.Mainnet && chain !== NetworkModes.Testnet) return undefined;
  const url = parseApiUrl(getApiUrl(chain, api));
  if (!url || url.search || url.hash) return undefined;
  const base = configuredApis.find(
    configured =>
      configured.origin === url.origin &&
      configured.pathname.replace(/\/+$/, '') === url.pathname.replace(/\/+$/, '')
  );
  return base?.href.replace(/\/+$/, '');
}
