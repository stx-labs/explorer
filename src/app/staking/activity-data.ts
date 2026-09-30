import { ensureError, logError } from '@/common/utils/error-utils';

import type { ActivityGroup } from './activity-filter';
import { ACTIVITY_FEED_LIMIT } from './consts';
import { StakingActivityResult, fetchPoxInfo, fetchStakingActivity } from './data';

export async function loadActivityFeed(
  chain: string,
  api?: string,
  group?: ActivityGroup
): Promise<StakingActivityResult> {
  try {
    const pox = await fetchPoxInfo(chain, api);
    return await fetchStakingActivity(pox.contract_id, chain, api, ACTIVITY_FEED_LIMIT, group);
  } catch (error) {
    logError(ensureError(error), 'Staking activity: load', { chain });
    return { events: [], incomplete: true };
  }
}
