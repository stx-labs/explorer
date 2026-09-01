'use client';

import { Table } from '@/common/components/table/Table';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { Button } from '@/ui/Button';
import { NextLink } from '@/ui/NextLink';
import { Text } from '@/ui/Text';
import { Badge, Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { Coins, Flag, Link as LinkIcon, LockOpen } from '@phosphor-icons/react';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

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

/** A tinted square per event kind, so a scan of the column reads by shape. */
const GROUP_ICONS: Record<ActivityGroup, { icon: React.ElementType; bg: string; color: string }> = {
  distributions: { icon: Coins, bg: 'accent.stacks-200', color: 'accent.stacks-600' },
  enrollments: { icon: LinkIcon, bg: 'feedback.blue-200', color: 'feedback.blue-600' },
  unlocks: { icon: LockOpen, bg: 'feedback.bronze-200', color: 'feedback.bronze-600' },
  bonds: { icon: Flag, bg: 'feedback.green-200', color: 'feedback.green-600' },
};

function EventIcon({ group }: { group: ActivityGroup }) {
  const { icon: Glyph, bg, color } = GROUP_ICONS[group];
  return (
    <Flex
      w={7}
      h={7}
      flexShrink={0}
      align="center"
      justify="center"
      borderRadius="redesign.md"
      bg={bg}
    >
      <Icon w={3.5} h={3.5} color={color}>
        <Glyph weight="fill" />
      </Icon>
    </Flex>
  );
}

const activityColumns: ColumnDef<ActivityRow>[] = [
  {
    id: 'event',
    header: 'Event',
    accessorKey: 'label',
    enableSorting: false,
    size: 230,
    cell: info => {
      const row = info.row.original;
      return (
        <Flex gap={3} align="center">
          <EventIcon group={row.group} />
          <Stack gap={0.5}>
            <Text textStyle="text-medium-sm" whiteSpace="nowrap">
              {row.label}
            </Text>
            {/* The line is held even when empty, so every row is one height. */}
            <Text textStyle="text-regular-xs" color="textSecondary" whiteSpace="nowrap" minH="1lh">
              {row.detail}
            </Text>
          </Stack>
        </Flex>
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
    header: 'Cumulative rewarded',
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
        <NextLink href={buildUrl(`/block/${row.blockHeight}`, row.network)} variant="noUnderline">
          <Text textStyle="text-mono-xs" color="accent.stacks-500" whiteSpace="nowrap">
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
          <NextLink href={buildUrl(`/txid/${row.txId}`, row.network)} variant="noUnderline">
            <Text textStyle="text-mono-xs" color="accent.stacks-500" whiteSpace="nowrap">
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
        textStyle="text-regular-xs"
        color="textTertiary"
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
            variant="unstyled"
            size="big"
            px={3}
            py={1.5}
            height="auto"
            borderRadius="redesign.md"
            bg={isSelected ? 'surfaceFifth' : undefined}
            color={isSelected ? 'textPrimary' : 'textSecondary'}
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
  pageSize,
  showViewAll = true,
}: {
  events: StakingActivityEvent[];
  selectedGroup?: string;
  /** Set by the full activity page, which pages through what it fetched. */
  pageSize?: number;
  showViewAll?: boolean;
}) {
  const network = useGlobalContext().activeNetwork;
  const [pageIndex, setPageIndex] = useState(0);
  const data = useMemo(() => events.map(event => ({ ...event, network })), [events, network]);

  // The feed merges several endpoints, so it is fetched whole and paged here
  // rather than asked for by offset.
  const page = useMemo(
    () => (pageSize ? data.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize) : data),
    [data, pageIndex, pageSize]
  );

  return (
    <Stack gap={3}>
      <Text textStyle="heading-xs">Bond activity</Text>
      <ActionFilter selected={selectedGroup} />
      <Table
        data={page}
        columns={activityColumns}
        emptyTableUi={<NoActivity />}
        getRowHref={row => buildUrl(`/txid/${row.txId}`, row.network)}
        pagination={
          pageSize && data.length > pageSize
            ? {
                manualPagination: true,
                pageIndex,
                pageSize,
                totalRows: data.length,
                onPageChange: next => setPageIndex(next.pageIndex),
                bordered: false,
                showGoToPage: false,
              }
            : undefined
        }
      />
      {showViewAll && data.length > 0 && (
        <Flex justify="flex-end">
          <ViewAllLink href={buildUrl('/staking/activity', network)}>
            View all transactions
          </ViewAllLink>
        </Flex>
      )}
    </Stack>
  );
}
