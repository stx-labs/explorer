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
import {
  ClockCounterClockwise,
  Coins,
  Flag,
  Link as LinkIcon,
  LockOpen,
} from '@phosphor-icons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';

import type { Transaction } from '@stacks/stacks-blockchain-api-types';

import { AnnotatedValue, NO_VALUE } from './AnnotatedValue';
import type { ActivityGroup, StakingActivityEvent } from './data';
import { bondLabel } from './utils';

const ALL_GROUPS = 'all';

const GROUP_LABELS: { value: ActivityGroup | typeof ALL_GROUPS; label: string }[] = [
  { value: ALL_GROUPS, label: 'All' },
  { value: 'distributions', label: 'Distributions' },
  { value: 'enrollments', label: 'Enrollments' },
  { value: 'unlocks', label: 'Early exits' },
  { value: 'bonds', label: 'Bonds' },
];

const GROUP_ICONS: Record<ActivityGroup, React.ReactNode> = {
  distributions: <Coins />,
  enrollments: <LinkIcon />,
  unlocks: <LockOpen />,
  bonds: <Flag />,
};

function EventIcon({ group }: { group: ActivityGroup }) {
  return (
    <Flex
      w={7}
      h={7}
      flexShrink={0}
      align="center"
      justify="center"
      borderRadius="redesign.md"
      bg="surfaceFifth"
    >
      <Icon w={4} h={4} color="iconSecondary">
        {GROUP_ICONS[group]}
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
    cell: info =>
      info.row.original.amountUnavailable ? (
        <AnnotatedValue
          value={NO_VALUE}
          note="Transaction details could not be loaded completely. Refresh to retry, or open the transaction."
        />
      ) : (
        <Text textStyle="text-regular-sm" whiteSpace="nowrap">
          {(info.getValue() as string) ?? NO_VALUE}
        </Text>
      ),
  },
  {
    id: 'cumulative',
    header: 'Credited this cycle',
    accessorKey: 'cumulative',
    enableSorting: false,
    size: 140,
    meta: {
      textAlign: 'right',
      tooltip:
        'Cumulative contract credits for this bond within the reward cycle shown on the event. Resets each cycle; not a lifetime total or proof of onward payment.',
    },
    cell: info => (
      <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
        {(info.getValue() as string) ?? NO_VALUE}
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

interface ActivityFilterControl {
  isPending: boolean;
  onChange: (group?: ActivityGroup) => void;
}

function ActionFilter({
  selected,
  control,
}: {
  selected?: ActivityGroup;
  control?: ActivityFilterControl;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [optimisticGroup, setOptimisticGroup] = useOptimistic(selected ?? ALL_GROUPS);

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
    <TabsRoot
      variant="primary"
      size="redesignMd"
      value={optimisticGroup}
      activationMode="manual"
      onValueChange={({ value }) =>
        startTransition(() => {
          setOptimisticGroup(value);
          const group = value === ALL_GROUPS ? undefined : (value as ActivityGroup);
          if (control) control.onChange(group);
          else router.replace(hrefFor(group), { scroll: false });
        })
      }
      aria-label="Filter activity by event type"
    >
      <Flex align="center" gap={0} w="full" minW={0}>
        <TabsLabel as="span" id="staking-activity-filter-label" whiteSpace="nowrap">
          Filter:
        </TabsLabel>

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
      <Text
        role="status"
        aria-live="polite"
        textStyle="text-regular-xs"
        color="textSecondary"
        minH={4}
      >
        {isPending || control?.isPending ? 'Loading activity…' : ''}
      </Text>
    </TabsRoot>
  );
}

function groupLabel(group?: ActivityGroup): string {
  return GROUP_LABELS.find(chip => chip.value === group)?.label.toLowerCase() ?? 'activity';
}

function NoActivity({
  bondIndex,
  group,
  historyTruncated,
}: {
  bondIndex?: number;
  group?: ActivityGroup;
  historyTruncated?: boolean;
}) {
  const glyph = group ? GROUP_ICONS[group] : <ClockCounterClockwise />;
  const badge = (
    <Flex
      w={10}
      h={10}
      align="center"
      justify="center"
      flexShrink={0}
      borderRadius="redesign.md"
      bg="surfaceFifth"
    >
      <Icon w={5} h={5} color="iconSecondary">
        {glyph}
      </Icon>
    </Flex>
  );
  if (bondIndex !== undefined) {
    return (
      <Stack minH="9rem" gap={3} align="center" justify="center">
        {badge}
        <Stack gap={1} align="center">
          <Text textStyle="text-medium-sm">
            No {historyTruncated ? 'recent ' : ''}
            {groupLabel(group)} for {bondLabel(bondIndex)}
          </Text>
        </Stack>
      </Stack>
    );
  }
  return (
    <Stack minH="9rem" gap={3} align="center" justify="center">
      {badge}
      <Text textStyle="text-medium-sm">No {groupLabel(group)} yet</Text>
    </Stack>
  );
}

export function StakingActivity({
  events,
  selectedGroup,
  pageSize,
  standalone = false,
  bondIndex,
  txWindow,
  incomplete,
  historyTruncated,
  filterControl,
}: {
  events: StakingActivityEvent[];
  incomplete?: boolean;
  historyTruncated?: boolean;
  selectedGroup?: ActivityGroup;
  pageSize?: number;
  standalone?: boolean;
  bondIndex?: number;
  txWindow?: number;
  filterControl?: ActivityFilterControl;
}) {
  const network = useGlobalContext().activeNetwork;
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [events, selectedGroup]);
  const page = useMemo(
    () => (pageSize ? events.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize) : events),
    [events, pageIndex, pageSize]
  );

  const viewAllHref = buildUrl(
    selectedGroup ? `/staking/activity?activity=${selectedGroup}` : '/staking/activity',
    network
  );
  const showViewAll = !standalone && events.length > 0;

  return (
    <Stack gap={4}>
      {!standalone && (
        <Flex justify="space-between" align="center" gap={4}>
          <Text as="h2" textStyle="heading-xs">
            Bond activity
          </Text>
          {showViewAll && (
            <ButtonLink
              href={viewAllHref}
              buttonLinkSize="big"
              display={{ base: 'none', md: 'inline' }}
            >
              View recent activity
            </ButtonLink>
          )}
        </Flex>
      )}
      <ActionFilter selected={selectedGroup} control={filterControl} />
      <Text textStyle="text-regular-xs" color="textSecondary">
        Reward amounts are sBTC credited by the contract. Onward payment by signer-managers is
        separate.
      </Text>
      {incomplete && (
        <Text role="status" textStyle="text-regular-sm" color="textSecondary">
          Some activity could not be loaded. Refresh the page to try again.
        </Text>
      )}
      {historyTruncated && (
        <Text textStyle="text-regular-xs" color="textSecondary">
          Showing matches from the newest {txWindow ? `${txWindow} ` : ''}staking transactions
          across all bonds. Older activity may not be included.
        </Text>
      )}
      <Table
        isLoading={filterControl?.isPending && events.length === 0}
        data={page}
        columns={activityColumns}
        emptyTableUi={
          incomplete ? (
            <Text textStyle="text-regular-sm" color="textSecondary">
              Activity unavailable
            </Text>
          ) : (
            <NoActivity
              bondIndex={bondIndex}
              group={selectedGroup}
              historyTruncated={historyTruncated}
            />
          )
        }
        tableContainerWrapper={table => (
          <TableContainer
            minH={standalone ? '500px' : undefined}
            {...(page.length === 0
              ? { pt: { base: 3, lg: 4 }, justifyContent: 'center' as const }
              : {})}
          >
            {table}
          </TableContainer>
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
      {showViewAll && (
        <ButtonLink
          href={viewAllHref}
          buttonLinkSize="big"
          display={{ base: 'inline', md: 'none' }}
        >
          View recent activity
        </ButtonLink>
      )}
    </Stack>
  );
}
