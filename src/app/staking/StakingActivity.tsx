'use client';

import { Table } from '@/common/components/table/Table';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { Button } from '@/ui/Button';
import { NextLink } from '@/ui/NextLink';
import { Text } from '@/ui/Text';
import { Badge, Flex, Stack } from '@chakra-ui/react';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { StakingActivityTx } from './data';

interface ActivityRow extends StakingActivityTx {
  network: ReturnType<typeof useGlobalContext>['activeNetwork'];
}

/**
 * Turns a hyphenated identifier into sentence case, so `stake-update` reads as
 * `Stake update`. Used for both function names and transaction statuses.
 */
function humanizeFunctionName(name?: string): string {
  if (!name) return 'Contract call';
  const words = name.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function truncate(value: string, lead = 6, tail = 4): string {
  return value.length <= lead + tail ? value : `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

const activityColumns: ColumnDef<ActivityRow>[] = [
  {
    id: 'function',
    header: 'Action',
    accessorKey: 'function_name',
    enableSorting: false,
    size: 160,
    cell: info => (
      <Text textStyle="text-medium-sm" whiteSpace="nowrap">
        {humanizeFunctionName(info.row.original.function_name)}
      </Text>
    ),
  },
  {
    id: 'tx_id',
    header: 'Transaction',
    accessorKey: 'tx_id',
    enableSorting: false,
    size: 140,
    cell: info => {
      const row = info.row.original;
      return (
        <NextLink href={buildUrl(`/txid/${row.tx_id}`, row.network)}>
          <Text textStyle="text-mono-xs" color="textInteractive" whiteSpace="nowrap">
            {truncate(row.tx_id, 8, 6)}
          </Text>
        </NextLink>
      );
    },
  },
  {
    id: 'sender',
    header: 'Sender',
    accessorKey: 'sender_address',
    enableSorting: false,
    size: 140,
    cell: info => {
      const row = info.row.original;
      return (
        <NextLink href={buildUrl(`/address/${row.sender_address}`, row.network)}>
          <Text textStyle="text-mono-xs" color="textInteractive" whiteSpace="nowrap">
            {truncate(row.sender_address)}
          </Text>
        </NextLink>
      );
    },
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'tx_status',
    enableSorting: false,
    size: 110,
    cell: info => {
      const status = info.getValue() as string;
      return (
        <Badge variant="subtle" colorPalette={status === 'success' ? 'green' : 'red'}>
          {humanizeFunctionName(status.replace(/_/g, '-'))}
        </Badge>
      );
    },
  },
  {
    id: 'time',
    header: 'When',
    accessorKey: 'burn_block_time',
    enableSorting: false,
    size: 120,
    meta: { textAlign: 'right' },
    cell: info => (
      <Text
        textStyle="text-regular-sm"
        color="textSecondary"
        whiteSpace="nowrap"
        suppressHydrationWarning
      >
        {formatTimestampToRelativeTime(info.getValue() as number)}
      </Text>
    ),
  },
];

function ActionFilter({ actions, selected }: { actions: string[]; selected?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hrefFor = useCallback(
    (action?: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (action) {
        params.set('action', action);
      } else {
        params.delete('action');
      }
      const query = params.toString();
      return query ? `?${query}` : '?';
    },
    [searchParams]
  );

  if (actions.length <= 1) return null;

  const chips: { label: string; value?: string }[] = [
    { label: 'All' },
    ...actions.map(action => ({ label: humanizeFunctionName(action), value: action })),
  ];

  return (
    <Flex gap={2} flexWrap="wrap">
      {chips.map(chip => {
        const isSelected = chip.value === selected || (!chip.value && !selected);
        return (
          <Button
            key={chip.label}
            type="button"
            variant={isSelected ? 'redesignPrimary' : 'redesignTertiary'}
            size="small"
            onClick={() => router.replace(hrefFor(chip.value), { scroll: false })}
            aria-pressed={isSelected}
          >
            {chip.label}
          </Button>
        );
      })}
    </Flex>
  );
}

function NoActivity() {
  return (
    <Stack gap={1} py={8} align="center">
      <Text textStyle="text-medium-sm">No activity yet</Text>
      <Text textStyle="text-regular-sm" color="textSecondary">
        Transactions calling the staking contract appear here.
      </Text>
    </Stack>
  );
}

/**
 * The "proof" half of the page: real transactions against the pox contract,
 * clickable through to the transaction and the sender.
 */
export function StakingActivity({
  transactions,
  availableActions,
  selectedAction,
}: {
  transactions: StakingActivityTx[];
  /** Actions seen recently, so the chips only offer filters that return rows. */
  availableActions: string[];
  selectedAction?: string;
}) {
  const network = useGlobalContext().activeNetwork;
  const data = useMemo(() => transactions.map(tx => ({ ...tx, network })), [transactions, network]);
  return (
    <Stack gap={3}>
      <Text textStyle="heading-xs">Activity</Text>
      <ActionFilter actions={availableActions} selected={selectedAction} />
      <Table data={data} columns={activityColumns} emptyTableUi={<NoActivity />} />
    </Stack>
  );
}
