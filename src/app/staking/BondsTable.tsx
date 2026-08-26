'use client';

import { Table } from '@/common/components/table/Table';
import { formatDateShort } from '@/common/utils/date-utils';
import { Text } from '@/ui/Text';
import { Badge, Box, Flex, Stack } from '@chakra-ui/react';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { BONDS_TABLE_LIMIT } from './consts';
import { Bond } from './data';
import { bpsToPercent, burnHeightToApproximateTimestamp, getBondFillRatio } from './projections';
import {
  formatBtc,
  formatPercent,
  formatSbtc,
  getBondDisplayName,
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
  paidOutSats: bigint;
  targetRatePercent: number;
  fillRatio: number | undefined;
  registeredCount: number;
  allowedCount: number;
  /** Rough dates for the term, projected from block heights. */
  activationMs: number;
  unlockMs: number;
}

export function toBondRow(bond: Bond, currentBurnHeight: number, nowMs: number): BondRow {
  const capacitySats = toBigInt(bond.parameters?.btc_capacity);
  const lockedSats = toBigInt(bond.balances?.locked?.btc);
  const activationHeight = bond.schedule?.activation?.bitcoin_height ?? 0;
  const unlockHeight = bond.schedule?.unlock?.bitcoin_height ?? 0;
  return {
    activationMs: burnHeightToApproximateTimestamp(activationHeight, currentBurnHeight, nowMs),
    unlockMs: burnHeightToApproximateTimestamp(unlockHeight, currentBurnHeight, nowMs),
    index: bond.index,
    name: getBondDisplayName(bond),
    status: getBondStatusLabel(bond.status),
    isPending: isBondPending(bond.status),
    activationHeight: bond.schedule?.activation?.bitcoin_height ?? 0,
    activationCycle: bond.schedule?.activation?.pox_cycle ?? 0,
    unlockHeight: bond.schedule?.unlock?.bitcoin_height ?? 0,
    unlockCycle: bond.schedule?.unlock?.pox_cycle ?? 0,
    capacitySats,
    lockedSats,
    paidOutSats: toBigInt(bond.balances?.paid_out?.btc),
    targetRatePercent: bpsToPercent(bond.parameters?.target_rate_bps ?? 0),
    fillRatio: getBondFillRatio(lockedSats, capacitySats),
    registeredCount: bond.registrations?.registered_count ?? 0,
    allowedCount: bond.registrations?.allowed_count ?? 0,
  };
}

function FillBar({ ratio }: { ratio: number | undefined }) {
  const clamped = Math.min(Math.max(ratio ?? 0, 0), 1);
  return (
    <Box
      bg={{ base: 'neutral.sand-200', _dark: 'neutral.sand-700' }}
      h={1.5}
      w="100%"
      borderRadius="redesign.xl"
      overflow="hidden"
    >
      <Box bg="accent.bitcoin-500" h="100%" w={`${clamped * 100}%`} />
    </Box>
  );
}

/**
 * Value columns read as pending rather than as a hard zero for upcoming bonds:
 * an on-chain bond that has not activated genuinely has no balances yet, which
 * is different from an active bond that nobody has staked into.
 */
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

export const bondColumns: ColumnDef<BondRow>[] = [
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
      <Badge
        variant="subtle"
        colorPalette={info.row.original.isPending ? 'gray' : 'green'}
        whiteSpace="nowrap"
      >
        {info.getValue() as string}
      </Badge>
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
    size: 170,
    cell: info => {
      const row = info.row.original;
      return (
        <Stack gap={1} minW={28}>
          <Flex justify="space-between" gap={2}>
            <Text textStyle="text-regular-xs" whiteSpace="nowrap">
              {formatBtc(row.capacitySats, 2)}
            </Text>
            <Text textStyle="text-regular-xs" color="textSecondary" whiteSpace="nowrap">
              {formatPercent(row.fillRatio)} full
            </Text>
          </Flex>
          <FillBar ratio={row.fillRatio} />
        </Stack>
      );
    },
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
    // "Target" distinguishes this from the realised Gross APY in the Stacking
    // cycles table. This one is a contract parameter the bond promises; that
    // one is what stackers actually earned. Different numerator and
    // denominator, so they are not comparable.
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
    id: 'paidOut',
    header: 'Paid out',
    accessorKey: 'paidOutSats',
    enableSorting: false,
    size: 110,
    meta: { textAlign: 'right' },
    cell: info => (
      <PendingOr isPending={info.row.original.isPending}>
        <Text textStyle="text-regular-sm" whiteSpace="nowrap">
          {formatSbtc(info.row.original.paidOutSats)}
        </Text>
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
}: {
  bonds: Bond[];
  currentBurnHeight: number;
  nowMs: number;
}) {
  // Newest first, capped. The count of what is not shown is rendered above the
  // table so the list never looks complete when it is not.
  const data = useMemo(
    () =>
      [...bonds]
        .sort((a, b) => b.index - a.index)
        .slice(0, BONDS_TABLE_LIMIT)
        .map(bond => toBondRow(bond, currentBurnHeight, nowMs)),
    [bonds, currentBurnHeight, nowMs]
  );
  return <Table data={data} columns={bondColumns} emptyTableUi={<NoBondsYet />} />;
}
