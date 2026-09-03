import { DEFAULT_MAINNET_SERVER, DEFAULT_TESTNET_SERVER } from '@/common/constants/env';
import { buildContextPack } from '@/common/tx-diagnosis/server';
import { ENGINE_VERSION } from '@/common/tx-diagnosis/types';
import { NetworkModes } from '@/common/types/network';
import { NextRequest } from 'next/server';

/** Transactions are immutable; only an engine change should invalidate a pack. */
const CACHE_CONTROL = 'public, max-age=300, s-maxage=31536000, stale-while-revalidate=86400';
const NEGATIVE_CACHE_CONTROL = 'public, max-age=3600';

const TXID_RE = /^0x[0-9a-fA-F]{64}$/;

function normalizeOrigin(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, '')}`;
  } catch {
    return null;
  }
}

/**
 * Only the configured public Stacks API servers are ever fetched from here. The server-side client
 * attaches the explorer's API key to every request it makes, so an arbitrary `api` parameter would
 * let anyone point that key (and this server's outbound requests) at a host of their choosing.
 * Custom networks therefore have no context pack; the in-page card still works for them.
 */
export function resolveApiUrl(chain: string, api: string | null): string | null {
  const defaults: Record<string, string> = {
    [NetworkModes.Mainnet]: DEFAULT_MAINNET_SERVER,
    [NetworkModes.Testnet]: DEFAULT_TESTNET_SERVER,
  };
  const configured = defaults[chain];
  if (!configured) return null;
  if (!api) return configured;
  const wanted = normalizeOrigin(api);
  const allowed = Object.values(defaults).map(normalizeOrigin);
  return wanted && allowed.includes(wanted) ? wanted : null;
}

function reject(status: number, reason: string, common: Record<string, string>): Response {
  return new Response(reason, {
    status,
    headers: {
      ...common,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': NEGATIVE_CACHE_CONTROL,
    },
  });
}

export async function handleContextPack(
  request: NextRequest,
  params: Promise<{ txId: string }>,
  format: 'markdown' | 'json'
): Promise<Response> {
  const { txId } = await params;
  const sp = request.nextUrl.searchParams;
  const chain = sp.get('chain') || NetworkModes.Mainnet;

  const common = {
    'X-Robots-Tag': 'noindex',
    'X-Diagnosis-Engine': ENGINE_VERSION,
  };

  if (!TXID_RE.test(txId)) {
    return reject(400, 'Not a transaction id.', common);
  }

  // The pack for a given transaction and engine version never changes, so a matching validator can
  // be answered before any upstream request is made.
  const etag = `W/"${txId.toLowerCase()}-v${ENGINE_VERSION}-${format}"`;
  if (request.headers.get('if-none-match') === etag) {
    // A 304 must repeat the caching headers of the 200 it stands in for (RFC 9110 §15.4.5).
    return new Response(null, {
      status: 304,
      headers: { ...common, ETag: etag, 'Cache-Control': CACHE_CONTROL },
    });
  }

  const apiUrl = resolveApiUrl(chain, sp.get('api'));
  if (!apiUrl) {
    return reject(
      400,
      'Context packs are only available for the public mainnet and testnet APIs (chain=mainnet|testnet, no custom api).',
      common
    );
  }

  const result = await buildContextPack({
    txId: txId.toLowerCase(),
    apiUrl,
    network: chain,
    explorerBaseUrl: request.nextUrl.origin,
  });

  if (result.status !== 200) {
    return new Response(result.reason, {
      status: 404,
      headers: {
        ...common,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  }

  if (format === 'json') {
    return new Response(JSON.stringify(result.json, null, 2), {
      status: 200,
      headers: {
        ...common,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': CACHE_CONTROL,
        ETag: etag,
      },
    });
  }
  return new Response(result.markdown, {
    status: 200,
    headers: {
      ...common,
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': CACHE_CONTROL,
      ETag: etag,
    },
  });
}
