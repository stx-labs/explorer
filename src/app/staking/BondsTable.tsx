'use client';

import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { Table } from '@/common/components/table/Table';
import { TableContainer } from '@/common/components/table/TableContainer';
import { formatDateShort } from '@/common/utils/date-utils';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Flex, Icon, Stack } from '@chakra-ui/react';
import { Info } from '@phosphor-icons/react';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { BondStateBadge } from './BondStateBadge';
import { BONDS_TABLE_LIMIT } from './consts';
import { Bond } from './data';
import {
  bpsToPercent,
  burnHeightToApproximateTimestamp,
  getRealizedRatePercent,
} from './projections';
import {
  formatBtc,
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
  /** Undefined when the distribution history does not reach back to this bond. */
  rewardedSats?: bigint;
  targetRatePercent: number;
  /** What the bond actually returned, known only once its term has ended. */
  realizedRatePercent?: number;
  /** Why there is no realized rate, so a blank cell can say what it means. */
  realizedRateUnavailable?: 'running' | 'nothingBonded' | 'outOfHistory' | 'cycleTooShort';
  registeredCount: number;
  allowedCount: number;
  /** Rough dates for the term, projected from block heights. */
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
  const rewardedSats = rewardsByBond?.[bond.index];
  // A rate is only realized once the term has finished. Before that the bond is
  // still paying out, so any figure would understate what it returns.
  const hasClosed = unlockHeight > 0 && currentBurnHeight >= unlockHeight;
  // A bond nobody staked into has no principal to measure a return against,
  // which is not the same as one that returned nothing.
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
    name: getBondDisplayName(bond),
    status: getBondStatusLabel(bond.status),
    isPending: isBondPending(bond.status),
    activationHeight: bond.schedule?.activation?.bitcoin_height ?? 0,
    activationCycle: bond.schedule?.activation?.pox_cycle ?? 0,
    unlockHeight: bond.schedule?.unlock?.bitcoin_height ?? 0,
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

/** Why a rate cannot be shown, so an empty cell is not read as a zero. */
const UNAVAILABLE_REASONS: Record<string, string> = {
  running: 'The bond is still paying out. A realized rate is only final once its term ends.',
  nothingBonded: 'Nothing was bonded, so there is no principal to measure a return against.',
  outOfHistory:
    'This bond closed before the distribution history the page reads, so its rewards cannot be totalled.',
  cycleTooShort:
    'Reward cycles on this network are shorter than a day, so a term returns its full rate too quickly for an annual figure to mean anything.',
};

function Unavailable({ reason }: { reason?: string }) {
  const explanation = reason ? UNAVAILABLE_REASONS[reason] : undefined;
  if (!explanation) {
    return (
      <Text textStyle="text-regular-sm" color="textSecondary">
        —
      </Text>
    );
  }
  return (
    <Flex gap={1} align="center" justify="flex-end">
      <Text textStyle="text-regular-sm" color="textSecondary">
        —
      </Text>
      <Tooltip variant="redesignPrimary" size="lg" portalled content={explanation}>
        <Icon w={3.5} h={3.5} color="iconSecondary" cursor="help">
          <Info />
        </Icon>
      </Tooltip>
    </Flex>
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
    // Which bond a row belongs to has to stay readable while the rest scrolls.
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
    // "Target" distinguishes this from the realised Gross APY in the Stacking
    // cycles table. This one is a contract parameter the bond promises; that
    // one is what stackers actually rewarded. Different numerator and
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
    id: 'realizedRate',
    // Blank until a bond has closed and its distributions are all recorded, so
    // an in-flight bond never reads as having underperformed.
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
      return <Unavailable reason={row.realizedRateUnavailable} />;
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
    // Rewards the bond has generated. The endpoint's `paid_out` counts withdrawals,
    // so a bond that has been rewarded for months reads zero until someone claims.
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
          <Unavailable reason="outOfHistory" />
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
  /** Needed to express a bond's rewards as an annual rate. */
  rewardCycleLength?: number;
  /** Rows to show. The full bonds page raises this above the section's cap. */
  limit?: number;
  /** Set by the full bonds page, which pages through every bond on chain. */
  pagination?: React.ComponentProps<typeof Table>['pagination'];
  /** The full bonds page reserves the height the other list pages do. */
  fullPage?: boolean;
}) {
  // Newest first, capped. The count of what is not shown is rendered above the
  // table so the list never looks complete when it is not.
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
      // The same card and horizontal scroll every other explorer table gets,
      // which is also what keeps nine columns reachable on a phone.
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
