import { handleSettledResult } from '@/app/address/[principal]/page-data';

import type { ActivityGroup } from './activity-filter';
import { ACTIVITY_FEED_LIMIT } from './consts';
import { StakingActivityResult, fetchPoxInfo, fetchStakingActivity } from './data';

export async function loadActivityFeed(
  chain: string,
  api?: string,
  group?: ActivityGroup
): Promise<StakingActivityResult> {
  const [poxResult] = await Promise.allSettled([fetchPoxInfo(chain, api)]);
  const pox = handleSettledResult(poxResult, 'Staking activity: PoX info');
  const [result] = await Promise.allSettled([
    pox ? fetchStakingActivity(pox.contract_id, chain, api, ACTIVITY_FEED_LIMIT, group) : undefined,
  ]);
  return handleSettledResult(result, 'Staking activity: load') ?? { events: [], incomplete: true };
}
