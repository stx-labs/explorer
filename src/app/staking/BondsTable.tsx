'use client';

import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { Table } from '@/common/components/table/Table';
import { TableContainer } from '@/common/components/table/TableContainer';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { AnnotatedValue, NO_VALUE } from './AnnotatedValue';
import { BondStateBadge } from './BondStateBadge';
import { BONDS_TABLE_LIMIT } from './consts';
import type { Bond, BondRewards } from './data';
import { bpsToPercent } from './projections';
import { RealizedBondRate, getRealizedBondRate } from './reward-metrics';
import {
  bondLabel,
  formatBtc,
  formatBurnDate,
  formatSbtc,
  getBondStatusLabel,
  isBondPending,
  toBigInt,
} from './utils';

export interface BondRow {
  index: number;
  name: string;
  status: string;
  isPending: boolean;
  activationHeight: number;
  activationCycle: number;
  unlockHeight: number;
  unlockCycle: number;
  capacitySats?: bigint;
  lockedSats?: bigint;
  rewardedSats?: bigint;
  targetRatePercent: number;
  realizedRate: RealizedBondRate;
  registeredCount: number;
  allowedCount: number;
  activationDate: string;
  unlockDate: string;
}

export function toBondRow(
  bond: Bond,
  currentBurnHeight: number,
  nowMs: number,
  rewardsByBond?: Record<number, bigint>,
  burnBlockTimes: Record<number, number> = {},
  settlementsByBond?: BondRewards['settlementsByBond']
): BondRow {
  const capacitySats = toBigInt(bond.parameters?.btc_capacity);
  const lockedSats = toBigInt(bond.balances?.locked?.btc);
  const activationHeight = bond.schedule?.activation?.bitcoin_height ?? 0;
  const unlockHeight = bond.schedule?.unlock?.bitcoin_height ?? 0;
  const rewardedSats = rewardsByBond ? (rewardsByBond[bond.index] ?? BigInt(0)) : undefined;
  return {
    activationDate: formatBurnDate(activationHeight, currentBurnHeight, nowMs, burnBlockTimes),
    unlockDate: formatBurnDate(unlockHeight, currentBurnHeight, nowMs, burnBlockTimes),
    index: bond.index,
    name: bondLabel(bond.index),
    status: getBondStatusLabel(bond.status),
    isPending: isBondPending(bond.status),
    activationHeight,
    activationCycle: bond.schedule?.activation?.pox_cycle ?? 0,
    unlockHeight,
    unlockCycle: bond.schedule?.unlock?.pox_cycle ?? 0,
    capacitySats,
    lockedSats,
    rewardedSats,
    realizedRate: getRealizedBondRate(bond, currentBurnHeight, settlementsByBond?.[bond.index]),
    targetRatePercent: bpsToPercent(bond.parameters?.target_rate_bps ?? 0),
    registeredCount: bond.registrations?.registered_count ?? 0,
    allowedCount: bond.registrations?.allowed_count ?? 0,
  };
}

const REWARD_HISTORY_UNAVAILABLE = 'Complete reward allocation history is unavailable.';

function PendingOr({ isPending, children }: { isPending: boolean; children: React.ReactNode }) {
  if (isPending) {
    return (
      <Text textStyle="text-regular-sm" color="textSecondary">
        &mdash;
      </Text>
    );
  }
  return <>{children}</>;
}

const bondColumns: ColumnDef<BondRow>[] = [
  {
    id: 'name',
    header: 'Bond',
    accessorKey: 'name',
    enableSorting: false,
    size: 110,
    cell: info => (
      <Text textStyle="text-medium-sm" whiteSpace="nowrap">
        {info.getValue() as string}
      </Text>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    enableSorting: false,
    size: 100,
    cell: info => (
      <BondStateBadge
        tone={info.row.original.isPending ? 'pending' : 'active'}
        label={info.getValue() as string}
      />
    ),
  },
  {
    id: 'term',
    header: 'Term',
    accessorKey: 'activationHeight',
    enableSorting: false,
    size: 180,
    cell: info => {
      const row = info.row.original;
      return (
        <Stack gap={0.5}>
          <Text textStyle="text-mono-xs" whiteSpace="nowrap">
            #{row.activationHeight.toLocaleString()} &rarr; #{row.unlockHeight.toLocaleString()}
          </Text>
          <Text
            textStyle="text-regular-xs"
            color="textSecondary"
            whiteSpace="nowrap"
            suppressHydrationWarning
          >
            {row.activationDate} &rarr; {row.unlockDate}
          </Text>
        </Stack>
      );
    },
  },
  {
    id: 'capacity',
    header: 'Capacity',
    accessorKey: 'capacitySats',
    enableSorting: false,
    size: 120,
    meta: {
      textAlign: 'right',
      tooltip:
        'Sum of participant allowlist caps. An upper bound, not a separately approved offering size.',
    },
    cell: info => (
      <Text textStyle="text-regular-sm" whiteSpace="nowrap">
        {info.row.original.capacitySats === undefined
          ? NO_VALUE
          : formatBtc(info.row.original.capacitySats, 2)}
      </Text>
    ),
  },
  {
    id: 'bonded',
    header: 'BTC bonded',
    accessorKey: 'lockedSats',
    enableSorting: false,
    size: 120,
    meta: { textAlign: 'right' },
    cell: info => (
      <PendingOr isPending={info.row.original.isPending}>
        <Text textStyle="text-regular-sm" whiteSpace="nowrap">
          {info.row.original.lockedSats === undefined
            ? NO_VALUE
            : formatBtc(info.row.original.lockedSats)}
        </Text>
      </PendingOr>
    ),
  },
  {
    id: 'targetRate',
    header: 'Protocol Yield Target',
    accessorKey: 'targetRatePercent',
    enableSorting: false,
    size: 180,
    meta: { textAlign: 'right' },
    cell: info => (
      <Text textStyle="text-regular-sm" whiteSpace="nowrap">
        {(info.getValue() as number).toFixed(2)}%
      </Text>
    ),
  },
  {
    id: 'realizedRate',
    header: 'Realized rate',
    enableSorting: false,
    size: 130,
    meta: { textAlign: 'right' },
    cell: info => (
      <AnnotatedValue
        value={
          info.row.original.realizedRate.percent === undefined
            ? NO_VALUE
            : `${info.row.original.realizedRate.percent.toFixed(2)}%`
        }
        note={info.row.original.realizedRate.note}
      />
    ),
  },
  {
    id: 'registrations',
    header: 'Registered',
    accessorKey: 'registeredCount',
    enableSorting: false,
    size: 110,
    meta: { textAlign: 'right' },
    cell: info => {
      const row = info.row.original;
      return (
        <Text textStyle="text-regular-sm" whiteSpace="nowrap">
          {row.registeredCount.toLocaleString()} / {row.allowedCount.toLocaleString()}
        </Text>
      );
    },
  },
  {
    id: 'rewarded',
    header: 'Rewards credited',
    accessorKey: 'rewardedSats',
    enableSorting: false,
    size: 110,
    meta: { textAlign: 'right' },
    cell: info => (
      <PendingOr isPending={info.row.original.isPending}>
        {info.row.original.rewardedSats !== undefined ? (
          <Text textStyle="text-regular-sm" whiteSpace="nowrap">
            {formatSbtc(info.row.original.rewardedSats)}
          </Text>
        ) : (
          <AnnotatedValue value={NO_VALUE} note={REWARD_HISTORY_UNAVAILABLE} />
        )}
      </PendingOr>
    ),
  },
];

function NoBondsYet() {
  return (
    <Stack gap={1} py={8} align="center">
      <Text textStyle="text-medium-sm" color="textPrimary">
        No bonds yet
      </Text>
      <Text textStyle="text-regular-sm" color="textSecondary" textAlign="center">
        Bonds appear here once they are created on-chain.
      </Text>
    </Stack>
  );
}

export function BondsTable({
  bonds,
  unavailable,
  currentBurnHeight,
  nowMs,
  rewardsByBond,
  settlementsByBond,
  burnBlockTimes = {},
  limit = BONDS_TABLE_LIMIT,
  pagination,
  fullPage = false,
}: {
  bonds: Bond[];
  unavailable?: boolean;
  currentBurnHeight: number;
  nowMs: number;
  rewardsByBond?: Record<number, bigint>;
  settlementsByBond?: BondRewards['settlementsByBond'];
  burnBlockTimes?: Record<number, number>;
  limit?: number;
  pagination?: React.ComponentProps<typeof Table>['pagination'];
  fullPage?: boolean;
}) {
  const data = useMemo(
    () =>
      [...bonds]
        .sort((a, b) => b.index - a.index)
        .slice(0, limit)
        .map(bond =>
          toBondRow(
            bond,
            currentBurnHeight,
            nowMs,
            rewardsByBond,
            burnBlockTimes,
            settlementsByBond
          )
        ),
    [bonds, currentBurnHeight, nowMs, rewardsByBond, burnBlockTimes, settlementsByBond, limit]
  );
  return (
    <Table
      data={unavailable ? [] : data}
      error={
        unavailable ? 'Bond data could not be loaded. Refresh the page to try again.' : undefined
      }
      columns={bondColumns}
      emptyTableUi={<NoBondsYet />}
      pagination={pagination}
      tableContainerWrapper={table => (
        <TableContainer pt={{ base: 3, lg: 4 }} minH={fullPage ? '500px' : undefined}>
          {table}
        </TableContainer>
      )}
      scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
      tableProps={{ mt: { base: -3, lg: -4 } }}
    />
  );
}
