import { aggregateWatchlistBalances } from '@/common/queries/watchlistBalancesBatch';
import { NextRequest, NextResponse } from 'next/server';

function isAllowedWatchlistProxyTarget(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname;
    return (
      h.endsWith('.hiro.so') ||
      h.endsWith('.stacks.co') ||
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === 'host.docker.internal' ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)
    );
  } catch {
    return false;
  }
}

const MAX_ADDRESSES = 200;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const addresses = (body as { addresses?: unknown }).addresses;
  const apiBaseUrl = (body as { apiBaseUrl?: unknown }).apiBaseUrl;

  if (!Array.isArray(addresses) || typeof apiBaseUrl !== 'string') {
    return NextResponse.json(
      { error: 'Expected { addresses: string[], apiBaseUrl: string }' },
      { status: 400 }
    );
  }

  const list = addresses.filter((a): a is string => typeof a === 'string' && a.length > 0);
  if (list.length === 0) {
    return NextResponse.json({ balances: {} });
  }
  if (list.length > MAX_ADDRESSES) {
    return NextResponse.json({ error: `At most ${MAX_ADDRESSES} addresses` }, { status: 400 });
  }

  if (!isAllowedWatchlistProxyTarget(apiBaseUrl)) {
    return NextResponse.json(
      { error: 'API base URL is not allowed for this proxy' },
      { status: 403 }
    );
  }

  try {
    const balances = await aggregateWatchlistBalances(list, apiBaseUrl);
    return NextResponse.json({ balances });
  } catch (e) {
    console.error('watchlist/balances aggregate failed', e);
    return NextResponse.json({ error: 'Aggregation failed' }, { status: 502 });
  }
}
