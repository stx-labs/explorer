import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';

import { ACTIVITY_PAGE_LIMIT } from '../consts';
import { ActivityGroup, StakingActivityEvent, fetchPoxInfo, fetchStakingActivity } from '../data';
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

  let events: StakingActivityEvent[] = [];
  try {
    const poxInfo = await fetchPoxInfo(chain, api);
    if (poxInfo?.contract_id) {
      // Only groups the page offers are accepted, so an unknown value in the
      // URL falls back to the unfiltered feed rather than returning nothing.
      const group = (['distributions', 'enrollments', 'unlocks', 'bonds'] as ActivityGroup[]).find(
        candidate => candidate === activityGroup
      );
      const all = await fetchStakingActivity(
        poxInfo.contract_id,
        chain,
        api,
        ACTIVITY_PAGE_LIMIT,
        group
      );
      // A bond's own transactions are the subset whose events name it.
      events = bondIndex === undefined ? all : all.filter(event => event.bondIndex === bondIndex);
    }
  } catch (error) {
    logError(error as Error, 'Activity page: fetch activity', { chain }, 'error');
  }

  return <ActivityPageClient events={events} selectedGroup={activityGroup} bondIndex={bondIndex} />;
}
