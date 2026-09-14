'use client';

import { MICROSTACKS_IN_STACKS, abbreviateNumber } from '@/common/utils/utils';
import { Text } from '@/ui/Text';
import { ColumnDef } from '@tanstack/react-table';

import { AnnotatedValue, NO_VALUE } from './AnnotatedValue';
import { CycleRewards, PoxCycle } from './data';
import { DailyPrices, getCyclePrices } from './prices';
import {
  getCycleRewardsPerStx,
  getCycleStackerRewardsSatsBigInt,
  getStackingYieldForCompletedCycle,
} from './projections';
import { formatBurnDate, formatDateWithYear, formatSbtc } from './utils';

const NO_REWARD_DATA = 'On-chain reward data is unavailable for this cycle.';

const FROM_STACKING_TRACKER =
  'This cycle predates PoX-5. Historical rewards and gross yield come from stacking-tracker.com.';

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

export const cycleColumns: ColumnDef<CycleRow>[] = [
  {
    id: 'cycleNumber',
    header: 'Cycle',
    accessorKey: 'cycleNumber',
    enableSorting: false,
    size: 70,
    cell: info => (
      <Text textStyle="text-medium-sm">{(info.getValue() as number).toLocaleString()}</Text>
    ),
  },
  {
    id: 'totalStackedStx',
    header: 'STX-only stacked',
    accessorKey: 'totalStackedStx',
    enableSorting: false,
    size: 120,
    cell: info => (
      <Text textStyle="text-regular-sm" whiteSpace="nowrap">
        {info.getValue() === undefined
          ? NO_VALUE
          : `${abbreviateNumber(info.getValue() as number, 1)} STX`}
      </Text>
    ),
  },
  {
    id: 'startedHeight',
    header: 'Started',
    accessorKey: 'startedHeight',
    enableSorting: false,
    size: 170,
    cell: info => {
      const row = info.row.original;
      return (
        <Text textStyle="text-regular-sm" whiteSpace="nowrap" suppressHydrationWarning>
          #{row.startedHeight.toLocaleString()} · {row.startedDate}
        </Text>
      );
    },
  },
  {
    id: 'endedHeight',
    header: 'Ended',
    accessorKey: 'endedHeight',
    enableSorting: false,
    size: 170,
    cell: info => {
      const row = info.row.original;
      return (
        <Text textStyle="text-regular-sm" whiteSpace="nowrap" suppressHydrationWarning>
          #{row.endedHeight.toLocaleString()} · {row.endedDate}
        </Text>
      );
    },
  },
  {
    id: 'rewardsSats',
    header: 'Rewards',
    accessorKey: 'rewardsSats',
    enableSorting: false,
    size: 150,
    meta: {
      textAlign: 'right',
      tooltip: 'PoX-5 rows show sBTC credited to STX-only stakers before signer fees.',
    },
    cell: info => {
      const row = info.row.original;
      if (row.historic)
        return (
          <AnnotatedValue
            value={`${row.historic.rewardsBtc.toFixed(2)} BTC`}
            note={FROM_STACKING_TRACKER}
          />
        );
      if (!row.hasRewardData) return <AnnotatedValue value={NO_VALUE} note={NO_REWARD_DATA} />;
      return (
        <AnnotatedValue
          value={formatSbtc(row.rewardsSats, 2)}
          note={
            row.settled
              ? undefined
              : 'Final reward calculation pending or unverified. Credits may be partial.'
          }
        />
      );
    },
  },
  {
    id: 'apyPercent',
    header: 'Gross yield',
    accessorKey: 'apyPercent',
    enableSorting: false,
    size: 160,
    meta: {
      textAlign: 'right',
      tooltip:
        'Gross APY assumes this cycle’s return repeats for a year, with rewards reinvested each cycle, before pool or signer fees. Uses BTC and STX daily prices from the same day at or up to four days before cycle end.',
    },
    cell: info => {
      const row = info.row.original;
      if (row.historic)
        return (
          <AnnotatedValue
            value={`${row.historic.apyPercent.toFixed(2)}%`}
            note={FROM_STACKING_TRACKER}
          />
        );
      if (!row.hasRewardData || !row.settled)
        return (
          <AnnotatedValue
            value={NO_VALUE}
            note={
              row.hasRewardData ? 'Final reward calculation pending or unverified.' : NO_REWARD_DATA
            }
          />
        );
      return (
        <AnnotatedValue
          value={
            row.apyPercent === undefined
              ? NO_VALUE
              : `${row.yieldEstimated ? '~' : ''}${row.apyPercent.toFixed(2)}%`
          }
          note={
            row.apyPercent === undefined
              ? 'Prices are unavailable or this network’s cycle is too short to annualize.'
              : row.yieldEstimated
                ? 'Estimated APY using current BTC and STX prices because historical prices or the cycle-end timestamp are unavailable.'
                : undefined
          }
        />
      );
    },
  },
  {
    id: 'totalSigners',
    header: 'Signers',
    accessorKey: 'totalSigners',
    enableSorting: false,
    size: 90,
    meta: { textAlign: 'right' },
    cell: info => (
      <Text textStyle="text-regular-sm">{(info.getValue() as number).toLocaleString()}</Text>
    ),
  },
];

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
  const endedHeight = cycleStartHeight(cycle.cycle_number + 1);
  const settled = (lastCalculationHeightByCycle?.[cycle.cycle_number] ?? -1) >= endedHeight - 1;
  const endedMs = burnBlockTimes[endedHeight];
  const historicalPrices =
    prices && endedMs !== undefined ? getCyclePrices(prices, endedMs) : undefined;
  const hasHistoricalPrices =
    historicalPrices?.btcPriceUsd !== undefined && historicalPrices?.stxPriceUsd !== undefined;
  const apy =
    hasRewardData && settled
      ? getStackingYieldForCompletedCycle({
          rewardsPerMicroStx: rewards.rewardsPerMicroStx,
          rewardCycleLength: endedHeight - startedHeight,
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
    totalSigners: cycle.total_signers,
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
