import { handleSettledResult } from '@/app/address/[principal]/page-data';
import { NetworkModes } from '@/common/types/network';

import { ACTIVITY_PAGE_LIMIT } from '../consts';
import { fetchPoxInfo, fetchStakingActivity, parseActivityGroup } from '../data';
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

  const parsedBond = Number(bond);
  const bondIndex = Number.isSafeInteger(parsedBond) && parsedBond > 0 ? parsedBond : undefined;
  const selectedActivityGroup = parseActivityGroup(activityGroup);

  const [poxInfoResult] = await Promise.allSettled([fetchPoxInfo(chain, api)]);
  const poxInfo = handleSettledResult(poxInfoResult, 'Activity page: fetch pox info');
  const [activityResult] = await Promise.allSettled([
    poxInfo?.contract_id
      ? fetchStakingActivity(
          poxInfo.contract_id,
          chain,
          api,
          ACTIVITY_PAGE_LIMIT,
          selectedActivityGroup,
          bondIndex
        )
      : undefined,
  ]);
  const all = handleSettledResult(activityResult, 'Activity page: fetch activity');

  return (
    <ActivityPageClient
      events={all?.events ?? []}
      incomplete={all === undefined || all.incomplete}
      selectedGroup={selectedActivityGroup}
      bondIndex={bondIndex}
    />
  );
}
