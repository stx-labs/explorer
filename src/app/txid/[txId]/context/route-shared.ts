import { buildContextPack } from '@/common/tx-diagnosis/server';
import { ENGINE_VERSION } from '@/common/tx-diagnosis/types';
import { NetworkModes } from '@/common/types/network';
import { configuredApiUrlFor, normalizeApiOrigin } from '@/common/utils/network-utils';
import { NextRequest } from 'next/server';

/** Transactions are immutable; only an engine change should invalidate a pack. */
const CACHE_CONTROL = 'public, max-age=300, s-maxage=31536000, stale-while-revalidate=86400';
const NEGATIVE_CACHE_CONTROL = 'public, max-age=3600';

const TXID_RE = /^0x[0-9a-fA-F]{64}$/;
/** Anything else in the query string only serves to bust caches or probe; reject it up front. */
const ALLOWED_QUERY = new Set(['chain', 'api']);

/**
 * Only the configured public Stacks API server for the selected chain is ever fetched from here.
 * The server-side client attaches the explorer's API key to those servers, and custom `api` hosts
 * are visitor-controlled, so they are refused rather than fetched. The in-page card still works for
 * custom networks; it just has no context pack.
 */
export function resolveApiUrl(chain: string, api: string | null): string | null {
  const configured = normalizeApiOrigin(configuredApiUrlFor(chain));
  if (!configured) return null;
  if (!api) return configured;
  return normalizeApiOrigin(api) === configured ? configured : null;
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
  const unexpected = Array.from(sp.keys()).filter(k => !ALLOWED_QUERY.has(k));
  if (unexpected.length) {
    return reject(400, `Unexpected query parameter: ${unexpected.join(', ')}.`, common);
  }
  const apiUrl = resolveApiUrl(chain, sp.get('api'));
  if (!apiUrl) {
    return reject(
      400,
      'Context packs are only available for the public mainnet and testnet APIs (chain=mainnet|testnet; api, if given, must be that chain’s configured server).',
      common
    );
  }

  // The pack for a transaction on a chain never changes within an engine version, so a matching
  // validator is answered before any upstream request. (A client can only hold a validator for a
  // representation it received, so a forged one for an unknown transaction gains nothing.)
  const etag = `W/"${txId.toLowerCase()}-${chain}-v${ENGINE_VERSION}-${format}"`;
  if (request.headers.get('if-none-match') === etag) {
    // A 304 must repeat the caching headers of the 200 it stands in for (RFC 9110 §15.4.5).
    return new Response(null, {
      status: 304,
      headers: { ...common, ETag: etag, 'Cache-Control': CACHE_CONTROL },
    });
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
