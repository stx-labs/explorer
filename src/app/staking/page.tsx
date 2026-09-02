import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';

import { StakingPageClient } from './PageClient';
import { ACTIVITY_FEED_LIMIT } from './consts';
import {
  ActivityGroup,
  Bond,
  BondRegistration,
  BondRewards,
  CycleRewards,
  PoxCycle,
  StakingActivityEvent,
  fetchBondRegistrations,
  fetchBondRewards,
  fetchBonds,
  fetchCycleAccruedSats,
  fetchCycleEndTimes,
  fetchCycleRewards,
  fetchPoxCycles,
  fetchPoxInfo,
  fetchStakingActivity,
} from './data';
import { DailyPrices, fetchDailyPrices } from './prices';
import { burnHeightToApproximateTimestamp, getFeaturedBondIndex } from './projections';
import { DistributionSchedule, getDistributionSchedule } from './projections';

interface StakingSearchParams {
  chain?: string;
  api?: string;
  /** Restricts the activity feed to one group of events. */
  activity?: string;
}

export default async function StakingPage(props: { searchParams: Promise<StakingSearchParams> }) {
  const { chain = NetworkModes.Mainnet, api, activity: activityGroup } = await props.searchParams;

  let bonds: Bond[] = [];
  let cycles: PoxCycle[] = [];
  let poxInfo;
  let distribution: DistributionSchedule | undefined;
  let cycleRewards: Record<number, CycleRewards> = {};
  let pricedCycles: number[] = [];
  let pox5FirstCycleId: number | undefined;
  let activity: StakingActivityEvent[] = [];
  let rewarded: BondRewards | undefined;
  let enrollments: BondRegistration[] = [];

  // Each source is settled independently: a bond fetch failing should not take
  // the Stacking half of the page down with it, and vice versa.
  const [bondsResult, poxResult, cyclesResult] = await Promise.allSettled([
    fetchBonds(chain, api),
    fetchPoxInfo(chain, api),
    fetchPoxCycles(chain, api),
  ]);

  if (bondsResult.status === 'fulfilled') {
    bonds = bondsResult.value.bonds;
  } else {
    logError(bondsResult.reason as Error, 'Staking page: fetch bonds', { chain }, 'error');
  }

  if (poxResult.status === 'fulfilled') {
    poxInfo = poxResult.value;
    const {
      current_burnchain_block_height: currentBurnHeight,
      first_burnchain_block_height: firstBurnchainBlockHeight,
      reward_cycle_length: rewardCycleLength,
    } = poxInfo ?? {};
    if (currentBurnHeight && firstBurnchainBlockHeight != null && rewardCycleLength) {
      distribution = getDistributionSchedule(
        currentBurnHeight,
        firstBurnchainBlockHeight,
        rewardCycleLength,
        Date.now()
      );
    }
  } else {
    logError(poxResult.reason as Error, 'Staking page: fetch pox info', { chain }, 'error');
  }

  if (cyclesResult.status === 'fulfilled') {
    cycles = cyclesResult.value;
  } else {
    logError(cyclesResult.reason as Error, 'Staking page: fetch pox cycles', { chain }, 'error');
  }

  // Per-cycle rewards come from read-only calls on the pox contract, so they
  // need the contract id and the list of cycles to ask about. pox-5 has no
  // record of cycles that ran before it, so we also note where it starts and
  // leave those rows blank rather than showing them as zero.
  if (poxInfo?.contract_id && cycles.length > 0) {
    pox5FirstCycleId = poxInfo.contract_versions?.find(
      version => version.contract_id.split('.')[1] === 'pox-5'
    )?.first_reward_cycle_id;

    const cyclesToPrice = cycles
      .map(cycle => cycle.cycle_number)
      // Cycles that have not started have nothing to report, so do not spend
      // contract calls on them. The current cycle is kept, since we show its
      // rewards-so-far as a separate stat.
      .filter(
        cycleNumber =>
          pox5FirstCycleId !== undefined &&
          cycleNumber >= pox5FirstCycleId &&
          (poxInfo?.current_cycle?.id === undefined || cycleNumber <= poxInfo.current_cycle.id)
      );

    pricedCycles = cyclesToPrice;
    if (cyclesToPrice.length > 0) {
      try {
        cycleRewards = await fetchCycleRewards(cyclesToPrice, poxInfo.contract_id, chain, api);
      } catch (error) {
        logError(error as Error, 'Staking page: fetch cycle rewards', { chain }, 'error');
      }
    }
  }

  // Fixed once so every projected date on the page agrees.
  const nowMs = Date.now();

  // Only cycles that show a rate need a real end time, so the cost tracks the
  // rows that use it rather than the whole page.
  let cycleEndTimes: Record<number, number> = {};
  if (pricedCycles.length > 0 && poxInfo?.reward_cycle_length) {
    try {
      cycleEndTimes = await fetchCycleEndTimes(
        pricedCycles,
        poxInfo.first_burnchain_block_height ?? 0,
        poxInfo.reward_cycle_length,
        chain,
        api
      );
    } catch (error) {
      logError(error as Error, 'Staking page: fetch cycle end times', { chain }, 'error');
    }
  }

  // What the running cycle has taken in so far. The contract only credits this
  // at each distribution, so between them it is measured from Bitcoin payouts.
  let currentCycleAccruedSats: string | undefined;
  if (poxInfo?.reward_cycle_length && poxInfo.current_cycle?.id !== undefined) {
    const cycleStart =
      (poxInfo.first_burnchain_block_height ?? 0) +
      poxInfo.current_cycle.id * poxInfo.reward_cycle_length;
    try {
      const accrued = await fetchCycleAccruedSats(cycleStart, chain, api);
      currentCycleAccruedSats = accrued?.toString();
    } catch (error) {
      logError(error as Error, 'Staking page: fetch cycle accrual', { chain }, 'error');
    }
  }

  // One request per coin covers every cycle on the page, so a settled cycle can
  // be priced at the day it ended rather than at today's rates.
  let prices: DailyPrices | undefined;
  if (cycles.length > 0 && poxInfo?.reward_cycle_length) {
    const oldest = Math.min(...cycles.map(cycle => cycle.cycle_number));
    const startHeight =
      (poxInfo.first_burnchain_block_height ?? 0) + oldest * poxInfo.reward_cycle_length;
    const startMs = burnHeightToApproximateTimestamp(
      startHeight,
      poxInfo.current_burnchain_block_height ?? 0,
      nowMs
    );
    try {
      prices = await fetchDailyPrices(startMs, nowMs);
    } catch (error) {
      logError(error as Error, 'Staking page: fetch daily prices', { chain }, 'error');
    }
  }

  if (poxInfo?.contract_id) {
    try {
      // Only groups the page offers are accepted, so an unknown value in the
      // URL falls back to the unfiltered feed rather than returning nothing.
      const group = (['distributions', 'enrollments', 'unlocks', 'bonds'] as ActivityGroup[]).find(
        candidate => candidate === activityGroup
      );
      rewarded = await fetchBondRewards(poxInfo.contract_id, chain, api);
      activity = await fetchStakingActivity(
        poxInfo.contract_id,
        chain,
        api,
        ACTIVITY_FEED_LIMIT,
        group
      );
    } catch (error) {
      logError(error as Error, 'Staking page: fetch activity', { chain }, 'error');
    }
  }

  // Enrollments in the bond the page features, which drive its breakdown bar.
  const featuredForEnrollments = getFeaturedBondIndex(bonds);
  if (featuredForEnrollments !== undefined) {
    try {
      enrollments = await fetchBondRegistrations(featuredForEnrollments, chain, api);
    } catch (error) {
      logError(error as Error, 'Staking page: fetch enrollments', { chain }, 'error');
    }
  }

  // Stamped once on the server so the timeline and the table agree on "now".

  return (
    <StakingPageClient
      bonds={bonds}
      poxInfo={poxInfo}
      cycles={cycles}
      cycleRewards={cycleRewards}
      pox5FirstCycleId={pox5FirstCycleId}
      currentBurnHeight={poxInfo?.current_burnchain_block_height ?? 0}
      rewardCycleLength={poxInfo?.reward_cycle_length ?? 0}
      prepareCycleLength={poxInfo?.prepare_phase_block_length ?? 0}
      firstBurnchainBlockHeight={poxInfo?.first_burnchain_block_height ?? 0}
      nowMs={nowMs}
      currentCycleAccruedSats={currentCycleAccruedSats}
      prices={prices}
      cycleEndTimes={cycleEndTimes}
      // Only the sizes cross to the client; the addresses stay here.
      enrollments={enrollments.map(enrollment => ({ btc: enrollment.balances?.btc ?? '0' }))}
      activity={activity}
      rewarded={rewarded}
      selectedActivityGroup={activityGroup}
      chain={chain}
    />
  );
}
