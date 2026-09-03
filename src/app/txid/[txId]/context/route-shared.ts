import { buildContextPack } from '@/common/tx-diagnosis/server';
import { ENGINE_VERSION } from '@/common/tx-diagnosis/types';
import { NetworkModes } from '@/common/types/network';
import { getApiUrl } from '@/common/utils/network-utils';
import { NextRequest } from 'next/server';

/** Transactions are immutable; only an engine change should invalidate a pack. */
const CACHE_CONTROL = 'public, max-age=300, s-maxage=31536000, stale-while-revalidate=86400';

export async function handleContextPack(
  request: NextRequest,
  params: Promise<{ txId: string }>,
  format: 'markdown' | 'json'
): Promise<Response> {
  const { txId } = await params;
  const sp = request.nextUrl.searchParams;
  const chain = sp.get('chain') || NetworkModes.Mainnet;
  const api = sp.get('api') || undefined;
  const apiUrl = getApiUrl(chain, api);

  const result = await buildContextPack({
    txId,
    apiUrl,
    network: chain,
    explorerBaseUrl: request.nextUrl.origin,
  });

  const common = {
    'X-Robots-Tag': 'noindex',
    'X-Diagnosis-Engine': ENGINE_VERSION,
  };

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

  const etag = `W/"${txId}-v${ENGINE_VERSION}-${format}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ...common, ETag: etag } });
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
