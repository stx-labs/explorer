import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';

import { StakingPageClient } from './PageClient';
import { ACTIVITY_FEED_LIMIT } from './consts';
import {
  ActivityGroup,
  Bond,
  CycleRewards,
  PoxCycle,
  StakingActivityEvent,
  fetchBonds,
  fetchCycleRewards,
  fetchPoxCycles,
  fetchPoxInfo,
  fetchStakingActivity,
} from './data';
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
  let bondsTotal = 0;
  let cycles: PoxCycle[] = [];
  let poxInfo;
  let distribution: DistributionSchedule | undefined;
  let cycleRewards: Record<number, CycleRewards> = {};
  let pox5FirstCycleId: number | undefined;
  let activity: StakingActivityEvent[] = [];

  // Each source is settled independently: a bond fetch failing should not take
  // the Stacking half of the page down with it, and vice versa.
  const [bondsResult, poxResult, cyclesResult] = await Promise.allSettled([
    fetchBonds(chain, api),
    fetchPoxInfo(chain, api),
    fetchPoxCycles(chain, api),
  ]);

  if (bondsResult.status === 'fulfilled') {
    bonds = bondsResult.value.bonds;
    bondsTotal = bondsResult.value.total;
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

    if (cyclesToPrice.length > 0) {
      try {
        cycleRewards = await fetchCycleRewards(cyclesToPrice, poxInfo.contract_id, chain, api);
      } catch (error) {
        logError(error as Error, 'Staking page: fetch cycle rewards', { chain }, 'error');
      }
    }
  }

  if (poxInfo?.contract_id) {
    try {
      // Only groups the page offers are accepted, so an unknown value in the
      // URL falls back to the unfiltered feed rather than returning nothing.
      const group = (['distributions', 'enrollments', 'unlocks', 'bonds'] as ActivityGroup[]).find(
        candidate => candidate === activityGroup
      );
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

  // Stamped once on the server so the timeline and the table agree on "now".
  const nowMs = Date.now();

  return (
    <StakingPageClient
      bonds={bonds}
      bondsTotal={bondsTotal}
      poxInfo={poxInfo}
      cycles={cycles}
      cycleRewards={cycleRewards}
      pox5FirstCycleId={pox5FirstCycleId}
      currentBurnHeight={poxInfo?.current_burnchain_block_height ?? 0}
      rewardCycleLength={poxInfo?.reward_cycle_length ?? 0}
      prepareCycleLength={poxInfo?.prepare_phase_block_length ?? 0}
      firstBurnchainBlockHeight={poxInfo?.first_burnchain_block_height ?? 0}
      nowMs={nowMs}
      activity={activity}
      selectedActivityGroup={activityGroup}
      chain={chain}
    />
  );
}
