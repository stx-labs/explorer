'use client';

import { MICROSTACKS_IN_STACKS, abbreviateNumber } from '@/common/utils/utils';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Flex, Icon } from '@chakra-ui/react';
import { Info } from '@phosphor-icons/react';
import { ColumnDef } from '@tanstack/react-table';

import { CycleRewards, PoxCycle } from './data';
import { DailyPrices, getCyclePrices } from './prices';
import { getCycleStackerRewardsSatsBigInt, getStackingYieldForCompletedCycle } from './projections';
import { formatBtc, formatDateWithYear } from './utils';

/** Cycles before pox-5 have no reward record to read. */
const NO_REWARD_DATA = 'Only cycles from pox-5 onward report rewards on chain.';

function NoRewardData() {
  return (
    <Flex gap={1} align="center" justify="flex-end">
      <Text textStyle="text-regular-sm" color="textSecondary">
        &#8212;
      </Text>
      <Tooltip variant="redesignPrimary" size="lg" portalled content={NO_REWARD_DATA}>
        <Icon w={3.5} h={3.5} color="iconSecondary" cursor="help">
          <Info />
        </Icon>
      </Tooltip>
    </Flex>
  );
}

export interface CycleRow {
  cycleNumber: number;
  totalStackedStx: number;
  totalSigners: number;
  /** BTC paid to STX stackers over the cycle, in sats. */
  rewardsSats: bigint;
  apyPercent: number | undefined;
  /** Whether the rate used end-of-cycle prices rather than today's. */
  pricedAtEnd?: boolean;
  /**
   * False for cycles that ran before pox-5. The pox-5 contract has no record of
   * them, so it reports zero, and showing that as "0%" would read as "nobody
   * rewarded anything" instead of "we cannot see it from here".
   */
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
      if (!row.hasRewardData) return <NoRewardData />;
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
    size: 100,
    meta: {
      textAlign: 'right',
      tooltip:
        "A cycle's BTC rewards per STX staked, compounded each cycle and priced at the BTC and STX rates when that cycle ended. Gross: before pool or signer fees.",
    },
    cell: info => {
      const row = info.row.original;
      if (!row.hasRewardData) return <NoRewardData />;
      return (
        <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
          {row.apyPercent !== undefined ? `${row.apyPercent.toFixed(2)}%` : '\u2014'}
        </Text>
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

/**
 * Turns a cycle into a table row.
 *
 * Shared by the section on the staking page and the full cycle history, so the
 * two cannot disagree about what a cycle generated or when it ran.
 */
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
}: {
  cycle: PoxCycle;
  rewards?: CycleRewards;
  pox5FirstCycleId?: number;
  rewardCycleLength: number;
  cycleStartHeight: (cycleNumber: number) => number;
  at: (height: number) => number;
  /** Live prices, used for the cycle still running. */
  btcPrice?: number;
  stxPrice?: number;
  /** Daily history, so a finished cycle is priced at the time it ended. */
  prices?: DailyPrices;
  /** Real cycle end times, where the chain has been asked for them. */
  cycleEndTimes?: Record<number, number>;
}): CycleRow {
  const hasRewardData = pox5FirstCycleId !== undefined && cycle.cycle_number >= pox5FirstCycleId;
  // A read beats the projection, which drifts further the older the cycle is.
  const endedMs =
    cycleEndTimes?.[cycle.cycle_number] ?? at(cycleStartHeight(cycle.cycle_number + 1));
  // A finished cycle is priced at its own end; one still running has no end to
  // price at, so it takes the live rate.
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
    pricedAtEnd: atEnd?.btcPriceUsd !== undefined && atEnd?.stxPriceUsd !== undefined,
  };
}
