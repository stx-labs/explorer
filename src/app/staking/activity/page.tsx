import { NetworkModes } from '@/common/types/network';

import { ACTIVITY_PAGE_LIMIT } from '../consts';
import { fetchPoxInfo, fetchStakingActivity, parseActivityGroup } from '../data';
import { load } from '../load';
import { ActivityPageClient } from './PageClient';

interface ActivitySearchParams {
  chain?: string;
  api?: string;
  activity?: string;
  bond?: string;
}

export default async function StakingActivityPage(props: {
  searchParams: Promise<ActivitySearchParams>;
}) {
  const {
    chain = NetworkModes.Mainnet,
    api,
    activity: activityGroup,
    bond,
  } = await props.searchParams;

  const parsedBond = Number.parseInt(bond ?? '', 10);
  const bondIndex = Number.isFinite(parsedBond) ? parsedBond : undefined;
  const selectedActivityGroup = parseActivityGroup(activityGroup);

  const poxInfo = await load(fetchPoxInfo(chain, api), 'Activity page: fetch pox info', chain);
  const all = poxInfo?.contract_id
    ? await load(
        fetchStakingActivity(
          poxInfo.contract_id,
          chain,
          api,
          ACTIVITY_PAGE_LIMIT,
          selectedActivityGroup
        ),
        'Activity page: fetch activity',
        chain
      )
    : undefined;
  const events = (all ?? []).filter(
    event => bondIndex === undefined || event.bondIndex === bondIndex
  );

  return (
    <ActivityPageClient
      events={events}
      selectedGroup={selectedActivityGroup}
      bondIndex={bondIndex}
    />
  );
}
