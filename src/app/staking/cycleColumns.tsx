'use client';

import { MICROSTACKS_IN_STACKS, abbreviateNumber } from '@/common/utils/utils';
import { Text } from '@/ui/Text';
import { ColumnDef } from '@tanstack/react-table';

import { AnnotatedValue, NO_VALUE } from './AnnotatedValue';
import { CycleRewards, PoxCycle } from './data';
import { DailyPrices, getCyclePrices } from './prices';
import { getCycleStackerRewardsSatsBigInt, getStackingYieldForCompletedCycle } from './projections';
import { formatBtc, formatDateWithYear } from './utils';

const NO_REWARD_DATA = 'On-chain reward data is unavailable for this cycle.';

const SHARED_WITH_BONDS =
  'Bitcoin bonds were active this cycle, so its rewards were shared between bonds and STX stackers. Cycles before Bitcoin Staking are not directly comparable.';

const FROM_STACKING_TRACKER =
  'This cycle predates pox-5, so the figure comes from stacking-tracker.com rather than a contract read.';

export interface CycleRow {
  cycleNumber: number;
  totalStackedStx: number;
  totalSigners: number;
  rewardsSats: bigint;
  apyPercent: number | undefined;
  historic?: { rewardsBtc: number; apyPercent: number };
  sharedWithBonds?: boolean;
  hasRewardData: boolean;
  startedHeight: number;
  startedMs: number;
  endedHeight: number;
  endedMs: number;
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
    header: 'Total stacked',
    accessorKey: 'totalStackedStx',
    enableSorting: false,
    size: 120,
    cell: info => (
      <Text textStyle="text-regular-sm" whiteSpace="nowrap">
        {abbreviateNumber(info.getValue() as number, 1)} STX
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
          #{row.startedHeight.toLocaleString()} · {formatDateWithYear(row.startedMs)}
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
          #{row.endedHeight.toLocaleString()} · {formatDateWithYear(row.endedMs)}
        </Text>
      );
    },
  },
  {
    id: 'rewardsSats',
    header: 'BTC rewards',
    accessorKey: 'rewardsSats',
    enableSorting: false,
    size: 120,
    meta: { textAlign: 'right' },
    cell: info => {
      const row = info.row.original;
      if (!row.hasRewardData) {
        return row.historic ? (
          <AnnotatedValue value={`${row.historic.rewardsBtc} BTC`} note={FROM_STACKING_TRACKER} />
        ) : (
          <AnnotatedValue value={NO_VALUE} note={NO_REWARD_DATA} />
        );
      }
      if (row.sharedWithBonds) {
        return <AnnotatedValue value={formatBtc(row.rewardsSats)} note={SHARED_WITH_BONDS} />;
      }
      return (
        <Text textStyle="text-regular-sm" whiteSpace="nowrap">
          {formatBtc(row.rewardsSats)}
        </Text>
      );
    },
  },
  {
    id: 'apyPercent',
    header: 'Gross APY',
    accessorKey: 'apyPercent',
    enableSorting: false,
    size: 130,
    meta: {
      textAlign: 'right',
      tooltip:
        'BTC rewards per STX staked, compounded, at end-of-cycle prices. Gross: before pool or signer fees.',
    },
    cell: info => {
      const row = info.row.original;
      if (!row.hasRewardData) {
        return row.historic ? (
          <AnnotatedValue
            value={`${row.historic.apyPercent.toFixed(2)}%`}
            note={FROM_STACKING_TRACKER}
          />
        ) : (
          <AnnotatedValue value={NO_VALUE} note={NO_REWARD_DATA} />
        );
      }
      const value = row.apyPercent !== undefined ? `${row.apyPercent.toFixed(2)}%` : '\u2014';
      if (!row.sharedWithBonds) {
        return (
          <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
            {value}
          </Text>
        );
      }
      return <AnnotatedValue value={value} note={SHARED_WITH_BONDS} />;
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
  rewardCycleLength,
  cycleStartHeight,
  at,
  btcPrice,
  stxPrice,
  prices,
  cycleEndTimes,
  historic,
  bondRewardsByCycle,
}: {
  cycle: PoxCycle;
  rewards?: CycleRewards;
  pox5FirstCycleId?: number;
  rewardCycleLength: number;
  cycleStartHeight: (cycleNumber: number) => number;
  at: (height: number) => number;
  btcPrice?: number;
  stxPrice?: number;
  prices?: DailyPrices;
  cycleEndTimes?: Record<number, number>;
  historic?: Record<number, { rewardsBtc: number; apyPercent: number }>;
  bondRewardsByCycle?: Record<number, bigint>;
}): CycleRow {
  const hasRewardData =
    rewards !== undefined &&
    pox5FirstCycleId !== undefined &&
    cycle.cycle_number >= pox5FirstCycleId;
  const endedMs =
    cycleEndTimes?.[cycle.cycle_number] ?? at(cycleStartHeight(cycle.cycle_number + 1));
  const atEnd = prices ? getCyclePrices(prices, endedMs) : undefined;
  const yieldForCycle = rewards
    ? getStackingYieldForCompletedCycle({
        rewardsPerMicroStx: rewards.rewardsPerMicroStx,
        rewardCycleLength,
        btcPriceUsd: atEnd?.btcPriceUsd ?? btcPrice,
        stxPriceUsd: atEnd?.stxPriceUsd ?? stxPrice,
      })
    : undefined;
  return {
    cycleNumber: cycle.cycle_number,
    totalStackedStx: Number(cycle.total_stacked_amount ?? 0) / MICROSTACKS_IN_STACKS,
    totalSigners: cycle.total_signers ?? 0,
    rewardsSats: rewards
      ? getCycleStackerRewardsSatsBigInt(rewards.rewardsPerMicroStx, rewards.stakedMicroStx)
      : BigInt(0),
    apyPercent: yieldForCycle?.apyPercent,
    hasRewardData,
    startedHeight: cycleStartHeight(cycle.cycle_number),
    startedMs: at(cycleStartHeight(cycle.cycle_number)),
    endedHeight: cycleStartHeight(cycle.cycle_number + 1),
    endedMs,
    sharedWithBonds: (bondRewardsByCycle?.[cycle.cycle_number] ?? BigInt(0)) > BigInt(0),
    historic: historic?.[cycle.cycle_number],
  };
}
