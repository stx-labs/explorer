'use client';

import { abbreviateNumber } from '@/common/utils/utils';
import { Text } from '@/ui/Text';
import { ColumnDef } from '@tanstack/react-table';

import { AnnotatedValue, NO_VALUE } from './AnnotatedValue';
import type { CycleRow } from './cycle-transforms';
import { formatSbtc } from './utils';

const NO_REWARD_DATA = 'On-chain reward data is unavailable for this cycle.';

const FROM_STACKING_TRACKER =
  'This cycle predates PoX-5. Historical rewards and gross yield come from stacking-tracker.com.';

export const cycleColumns: ColumnDef<CycleRow>[] = [
  {
    id: 'cycleNumber',
    header: 'Cycle',
    accessorKey: 'cycleNumber',
    enableSorting: false,
    size: 70,
    cell: info => (
      <Text textStyle="text-medium-sm">{(info.getValue() as number).toLocaleString('en-US')}</Text>
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
          #{row.startedHeight.toLocaleString('en-US')} · {row.startedDate}
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
          #{row.endedHeight.toLocaleString('en-US')} · {row.endedDate}
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
      <Text textStyle="text-regular-sm">{(info.getValue() as number).toLocaleString('en-US')}</Text>
    ),
  },
];
