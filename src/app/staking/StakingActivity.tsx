'use client';

import { TxLink } from '@/common/components/ExplorerLinks';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { Table } from '@/common/components/table/Table';
import { TableContainer } from '@/common/components/table/TableContainer';
import {
  StatusTag,
  TimeStampCellRenderer,
  TxLinkCellRenderer,
} from '@/common/components/table/table-examples/TxTableCellRenderers';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { formatTimestampLocalized, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { BlockHeightBadge } from '@/ui/Badge';
import { ButtonLink } from '@/ui/ButtonLink';
import { TabsLabel, TabsList, TabsRoot, TabsTrigger } from '@/ui/Tabs';
import { Text } from '@/ui/Text';
import { Flex, Icon, Stack } from '@chakra-ui/react';
import { Coins, Flag, Link as LinkIcon, LockOpen } from '@phosphor-icons/react';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { Transaction } from '@stacks/stacks-blockchain-api-types';

import { ActivityGroup, StakingActivityEvent } from './data';

/** The unfiltered view. Not a group the API knows, so it cannot collide. */
const ALL_GROUPS = 'all';

const GROUP_LABELS: { value: ActivityGroup | typeof ALL_GROUPS; label: string }[] = [
  { value: ALL_GROUPS, label: 'All' },
  { value: 'distributions', label: 'Distributions' },
  { value: 'enrollments', label: 'Enrollments' },
  { value: 'unlocks', label: 'Unlocks' },
  { value: 'bonds', label: 'Bonds' },
];

/** A tinted square per event kind, so a scan of the column reads by colour and shape. */
const GROUP_ICONS: Record<ActivityGroup, { icon: React.ReactNode; bg: string; color: string }> = {
  distributions: { icon: <Coins />, bg: 'accent.stacks-200', color: 'accent.stacks-600' },
  enrollments: { icon: <LinkIcon />, bg: 'feedback.blue-200', color: 'feedback.blue-600' },
  unlocks: { icon: <LockOpen />, bg: 'feedback.bronze-200', color: 'feedback.bronze-600' },
  bonds: { icon: <Flag />, bg: 'feedback.green-200', color: 'feedback.green-600' },
};

function EventIcon({ group }: { group: ActivityGroup }) {
  const { icon, bg, color } = GROUP_ICONS[group];
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
      <Icon w={4} h={4} color={color}>
        {icon}
      </Icon>
    </Flex>
  );
}

const activityColumns: ColumnDef<StakingActivityEvent>[] = [
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
            {/* The title is the row's link, as it is in the transactions table. */}
            <TxLink txId={row.txId} variant="tableLink">
              <Text textStyle="text-medium-sm" whiteSpace="nowrap">
                {row.label}
              </Text>
            </TxLink>
            {row.detail && (
              <Text textStyle="text-regular-xs" color="textSecondary" whiteSpace="nowrap">
                {row.detail}
              </Text>
            )}
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
    cell: info => <BlockHeightBadge blockType="stx" blockHeight={info.getValue() as number} />,
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
        <Flex gap={1.5} align="center">
          {TxLinkCellRenderer(row.txId)}
          {/* Failures stay visible; hiding them would misrepresent the record. */}
          {row.txStatus !== 'success' && (
            <StatusTag status={row.txStatus as Transaction['tx_status']} />
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
    cell: info => {
      const timestamp = info.getValue() as number;
      return (
        <Flex alignItems="center" justifyContent="flex-end" w="full">
          {TimeStampCellRenderer(
            formatTimestampToRelativeTime(timestamp),
            formatTimestampLocalized(timestamp)
          )}
        </Flex>
      );
    },
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
    // The same tab strip the home page uses to switch block views, so a
    // filter here looks like a filter anywhere else in the explorer.
    <TabsRoot
      variant="primary"
      size="redesignMd"
      value={selected ?? ALL_GROUPS}
      onValueChange={({ value }) =>
        router.replace(hrefFor(value === ALL_GROUPS ? undefined : value), { scroll: false })
      }
      aria-label="Filter activity by event type"
    >
      <Flex align="center" gap={0} w="full" minW={0}>
        <TabsLabel as="span" id="staking-activity-filter-label" whiteSpace="nowrap">
          Filter:
        </TabsLabel>
        {/* Takes the room left beside the label, rather than the full width plus the label. */}
        <ScrollIndicator scrollIndicatorPositionerProps={{ flex: 1, minW: 0, w: 'auto' }}>
          <TabsList aria-labelledby="staking-activity-filter-label">
            {GROUP_LABELS.map(chip => (
              <TabsTrigger key={chip.value} value={chip.value}>
                {chip.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollIndicator>
      </Flex>
    </TabsRoot>
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
  standalone = false,
}: {
  events: StakingActivityEvent[];
  selectedGroup?: string;
  /** Set by the full activity page, which pages through what it fetched. */
  pageSize?: number;
  /**
   * True on the full activity page, which supplies its own title and has no
   * "view all" to point at, and reserves the height other list pages do.
   */
  standalone?: boolean;
}) {
  const network = useGlobalContext().activeNetwork;
  const [pageIndex, setPageIndex] = useState(0);

  // The feed merges several endpoints, so it is fetched whole and paged here
  // rather than asked for by offset.
  const page = useMemo(
    () => (pageSize ? events.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize) : events),
    [events, pageIndex, pageSize]
  );

  const viewAllHref = buildUrl('/staking/activity', network);
  const showViewAll = !standalone && events.length > 0;

  return (
    <Stack gap={4}>
      {!standalone && (
        <Flex justify="space-between" align="center" gap={4}>
          <Text textStyle="heading-md">Bond activity</Text>
          {showViewAll && (
            <ButtonLink
              href={viewAllHref}
              buttonLinkSize="big"
              display={{ base: 'none', md: 'inline' }}
            >
              View all transactions
            </ButtonLink>
          )}
        </Flex>
      )}
      <ActionFilter selected={selectedGroup} />
      <Table
        data={page}
        columns={activityColumns}
        emptyTableUi={<NoActivity />}
        tableContainerWrapper={table => (
          <TableContainer minH={standalone ? '500px' : undefined}>{table}</TableContainer>
        )}
        scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
        pagination={
          pageSize && events.length > pageSize
            ? {
                manualPagination: true,
                pageIndex,
                pageSize,
                totalRows: events.length,
                onPageChange: next => setPageIndex(next.pageIndex),
              }
            : undefined
        }
      />
      {/* On a phone the link follows the table, as it does under the home page's transactions. */}
      {showViewAll && (
        <ButtonLink
          href={viewAllHref}
          buttonLinkSize="big"
          display={{ base: 'inline', md: 'none' }}
        >
          View all transactions
        </ButtonLink>
      )}
    </Stack>
  );
}
