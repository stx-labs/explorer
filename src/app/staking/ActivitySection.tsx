import { handleSettledResult } from '@/app/address/[principal]/page-data';

import { StakingActivity } from './StakingActivity';
import { ACTIVITY_FEED_LIMIT } from './consts';
import { ActivityGroup, fetchPoxInfo, fetchStakingActivity } from './data';

export async function ActivitySection({
  chain,
  api,
  group,
}: {
  chain: string;
  api?: string;
  group?: ActivityGroup;
}) {
  const [poxResult] = await Promise.allSettled([fetchPoxInfo(chain, api)]);
  const pox = handleSettledResult(poxResult, 'Staking activity: PoX info');
  const [result] = await Promise.allSettled([
    pox ? fetchStakingActivity(pox.contract_id, chain, api, ACTIVITY_FEED_LIMIT, group) : undefined,
  ]);
  const activity = handleSettledResult(result, 'Staking activity: load');
  return (
    <StakingActivity
      events={activity?.events ?? []}
      selectedGroup={group}
      incomplete={activity === undefined || activity.incomplete}
    />
  );
}
