import { DEFAULT_DEVNET_SERVER } from '../constants/constants';
import { DEFAULT_MAINNET_SERVER, DEFAULT_TESTNET_SERVER } from '../constants/env';
import { Network, NetworkModes } from '../types/network';

/**
 * Returns the network string expected by @stacks/connect.
 * Devnet uses testnet chain ID and mode, but @stacks/connect needs "devnet" as the network string.
 */
export function getConnectNetworkString(network: Network): string {
  if (network.url === DEFAULT_DEVNET_SERVER) {
    return 'devnet';
  }
  return network.mode;
}

export function getApiUrl(chain: string, customApiUrl?: string): string {
  if (customApiUrl) {
    return customApiUrl;
  }
  if (chain === NetworkModes.Testnet) {
    return DEFAULT_TESTNET_SERVER;
  }
  return DEFAULT_MAINNET_SERVER;
}

/** `protocol://host/path` without a trailing slash, or null for anything that is not a URL. */
export function normalizeApiOrigin(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, '')}`;
  } catch {
    return null;
  }
}

/** The configured public API server for a chain, or null for chains without one. */
export function configuredApiUrlFor(chain: string | undefined): string | null {
  if (chain === NetworkModes.Testnet) return DEFAULT_TESTNET_SERVER;
  if (!chain || chain === NetworkModes.Mainnet) return DEFAULT_MAINNET_SERVER;
  return null;
}

/**
 * Whether `url` is one of the configured public API servers. Server-side code must only attach
 * `EXPLORER_STACKS_API_KEY` to, and only fetch on a visitor's behalf from, these servers: a custom
 * `api` parameter is visitor-controlled and could name any host.
 */
export function isConfiguredApiUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return false;
  }
  return [DEFAULT_MAINNET_SERVER, DEFAULT_TESTNET_SERVER].some(configured => {
    try {
      const c = new URL(configured);
      const base = c.pathname.replace(/\/$/, '');
      return (
        target.origin === c.origin &&
        (base === '' || target.pathname === base || target.pathname.startsWith(`${base}/`))
      );
    } catch {
      return false;
    }
  });
}

/** Whether a server component may fetch from `apiUrl` during render (custom networks stay client-side). */
export function canServerFetch(apiUrl: string | undefined | null): boolean {
  return isConfiguredApiUrl(apiUrl);
}

export function isHiroSubdomain(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    return hostname.endsWith(`.hiro.so`);
  } catch {
    return false;
  }
}
export function isLocalhost(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'localhost';
  } catch {
    return false;
  }
}

export function sanitizeNetworkUrlForTag(url: string | undefined): string {
  if (!url) return 'unknown';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/$/, '')}`;
  } catch {
    return 'invalid';
  }
}
