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

import { ViewAllLink } from './ViewAllLink';
import { ActivityGroup, StakingActivityEvent } from './data';

interface ActivityRow extends StakingActivityEvent {
  network: ReturnType<typeof useGlobalContext>['activeNetwork'];
}

const GROUP_LABELS: { value?: ActivityGroup; label: string }[] = [
  { label: 'All' },
  { value: 'distributions', label: 'Distributions' },
  { value: 'enrollments', label: 'Enrollments' },
  { value: 'unlocks', label: 'Unlocks' },
  { value: 'bonds', label: 'Bonds' },
];

function truncate(value: string, lead = 6, tail = 4): string {
  return value.length <= lead + tail ? value : `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

const activityColumns: ColumnDef<ActivityRow>[] = [
  {
    id: 'event',
    header: 'Event',
    accessorKey: 'label',
    enableSorting: false,
    size: 190,
    cell: info => {
      const row = info.row.original;
      return (
        <Stack gap={0.5}>
          <Text textStyle="text-medium-sm" whiteSpace="nowrap">
            {row.label}
          </Text>
          {row.detail && (
            <Text textStyle="text-regular-xs" color="textSecondary" whiteSpace="nowrap">
              {row.detail}
            </Text>
          )}
        </Stack>
      );
    },
  },
  {
    id: 'amount',
    header: 'Amount',
    accessorKey: 'amount',
    enableSorting: false,
    size: 120,
    meta: { textAlign: 'right' },
    cell: info => (
      <Text textStyle="text-regular-sm" whiteSpace="nowrap">
        {(info.getValue() as string) ?? '—'}
      </Text>
    ),
  },
  {
    id: 'cumulative',
    header: 'Cumulative paid',
    accessorKey: 'cumulative',
    enableSorting: false,
    size: 140,
    meta: { textAlign: 'right' },
    cell: info => (
      <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
        {(info.getValue() as string) ?? '—'}
      </Text>
    ),
  },
  {
    id: 'block',
    header: 'Block',
    accessorKey: 'blockHeight',
    enableSorting: false,
    size: 110,
    cell: info => {
      const row = info.row.original;
      return (
        <NextLink href={buildUrl(`/block/${row.blockHeight}`, row.network)}>
          <Text textStyle="text-mono-xs" color="textInteractive" whiteSpace="nowrap">
            #{row.blockHeight.toLocaleString()}
          </Text>
        </NextLink>
      );
    },
  },
  {
    id: 'transaction',
    header: 'Transaction',
    accessorKey: 'txId',
    enableSorting: false,
    size: 130,
    cell: info => {
      const row = info.row.original;
      return (
        <Flex gap={2} align="center">
          <NextLink href={buildUrl(`/txid/${row.txId}`, row.network)}>
            <Text textStyle="text-mono-xs" color="textInteractive" whiteSpace="nowrap">
              {truncate(row.txId, 6, 5)}
            </Text>
          </NextLink>
          {/* Failures stay visible; hiding them would misrepresent the record. */}
          {row.txStatus !== 'success' && (
            <Badge variant="subtle" colorPalette="red">
              Failed
            </Badge>
          )}
        </Flex>
      );
    },
  },
  {
    id: 'age',
    header: 'Age',
    accessorKey: 'burnBlockTime',
    enableSorting: false,
    size: 110,
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

function ActionFilter({ selected }: { selected?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hrefFor = useCallback(
    (group?: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (group) {
        params.set('activity', group);
      } else {
        params.delete('activity');
      }
      const query = params.toString();
      return query ? `?${query}` : '?';
    },
    [searchParams]
  );

  return (
    <Flex gap={1} flexWrap="wrap" align="center">
      <Text textStyle="text-regular-sm" color="textSecondary" mr={2}>
        Filter
      </Text>
      {GROUP_LABELS.map(chip => {
        const isSelected = chip.value === selected || (!chip.value && !selected);
        return (
          <Button
            key={chip.label}
            type="button"
            variant={isSelected ? 'redesignPrimary' : 'unstyled'}
            size="big"
            px={3}
            py={1.5}
            height="auto"
            borderRadius="redesign.md"
            color={isSelected ? undefined : 'textSecondary'}
            _hover={isSelected ? undefined : { color: 'textPrimary' }}
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
        Bond distributions, enrollments and unlocks appear here.
      </Text>
    </Stack>
  );
}

export function StakingActivity({
  events,
  selectedGroup,
}: {
  events: StakingActivityEvent[];
  selectedGroup?: string;
}) {
  const network = useGlobalContext().activeNetwork;
  const data = useMemo(() => events.map(event => ({ ...event, network })), [events, network]);
  return (
    <Stack gap={3}>
      <Text textStyle="heading-xs">Bond activity</Text>
      <ActionFilter selected={selectedGroup} />
      <Table data={data} columns={activityColumns} emptyTableUi={<NoActivity />} />
      {data.length > 0 && (
        <Flex justify="flex-end">
          {/* TODO: needs a transactions page filtered to the staking contract. */}
          <ViewAllLink>View all transactions</ViewAllLink>
        </Flex>
      )}
    </Stack>
  );
}
