'use client';

import { MICROSTACKS_IN_STACKS, abbreviateNumber } from '@/common/utils/utils';
import { Text } from '@/ui/Text';
import { ColumnDef } from '@tanstack/react-table';

import { AnnotatedValue, NO_VALUE } from './AnnotatedValue';
import { CycleRewards, PoxCycle } from './data';
import { DailyPrices, getCyclePrices } from './prices';
import { getCycleStackerRewardsSatsBigInt, getStackingYieldForCompletedCycle } from './projections';
import { formatBtc, formatDateWithYear } from './utils';

/** Cycles before pox-5 have no reward record to read. */
const NO_REWARD_DATA = 'Only cycles from pox-5 onward report rewards on chain.';

const SHARED_WITH_BONDS =
  'Bitcoin bonds were active this cycle, so its rewards were shared between bonds and STX stackers. Cycles before Bitcoin Staking are not directly comparable.';

const FROM_STACKING_TRACKER =
  'This cycle predates pox-5, so the figure comes from stacking-tracker.com rather than a contract read.';

/** A figure with a note on where it came from, when that is not the chain. */
export interface CycleRow {
  cycleNumber: number;
  totalStackedStx: number;
  totalSigners: number;
  /** BTC paid to STX stackers over the cycle, in sats. */
  rewardsSats: bigint;
  apyPercent: number | undefined;
  /** Whether the rate used end-of-cycle prices rather than today's. */
  pricedAtEnd?: boolean;
  /** Figures for a pre-pox-5 cycle, which the chain cannot report. */
  historic?: { rewardsBtc: number; apyPercent: number };
  /** Whether Bitcoin bonds were paid ahead of stackers in this cycle. */
  sharedWithBonds?: boolean;
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
    meta: { isPinned: 'left' },
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
      // Bonds are paid ahead of stackers, so a shared cycle lowers this figure
      // as well as the yield derived from it.
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
    // Wider than the label alone: the header also carries an info icon.
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
      // A cycle that paid bonds is not comparable with one that did not, so it
      // says so rather than leaving the lower number to be read as a decline.
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
  historic,
  bondRewardsByCycle,
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
  /** Figures for cycles the chain cannot report, keyed by cycle number. */
  historic?: Record<number, { rewardsBtc: number; apyPercent: number }>;
  /** Sats diverted to bonds per cycle, which lowers the stacker yield. */
  bondRewardsByCycle?: Record<number, bigint>;
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
    sharedWithBonds: (bondRewardsByCycle?.[cycle.cycle_number] ?? BigInt(0)) > BigInt(0),
    historic: historic?.[cycle.cycle_number],
  };
}
