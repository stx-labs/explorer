'use client';

import { useSubscribeTxs } from '@/app/_components/BlockList/Sockets/useSubscribeTxs';
import { useFilterAndSortState } from '@/features/txsFilterAndSort/useFilterAndSortState';
import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { ColumnDef } from '@tanstack/react-table';
import { type JSX, useEffect, useMemo, useRef, useState } from 'react';

import { ListFooter } from '../../ListFooter';
import { ScrollIndicator } from '../../ScrollIndicator';
import { Table } from '../Table';

export interface InfiniteTxSummaryTableProps<TSummary, TRow> {
  txs: TSummary[];
  columns: ColumnDef<TRow>[];
  mapRow: (tx: TSummary) => TRow;
  /** Client-side type filter key for a summary (v3 list endpoints can't filter server-side). */
  getType: (tx: TSummary) => string;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  /** The last "Load more" page failed; loaded rows stay and the footer offers a retry. */
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  tableContainer?: (table: JSX.Element) => JSX.Element;
  label?: string;
  /** Extra side effects to run when the "new transactions" banner is clicked. */
  onRefresh?: () => void;
}

function RefreshBanner({ message, onClick }: { message: string; onClick: () => void }) {
  return (
    <Flex
      alignItems="center"
      justifyContent={{ base: 'flex-start', md: 'center' }}
      gap={1.5}
      boxShadow="0px 4px 4px 0px rgba(252, 100, 50, 0.25), 0px 4px 4px 0px rgba(255, 85, 18, 0.25)"
      border="1px dashed var(--stacks-colors-accent-stacks-500)"
      borderRadius="redesign.lg"
      h={12}
      px={4}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={message}
      cursor="pointer"
      className="group"
    >
      <Box display="inline-flex">
        <Text fontSize="sm" fontWeight="medium" color="textSecondary">
          {message}
        </Text>
      </Box>
      <Icon h={3.5} w={3.5} color="iconTertiary" _groupHover={{ color: 'iconSecondary' }}>
        <ArrowsClockwise />
      </Icon>
    </Flex>
  );
}

/**
 * Columnar table over a cursor-paginated v3 summary feed. Pages are appended via a "Load more"
 * footer (cursor pagination can't jump to arbitrary pages), and the type filter is applied
 * client-side over the already-fetched rows since v3 list endpoints only accept `limit` + `cursor`.
 * First-page failures aren't handled here: callers query with `throwOnFirstPageError` under an
 * error boundary so they render an error + retry rather than an empty table.
 */
export function InfiniteTxSummaryTable<TSummary, TRow>({
  txs,
  columns,
  mapRow,
  getType,
  isLoading,
  isFetching,
  isFetchingNextPage,
  isFetchNextPageError,
  hasNextPage,
  fetchNextPage,
  refetch,
  tableContainer,
  label = 'transactions',
  onRefresh,
}: InfiniteTxSummaryTableProps<TSummary, TRow>) {
  const { activeFilters } = useFilterAndSortState();

  const filteredTxs = useMemo(
    () =>
      activeFilters.length === 0 ? txs : txs.filter(tx => activeFilters.includes(getType(tx))),
    [txs, activeFilters, getType]
  );

  const rowData = useMemo(() => filteredTxs.map(mapRow), [filteredTxs, mapRow]);

  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [newTxsAvailable, setNewTxsAvailable] = useState(false);
  const newTxsTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useSubscribeTxs(isSubscriptionActive, () => {
    // Wait 5 seconds to let the API catch up to the websocket before offering a refresh.
    if (newTxsTimer.current) return;
    newTxsTimer.current = setTimeout(() => {
      setNewTxsAvailable(true);
      newTxsTimer.current = undefined;
    }, 5000);
    setIsSubscriptionActive(false);
  });
  useEffect(() => {
    if (!newTxsAvailable) setIsSubscriptionActive(true);
  }, [newTxsAvailable]);
  useEffect(() => () => clearTimeout(newTxsTimer.current), []);

  const handleRefresh = () => {
    setNewTxsAvailable(false);
    refetch();
    onRefresh?.();
  };

  return (
    <>
      {/* Rendered outside the table so refresh stays reachable with a type filter active or when
          no loaded rows match (the table shows its empty state in that case). */}
      {newTxsAvailable && (
        <RefreshBanner
          message="New transactions have come in. Update list"
          onClick={handleRefresh}
        />
      )}
      <Table
        data={rowData}
        columns={columns}
        tableContainerWrapper={tableContainer ? table => tableContainer(table) : undefined}
        scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
        isLoading={isLoading}
        isFetching={isFetching && !isFetchingNextPage}
      />
      <ListFooter
        isLoading={isFetchingNextPage}
        isError={isFetchNextPageError}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        label={label}
      />
    </>
  );
}
