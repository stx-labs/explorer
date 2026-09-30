import { loadActivityFeed } from '@/app/staking/activity-data';
import { parseActivityGroup } from '@/app/staking/activity-filter';
import { NetworkModes } from '@/common/types/network';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const activity = await loadActivityFeed(
    params.get('chain') ?? NetworkModes.Mainnet,
    params.get('api') ?? undefined,
    parseActivityGroup(params.get('activity') ?? undefined)
  );
  return Response.json(activity, { headers: { 'Cache-Control': 'no-store' } });
}
