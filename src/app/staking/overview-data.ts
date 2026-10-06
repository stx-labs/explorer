import { handleSettledResult } from '@/app/address/[principal]/page-data';

import type { StakingPageData } from './PageClient';
import { PREVIOUS_CYCLES_LIMIT } from './consts';
import {
  createRewardHistoryDeadline,
  fetchBondRegistrations,
  fetchBondRewards,
  fetchBondsPage,
  fetchBurnBlockTimes,
  fetchCycleCalculationHeights,
  fetchCycleRewards,
  fetchPoxCycles,
  fetchPoxInfo,
  handleRewardHistoryResult,
} from './data';
import { fetchFeaturedBond } from './page-data';
import { fetchDailyPrices } from './prices';
import {
  burnHeightToApproximateTimestamp,
  getBondSchedule,
  getFeaturedBondIndex,
  getTimelineBondWindow,
} from './projections';
import { fetchCurrentCycleEstimate } from './reward-estimate';

// Share only the inputs both sections need. Each section awaits its own remaining work.
export function loadStakingOverview(chain: string, api?: string) {
  const base = loadOverviewBase(chain, api);
  const featuredRewards = base.then(async data => {
    const index = getFeaturedBondIndex(data.bonds);
    const [result] = await Promise.allSettled([
      index === undefined
        ? undefined
        : fetchBondRewards(
            [index],
            chain,
            api,
            data.poxInfo?.contract_id,
            data.rewardHistoryDeadline
          ),
    ]);
    return handleRewardHistoryResult(result, 'Staking page: featured bond rewards');
  });
  return {
    bonds: loadBondsOverview(base, featuredRewards, chain, api),
    stacking: loadStackingOverview(base, featuredRewards, chain, api),
  };
}

async function loadOverviewBase(chain: string, api?: string) {
  const nowMs = Date.now();
  const [bondsResult, poxResult] = await Promise.allSettled([
    fetchBondsPage(chain, api),
    fetchPoxInfo(chain, api),
  ]);
  const bondsPage = handleSettledResult(bondsResult, 'Staking page: fetch bonds');
  const poxInfo = handleSettledResult(poxResult, 'Staking page: fetch pox info');
  return {
    bonds: bondsPage?.bonds ?? [],
    bondsUnavailable: bondsPage === undefined,
    poxInfo,
    nowMs,
    currentBurnHeight: poxInfo?.current_burnchain_block_height ?? 0,
    rewardCycleLength: poxInfo?.reward_cycle_length ?? 0,
    prepareCycleLength: poxInfo?.prepare_phase_block_length ?? 0,
    firstBurnchainBlockHeight: poxInfo?.first_burnchain_block_height ?? 0,
    rewardHistoryDeadline: createRewardHistoryDeadline(),
  };
}

type OverviewBase = ReturnType<typeof loadOverviewBase>;
type FeaturedRewards = Promise<Awaited<ReturnType<typeof fetchBondRewards>> | undefined>;

async function loadBondsOverview(
  base: OverviewBase,
  featuredRewards: FeaturedRewards,
  chain: string,
  api?: string
): Promise<StakingPageData> {
  const data = await base;
  const { bonds, poxInfo, currentBurnHeight, rewardCycleLength, prepareCycleLength } = data;
  const featuredIndex = getFeaturedBondIndex(bonds);
  const otherIndexes = bonds.filter(bond => bond.index !== featuredIndex).map(bond => bond.index);
  const heights = getTimelineBondWindow(bonds, featuredIndex, currentBurnHeight).onChain.flatMap(
    bond =>
      Object.values(
        getBondSchedule(
          bond.schedule.activation.bitcoin_height,
          bond.schedule.unlock.bitcoin_height,
          rewardCycleLength,
          prepareCycleLength
        )
      )
  );
  const [rewardsResult, enrollmentsResult, detailResult, timesResult] = await Promise.allSettled([
    otherIndexes.length
      ? fetchBondRewards(otherIndexes, chain, api, poxInfo?.contract_id, data.rewardHistoryDeadline)
      : undefined,
    featuredIndex !== undefined ? fetchBondRegistrations(featuredIndex, chain, api) : undefined,
    featuredIndex !== undefined ? fetchFeaturedBond(featuredIndex, chain, api) : undefined,
    fetchBurnBlockTimes(heights, currentBurnHeight, chain, api),
  ]);
  const featured = await featuredRewards;
  const other = handleRewardHistoryResult(rewardsResult, 'Staking page: other bond rewards');
  const rewarded: StakingPageData['rewarded'] =
    featured || other
      ? {
          byBondIndex: { ...other?.byBondIndex, ...featured?.byBondIndex },
          settlementsByBond: { ...other?.settlementsByBond, ...featured?.settlementsByBond },
          lastCalculationHeightByCycle: {},
        }
      : undefined;
  if (rewarded) {
    for (const [cycle, height] of Object.entries({
      ...other?.lastCalculationHeightByCycle,
      ...featured?.lastCalculationHeightByCycle,
    })) {
      rewarded.lastCalculationHeightByCycle[Number(cycle)] = Math.max(
        height,
        other?.lastCalculationHeightByCycle[Number(cycle)] ?? 0
      );
    }
  }
  const detail = handleSettledResult(detailResult, 'Staking page: bond setup');
  const enrollments = handleSettledResult(enrollmentsResult, 'Staking page: enrollments');
  return {
    ...data,
    bonds: bonds.map(bond => (bond.index === detail?.index ? detail : bond)),
    rewarded,
    enrollments: enrollments?.map(enrollment => ({ btc: enrollment.balances.btc })),
    burnBlockTimes: handleSettledResult(timesResult, 'Staking page: bond dates') ?? {},
    cycles: [],
    cycleRewards: {},
  };
}

async function loadStackingOverview(
  base: OverviewBase,
  featuredRewards: FeaturedRewards,
  chain: string,
  api?: string
): Promise<StakingPageData> {
  const [data, cyclesResult] = await Promise.all([
    base,
    Promise.allSettled([fetchPoxCycles(chain, api)]).then(([result]) => result),
  ]);
  const { poxInfo, currentBurnHeight, rewardCycleLength, firstBurnchainBlockHeight, nowMs } = data;
  const poxCycles = handleSettledResult(cyclesResult, 'Staking page: fetch pox cycles');
  const cycles = (poxCycles ?? [])
    .filter(cycle => cycle.cycle_number <= (poxInfo?.current_cycle?.id ?? -1))
    .sort((a, b) => b.cycle_number - a.cycle_number)
    .slice(0, PREVIOUS_CYCLES_LIMIT + 1);
  const pox5FirstCycleId = poxInfo?.contract_versions?.find(
    version => version.contract_id.split('.')[1] === 'pox-5'
  )?.first_reward_cycle_id;
  const rewardCycles = Array.from(
    new Set([
      ...cycles.map(cycle => cycle.cycle_number),
      ...(poxInfo?.current_cycle?.id === undefined ? [] : [poxInfo.current_cycle.id]),
    ])
  ).filter(cycle => pox5FirstCycleId !== undefined && cycle >= pox5FirstCycleId);
  const settlement = async () => {
    const rewarded = await featuredRewards;
    const known = rewarded?.lastCalculationHeightByCycle;
    // The featured scan already reports timeout. Do not start or log it a second time.
    if (!poxInfo?.contract_id || !rewardCycleLength || Date.now() >= data.rewardHistoryDeadline)
      return known;
    const [result] = await Promise.allSettled([
      fetchCycleCalculationHeights(
        Object.fromEntries(
          rewardCycles
            .filter(cycle => cycle < poxInfo.current_cycle.id)
            .map(cycle => [cycle, firstBurnchainBlockHeight + (cycle + 1) * rewardCycleLength - 1])
        ),
        poxInfo.contract_id,
        chain,
        api,
        known,
        data.rewardHistoryDeadline
      ),
    ]);
    return handleRewardHistoryResult(result, 'Staking page: cycle settlement') ?? known;
  };
  const [rewardsResult, timesResult, pricesResult, estimateResult, heightsResult] =
    await Promise.allSettled([
      poxInfo?.contract_id && rewardCycles.length
        ? fetchCycleRewards(rewardCycles, chain, api, poxInfo.contract_id)
        : undefined,
      fetchBurnBlockTimes(
        cycles.flatMap(cycle => [
          firstBurnchainBlockHeight + cycle.cycle_number * rewardCycleLength,
          firstBurnchainBlockHeight + (cycle.cycle_number + 1) * rewardCycleLength - 1,
        ]),
        currentBurnHeight,
        chain,
        api
      ),
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
        ? fetchCurrentCycleEstimate(poxInfo, data.bonds, chain, api)
        : undefined,
      settlement(),
    ]);
  return {
    ...data,
    cycles,
    pox5FirstCycleId,
    cycleRewards: handleSettledResult(rewardsResult, 'Staking page: cycle rewards') ?? {},
    burnBlockTimes: handleSettledResult(timesResult, 'Staking page: cycle dates') ?? {},
    prices: handleSettledResult(pricesResult, 'Staking page: daily prices'),
    currentCycleEstimate: handleSettledResult(estimateResult, 'Staking page: reward estimate'),
    lastCalculationHeightByCycle: handleRewardHistoryResult(
      heightsResult,
      'Staking page: cycle settlement'
    ),
  };
}
