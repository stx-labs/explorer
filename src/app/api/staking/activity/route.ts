import { getAllowedStakingApiUrl } from '@/api/server-api-origin';
import { loadActivityFeed } from '@/app/staking/activity-data';
import { parseActivityGroup } from '@/app/staking/activity-filter';
import { NetworkModes } from '@/common/types/network';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const chain = params.get('chain') ?? NetworkModes.Mainnet;
  const api = getAllowedStakingApiUrl(chain, params.get('api') ?? undefined);
  if (!api) {
    return Response.json({ error: 'Unsupported staking API' }, { status: 400 });
  }
  try {
    const activity = await loadActivityFeed(
      chain,
      api,
      parseActivityGroup(params.get('activity') ?? undefined),
      request.signal
    );
    return Response.json(activity, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    throw error;
  }
}
