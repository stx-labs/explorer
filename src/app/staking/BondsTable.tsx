'use client';

import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { Table } from '@/common/components/table/Table';
import { TableContainer } from '@/common/components/table/TableContainer';
import { formatDateShort } from '@/common/utils/date-utils';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { AnnotatedValue, NO_VALUE } from './AnnotatedValue';
import { BondStateBadge } from './BondStateBadge';
import { BONDS_TABLE_LIMIT } from './consts';
import type { Bond } from './data';
import {
  bpsToPercent,
  burnHeightToApproximateTimestamp,
  getRealizedRatePercent,
} from './projections';
import {
  bondLabel,
  formatBtc,
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
  capacitySats: bigint;
  lockedSats: bigint;
  rewardedSats?: bigint;
  targetRatePercent: number;
  realizedRatePercent?: number;
  realizedRateUnavailable?: 'running' | 'nothingBonded' | 'outOfHistory' | 'cycleTooShort';
  registeredCount: number;
  allowedCount: number;
  activationMs: number;
  unlockMs: number;
}

export function toBondRow(
  bond: Bond,
  currentBurnHeight: number,
  nowMs: number,
  rewardsByBond?: Record<number, bigint>,
  rewardCycleLength?: number
): BondRow {
  const capacitySats = toBigInt(bond.parameters?.btc_capacity);
  const lockedSats = toBigInt(bond.balances?.locked?.btc);
  const activationHeight = bond.schedule?.activation?.bitcoin_height ?? 0;
  const unlockHeight = bond.schedule?.unlock?.bitcoin_height ?? 0;
  const rewardedSats = rewardsByBond ? (rewardsByBond[bond.index] ?? BigInt(0)) : undefined;
  const hasClosed = unlockHeight > 0 && currentBurnHeight >= unlockHeight;
  const realizedRate =
    hasClosed && rewardedSats !== undefined && rewardCycleLength
      ? getRealizedRatePercent(
          rewardedSats,
          lockedSats,
          unlockHeight - activationHeight,
          rewardCycleLength
        )
      : undefined;
  return {
    activationMs: burnHeightToApproximateTimestamp(activationHeight, currentBurnHeight, nowMs),
    unlockMs: burnHeightToApproximateTimestamp(unlockHeight, currentBurnHeight, nowMs),
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
    targetRatePercent: bpsToPercent(bond.parameters?.target_rate_bps ?? 0),
    realizedRatePercent: realizedRate,
    realizedRateUnavailable:
      realizedRate !== undefined
        ? undefined
        : !hasClosed
          ? 'running'
          : rewardedSats === undefined
            ? 'outOfHistory'
            : lockedSats <= BigInt(0)
              ? 'nothingBonded'
              : 'cycleTooShort',
    registeredCount: bond.registrations?.registered_count ?? 0,
    allowedCount: bond.registrations?.allowed_count ?? 0,
  };
}

function reasonNote(reason?: string): string | undefined {
  return reason ? UNAVAILABLE_REASONS[reason] : undefined;
}

const UNAVAILABLE_REASONS: Record<string, string> = {
  running: 'The bond is still paying out. A realized rate is only final once its term ends.',
  nothingBonded: 'Nothing was bonded, so there is no principal to measure a return against.',
  outOfHistory:
    'This bond closed before the distribution history the page reads, so its rewards cannot be totalled.',
  cycleTooShort:
    'Reward cycles on this network are shorter than a day, so a term returns its full rate too quickly for an annual figure to mean anything.',
};

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
    meta: { isPinned: 'left' },
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
            ~{formatDateShort(row.activationMs)} &rarr; ~{formatDateShort(row.unlockMs)}
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
    meta: { textAlign: 'right' },
    cell: info => (
      <Text textStyle="text-regular-sm" whiteSpace="nowrap">
        {formatBtc(info.row.original.capacitySats, 2)}
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
          {formatBtc(info.row.original.lockedSats)}
        </Text>
      </PendingOr>
    ),
  },
  {
    id: 'targetRate',
    header: 'Target APY',
    accessorKey: 'targetRatePercent',
    enableSorting: false,
    size: 100,
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
    accessorKey: 'realizedRatePercent',
    enableSorting: false,
    size: 110,
    meta: { textAlign: 'right' },
    cell: info => {
      const row = info.row.original;
      if (row.realizedRatePercent !== undefined) {
        return (
          <Text textStyle="text-regular-sm" whiteSpace="nowrap">
            {row.realizedRatePercent.toFixed(2)}%
          </Text>
        );
      }
      return <AnnotatedValue value={NO_VALUE} note={reasonNote(row.realizedRateUnavailable)} />;
    },
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
    header: 'Rewarded',
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
          <AnnotatedValue value={NO_VALUE} note={UNAVAILABLE_REASONS.outOfHistory} />
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
  currentBurnHeight,
  nowMs,
  rewardsByBond,
  rewardCycleLength,
  limit = BONDS_TABLE_LIMIT,
  pagination,
  fullPage = false,
}: {
  bonds: Bond[];
  currentBurnHeight: number;
  nowMs: number;
  rewardsByBond?: Record<number, bigint>;
  rewardCycleLength?: number;
  limit?: number;
  pagination?: React.ComponentProps<typeof Table>['pagination'];
  fullPage?: boolean;
}) {
  const data = useMemo(
    () =>
      [...bonds]
        .sort((a, b) => b.index - a.index)
        .slice(0, limit)
        .map(bond => toBondRow(bond, currentBurnHeight, nowMs, rewardsByBond, rewardCycleLength)),
    [bonds, currentBurnHeight, nowMs, rewardsByBond, rewardCycleLength, limit]
  );
  return (
    <Table
      data={data}
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
