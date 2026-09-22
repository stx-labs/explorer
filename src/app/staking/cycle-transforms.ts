import { MICROSTACKS_IN_STACKS } from '@/common/utils/utils';

import type { CycleRewards, PoxCycle } from './data';
import { DailyPrices, getCyclePrices } from './prices';
import {
  getCycleRewardsPerStx,
  getCycleStackerRewardsSatsBigInt,
  getStackingYieldForCompletedCycle,
} from './projections';
import { formatBurnDate, formatDateWithYear } from './utils';

export interface CycleRow {
  cycleNumber: number;
  totalStackedStx?: number;
  totalSigners: number;
  rewardsSats: bigint;
  satsPerStx?: number;
  apyPercent?: number;
  yieldEstimated: boolean;
  historic?: { rewardsBtc: number; apyPercent: number };
  settled: boolean;
  hasRewardData: boolean;
  startedHeight: number;
  startedDate: string;
  endedHeight: number;
  endedDate: string;
}

export function toCycleRow({
  cycle,
  rewards,
  pox5FirstCycleId,
  cycleStartHeight,
  burnBlockTimes,
  lastCalculationHeightByCycle,
  historic,
  currentBurnHeight,
  nowMs,
  prices,
  btcPrice,
  stxPrice,
}: {
  cycle: PoxCycle;
  rewards?: CycleRewards;
  pox5FirstCycleId?: number;
  cycleStartHeight: (cycle: number) => number;
  burnBlockTimes: Record<number, number>;
  lastCalculationHeightByCycle?: Record<number, number>;
  historic?: Record<number, { rewardsBtc: number; apyPercent: number }>;
  currentBurnHeight: number;
  nowMs: number;
  prices?: DailyPrices;
  btcPrice?: number;
  stxPrice?: number;
}): CycleRow {
  const isPrePox5 = pox5FirstCycleId !== undefined && cycle.cycle_number < pox5FirstCycleId;
  const hasRewardData =
    rewards !== undefined &&
    pox5FirstCycleId !== undefined &&
    cycle.cycle_number >= pox5FirstCycleId;
  const startedHeight = cycleStartHeight(cycle.cycle_number);
  const endedHeight = cycleStartHeight(cycle.cycle_number + 1) - 1;
  const settled = (lastCalculationHeightByCycle?.[cycle.cycle_number] ?? -1) >= endedHeight;
  const endedMs = burnBlockTimes[endedHeight];
  const historicalPrices =
    prices && endedMs !== undefined ? getCyclePrices(prices, endedMs) : undefined;
  const hasHistoricalPrices =
    historicalPrices?.btcPriceUsd !== undefined && historicalPrices?.stxPriceUsd !== undefined;
  const apy =
    hasRewardData && settled
      ? getStackingYieldForCompletedCycle({
          rewardsPerMicroStx: rewards.rewardsPerMicroStx,
          rewardCycleLength: endedHeight - startedHeight + 1,
          btcPriceUsd: hasHistoricalPrices ? historicalPrices.btcPriceUsd : btcPrice,
          stxPriceUsd: hasHistoricalPrices ? historicalPrices.stxPriceUsd : stxPrice,
        })
      : undefined;
  return {
    cycleNumber: cycle.cycle_number,
    apyPercent: apy?.apyPercent,
    yieldEstimated: !hasHistoricalPrices,
    totalStackedStx: hasRewardData
      ? Number(rewards.stakedMicroStx) / MICROSTACKS_IN_STACKS
      : isPrePox5
        ? Number(cycle.total_stacked_amount) / MICROSTACKS_IN_STACKS
        : undefined,
    historic: isPrePox5 ? historic?.[cycle.cycle_number] : undefined,
    totalSigners: cycle.total_signers ?? 0,
    rewardsSats: hasRewardData
      ? getCycleStackerRewardsSatsBigInt(rewards.rewardsPerMicroStx, rewards.stakedMicroStx)
      : BigInt(0),
    satsPerStx: hasRewardData ? getCycleRewardsPerStx(rewards.rewardsPerMicroStx) : undefined,
    hasRewardData,
    settled,
    startedHeight,
    endedHeight,
    startedDate: formatBurnDate(
      startedHeight,
      currentBurnHeight,
      nowMs,
      burnBlockTimes,
      formatDateWithYear
    ),
    endedDate: formatBurnDate(
      endedHeight,
      currentBurnHeight,
      nowMs,
      burnBlockTimes,
      formatDateWithYear
    ),
  };
}
