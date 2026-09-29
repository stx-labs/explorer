import { handleSettledResult } from '@/app/address/[principal]/page-data';
import { NetworkModes } from '@/common/types/network';

import { StakingPageClient } from './PageClient';
import { ACTIVITY_FEED_LIMIT, PREVIOUS_CYCLES_LIMIT } from './consts';
import {
  fetchBondRegistrations,
  fetchBondRewards,
  fetchBondsPage,
  fetchBurnBlockTimes,
  fetchCycleRewards,
  fetchPoxCycles,
  fetchPoxInfo,
  fetchStakingActivity,
  parseActivityGroup,
} from './data';
import { fetchFeaturedBond } from './page-data';
import { fetchDailyPrices } from './prices';
import {
  burnHeightToApproximateTimestamp,
  getBondSchedule,
  getFeaturedBondIndex,
} from './projections';
import { fetchCurrentCycleEstimate } from './reward-estimate';

interface StakingSearchParams {
  chain?: string;
  api?: string;
  activity?: string;
}

export default async function StakingPage(props: { searchParams: Promise<StakingSearchParams> }) {
  const { chain = NetworkModes.Mainnet, api, activity: activityGroup } = await props.searchParams;
  const selectedActivityGroup = parseActivityGroup(activityGroup);
  const nowMs = Date.now();
  const [bondsPageResult, poxInfoResult, poxCyclesResult] = await Promise.allSettled([
    fetchBondsPage(chain, api),
    fetchPoxInfo(chain, api),
    fetchPoxCycles(chain, api),
  ]);
  const bondsPage = handleSettledResult(bondsPageResult, 'Staking page: fetch bonds');
  const poxInfo = handleSettledResult(poxInfoResult, 'Staking page: fetch pox info');
  const poxCycles = handleSettledResult(poxCyclesResult, 'Staking page: fetch pox cycles');
  const bonds = bondsPage?.bonds ?? [];
  const cycles = (poxCycles ?? [])
    .filter(cycle => cycle.cycle_number <= (poxInfo?.current_cycle?.id ?? -1))
    .sort((a, b) => b.cycle_number - a.cycle_number)
    .slice(0, PREVIOUS_CYCLES_LIMIT + 1);
  const pox5FirstCycleId = poxInfo?.contract_versions?.find(
    version => version.contract_id.split('.')[1] === 'pox-5'
  )?.first_reward_cycle_id;
  const rewardCycleLength = poxInfo?.reward_cycle_length ?? 0;
  const prepareCycleLength = poxInfo?.prepare_phase_block_length ?? 0;
  const firstBurnchainBlockHeight = poxInfo?.first_burnchain_block_height ?? 0;
  const currentBurnHeight = poxInfo?.current_burnchain_block_height ?? 0;
  const currentCycleId = poxInfo?.current_cycle?.id;
  const rewardCycles = Array.from(
    new Set([
      ...cycles.map(c => c.cycle_number),
      ...(currentCycleId === undefined ? [] : [currentCycleId]),
    ])
  ).filter(cycle => pox5FirstCycleId !== undefined && cycle >= pox5FirstCycleId);
  const featuredIndex = getFeaturedBondIndex(bonds);
  const heights = bonds.flatMap(bond =>
    Object.values(
      getBondSchedule(
        bond.schedule.activation.bitcoin_height,
        bond.schedule.unlock.bitcoin_height,
        rewardCycleLength,
        prepareCycleLength
      )
    )
  );
  heights.push(
    ...cycles.flatMap(cycle => [
      firstBurnchainBlockHeight + cycle.cycle_number * rewardCycleLength,
      firstBurnchainBlockHeight + (cycle.cycle_number + 1) * rewardCycleLength - 1,
    ])
  );
  const [
    cycleRewardsResult,
    rewardedResult,
    activityResult,
    enrollmentsResult,
    featuredDetailResult,
    burnBlockTimesResult,
    pricesResult,
    currentCycleEstimateResult,
  ] = await Promise.allSettled([
    poxInfo?.contract_id && rewardCycles.length
      ? fetchCycleRewards(rewardCycles, poxInfo.contract_id, chain, api)
      : undefined,
    poxInfo?.contract_id ? fetchBondRewards(poxInfo.contract_id, chain, api) : undefined,
    poxInfo?.contract_id
      ? fetchStakingActivity(
          poxInfo.contract_id,
          chain,
          api,
          ACTIVITY_FEED_LIMIT,
          selectedActivityGroup
        )
      : undefined,
    featuredIndex !== undefined ? fetchBondRegistrations(featuredIndex, chain, api) : undefined,
    featuredIndex !== undefined ? fetchFeaturedBond(featuredIndex, chain, api) : undefined,
    fetchBurnBlockTimes(heights, currentBurnHeight, chain, api),
    cycles.length && rewardCycleLength
      ? fetchDailyPrices(
          burnHeightToApproximateTimestamp(
            firstBurnchainBlockHeight +
              Math.min(...cycles.map(cycle => cycle.cycle_number)) * rewardCycleLength,
            currentBurnHeight,
            nowMs
          ),
          nowMs
        )
      : undefined,
    poxInfo?.contract_id.split('.')[1] === 'pox-5' && rewardCycles.length
      ? fetchCurrentCycleEstimate(poxInfo, bonds, chain, api)
      : undefined,
  ]);
  const cycleRewards = handleSettledResult(cycleRewardsResult, 'Staking page: cycle rewards');
  const rewarded = handleSettledResult(rewardedResult, 'Staking page: bond rewards');
  const activity = handleSettledResult(activityResult, 'Staking page: activity');
  const enrollments = handleSettledResult(enrollmentsResult, 'Staking page: enrollments');
  const featuredDetail = handleSettledResult(featuredDetailResult, 'Staking page: bond setup');
  const burnBlockTimes = handleSettledResult(
    burnBlockTimesResult,
    'Staking page: burn block times'
  );
  const prices = handleSettledResult(pricesResult, 'Staking page: daily prices');
  const currentCycleEstimate = handleSettledResult(
    currentCycleEstimateResult,
    'Staking page: reward estimate'
  );
  return (
    <StakingPageClient
      currentCycleEstimate={currentCycleEstimate}
      prices={prices}
      bonds={bonds.map(bond => (bond.index === featuredDetail?.index ? featuredDetail : bond))}
      bondsUnavailable={bondsPage === undefined}
      poxInfo={poxInfo}
      cycles={cycles}
      cycleRewards={cycleRewards ?? {}}
      pox5FirstCycleId={pox5FirstCycleId}
      currentBurnHeight={currentBurnHeight}
      rewardCycleLength={rewardCycleLength}
      prepareCycleLength={prepareCycleLength}
      firstBurnchainBlockHeight={firstBurnchainBlockHeight}
      nowMs={nowMs}
      burnBlockTimes={burnBlockTimes ?? {}}
      enrollments={enrollments?.map(enrollment => ({ btc: enrollment.balances.btc }))}
      activity={activity?.events ?? []}
      activityIncomplete={activity === undefined || activity.incomplete}
      rewarded={rewarded}
      selectedActivityGroup={selectedActivityGroup}
    />
  );
}
