import { handleSettledResult } from '@/app/address/[principal]/page-data';
import { NetworkModes } from '@/common/types/network';

import { UnsupportedStakingNetwork } from '../UnsupportedStakingNetwork';
import { ACTIVITY_PAGE_LIMIT } from '../consts';
import { fetchPoxInfo, fetchStakingActivity, parseActivityGroup } from '../data';
import { getStakingPageApiUrl } from '../page-network';
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
  const searchParams = await props.searchParams;
  const { chain = NetworkModes.Mainnet, activity: activityGroup, bond } = searchParams;
  const api = getStakingPageApiUrl('/staking/activity', { ...searchParams });
  if (!api) return <UnsupportedStakingNetwork />;

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
      historyTruncated={all?.historyTruncated}
      selectedGroup={selectedActivityGroup}
      bondIndex={bondIndex}
    />
  );
}
