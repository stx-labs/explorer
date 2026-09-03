import { NetworkModes } from '@/common/types/network';

import { StakingPageClient } from './PageClient';
import { ACTIVITY_FEED_LIMIT } from './consts';
import type { CycleRewards } from './data';
import {
  fetchBondRegistrations,
  fetchBondRewards,
  fetchBondsPage,
  fetchCycleAccruedSats,
  fetchCycleEndTimes,
  fetchCycleRewards,
  fetchPoxCycles,
  fetchPoxInfo,
  fetchStakingActivity,
  parseActivityGroup,
} from './data';
import { load } from './load';
import { fetchDailyPrices } from './prices';
import { burnHeightToApproximateTimestamp, getFeaturedBondIndex } from './projections';

interface StakingSearchParams {
  chain?: string;
  api?: string;
  activity?: string;
}

export default async function StakingPage(props: { searchParams: Promise<StakingSearchParams> }) {
  const { chain = NetworkModes.Mainnet, api, activity: activityGroup } = await props.searchParams;
  const selectedActivityGroup = parseActivityGroup(activityGroup);
  const nowMs = Date.now();

  const [bondsPage, poxInfo, poxCycles] = await Promise.all([
    load(fetchBondsPage(chain, api), 'Staking page: fetch bonds', chain),
    load(fetchPoxInfo(chain, api), 'Staking page: fetch pox info', chain),
    load(fetchPoxCycles(chain, api), 'Staking page: fetch pox cycles', chain),
  ]);

  const bonds = bondsPage?.bonds ?? [];
  const cycles = poxCycles ?? [];
  const pox5FirstCycleId = poxInfo?.contract_versions?.find(
    version => version.contract_id.split('.')[1] === 'pox-5'
  )?.first_reward_cycle_id;
  const pricedCycles = cycles
    .map(cycle => cycle.cycle_number)
    .filter(
      cycleNumber =>
        pox5FirstCycleId !== undefined &&
        cycleNumber >= pox5FirstCycleId &&
        (poxInfo?.current_cycle?.id === undefined || cycleNumber <= poxInfo.current_cycle.id)
    );

  const firstBurnchainBlockHeight = poxInfo?.first_burnchain_block_height ?? 0;
  const rewardCycleLength = poxInfo?.reward_cycle_length ?? 0;
  const currentCycleId = poxInfo?.current_cycle?.id;
  const currentCycleStart =
    rewardCycleLength && currentCycleId !== undefined
      ? firstBurnchainBlockHeight + currentCycleId * rewardCycleLength
      : undefined;
  const pricesStart =
    cycles.length > 0 && rewardCycleLength
      ? burnHeightToApproximateTimestamp(
          firstBurnchainBlockHeight +
            Math.min(...cycles.map(cycle => cycle.cycle_number)) * rewardCycleLength,
          poxInfo?.current_burnchain_block_height ?? 0,
          nowMs
        )
      : undefined;
  const featuredBondIndex = getFeaturedBondIndex(bonds);

  const [
    loadedCycleRewards,
    loadedCycleEndTimes,
    currentCycleAccrued,
    prices,
    rewarded,
    activity,
    enrollments,
  ] = await Promise.all([
    poxInfo?.contract_id && pricedCycles.length > 0
      ? load(
          fetchCycleRewards(pricedCycles, poxInfo.contract_id, chain, api),
          'Staking page: fetch cycle rewards',
          chain
        )
      : undefined,
    pricedCycles.length > 0 && rewardCycleLength
      ? load(
          fetchCycleEndTimes(
            pricedCycles,
            firstBurnchainBlockHeight,
            rewardCycleLength,
            chain,
            api
          ),
          'Staking page: fetch cycle end times',
          chain
        )
      : undefined,
    currentCycleStart !== undefined
      ? load(
          fetchCycleAccruedSats(currentCycleStart, chain, api),
          'Staking page: fetch cycle accrual',
          chain
        )
      : undefined,
    pricesStart !== undefined
      ? load(fetchDailyPrices(pricesStart, nowMs), 'Staking page: fetch daily prices', chain)
      : undefined,
    poxInfo?.contract_id
      ? load(
          fetchBondRewards(poxInfo.contract_id, chain, api),
          'Staking page: fetch bond rewards',
          chain
        )
      : undefined,
    poxInfo?.contract_id
      ? load(
          fetchStakingActivity(
            poxInfo.contract_id,
            chain,
            api,
            ACTIVITY_FEED_LIMIT,
            selectedActivityGroup
          ),
          'Staking page: fetch activity',
          chain
        )
      : undefined,
    featuredBondIndex !== undefined
      ? load(
          fetchBondRegistrations(featuredBondIndex, chain, api),
          'Staking page: fetch enrollments',
          chain
        )
      : undefined,
  ]);

  const cycleRewards: Record<number, CycleRewards> = loadedCycleRewards ?? {};
  const cycleEndTimes = loadedCycleEndTimes ?? {};

  return (
    <StakingPageClient
      bonds={bonds}
      poxInfo={poxInfo}
      cycles={cycles}
      cycleRewards={cycleRewards}
      pox5FirstCycleId={pox5FirstCycleId}
      currentBurnHeight={poxInfo?.current_burnchain_block_height ?? 0}
      rewardCycleLength={rewardCycleLength}
      prepareCycleLength={poxInfo?.prepare_phase_block_length ?? 0}
      firstBurnchainBlockHeight={firstBurnchainBlockHeight}
      nowMs={nowMs}
      currentCycleAccruedSats={currentCycleAccrued?.toString()}
      prices={prices}
      cycleEndTimes={cycleEndTimes}
      enrollments={(enrollments ?? []).map(enrollment => ({
        btc: enrollment.balances?.btc ?? '0',
      }))}
      activity={activity ?? []}
      rewarded={rewarded}
      selectedActivityGroup={selectedActivityGroup}
    />
  );
}
