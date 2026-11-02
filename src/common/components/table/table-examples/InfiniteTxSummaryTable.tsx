'use client';

import { useSubscribeBlocks } from '@/app/_components/BlockList/Sockets/useSubscribeBlocks';
import { useSubscribeTxs } from '@/app/_components/BlockList/Sockets/useSubscribeTxs';
import { trimToFirstPage } from '@/common/hooks/useCursorInfiniteQueryResult';
import { MempoolTransactionSummary, TransactionSummary } from '@/common/types/tx-v3';
import { filterByType } from '@/features/txs-list/utils';
import { useFilterAndSortState } from '@/features/txsFilterAndSort/useFilterAndSortState';
import { InfiniteData, QueryKey, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ListFooter } from '../../ListFooter';
import { ScrollIndicator } from '../../ScrollIndicator';
import { Table } from '../Table';
import { UpdateTableBanner } from '../UpdateTableBannerRow';
import { TxSummaryTableRow, toTxSummaryRow } from './txSummaryColumns';

/** Which socket signals new rows: new blocks for the confirmed feed, mempool txs for pending. */
export type LiveUpdatesSource = 'blocks' | 'mempool';

export interface InfiniteTxSummaryTableProps {
  txs: (TransactionSummary | MempoolTransactionSummary)[];
  columns: ColumnDef<TxSummaryTableRow>[];
  /** The feed's infinite query key, so a refresh can trim the cache to its first page. */
  queryKey: QueryKey;
  liveUpdates: LiveUpdatesSource;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  /** The last "Load more" page failed; loaded rows stay and the footer offers a retry. */
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  fetchNextPage: (options?: { cancelRefetch?: boolean }) => unknown;
  refetch: () => unknown;
  tableContainer?: (table: JSX.Element) => JSX.Element;
  label?: string;
  /** Extra side effects to run when the "new transactions" banner is clicked. */
  onRefresh?: () => void;
}

// Only the listener for the feed's source is mounted: the socket hooks disconnect the shared client
// whenever they're inactive, so an idle second hook would tear down the active subscription.
function BlocksListener({ active, onUpdate }: { active: boolean; onUpdate: () => void }) {
  useSubscribeBlocks(active, onUpdate);
  return null;
}

function MempoolListener({ active, onUpdate }: { active: boolean; onUpdate: () => void }) {
  useSubscribeTxs(active, onUpdate);
  return null;
}

/**
 * Columnar table over a cursor-paginated v3 summary feed. Pages are appended via a "Load more"
 * footer (cursor pagination can't jump to arbitrary pages), and the type filter is applied
 * client-side over the already-fetched rows since v3 list endpoints only accept `limit` + `cursor`.
 * First-page failures aren't handled here: callers query with `throwOnFirstPageError` under an
 * error boundary so they render an error + retry rather than an empty table.
 */
export function InfiniteTxSummaryTable({
  txs,
  columns,
  queryKey,
  liveUpdates,
  isLoading,
  isFetchingNextPage,
  isFetchNextPageError,
  hasNextPage,
  fetchNextPage,
  refetch,
  tableContainer,
  label = 'transactions',
  onRefresh,
}: InfiniteTxSummaryTableProps) {
  const queryClient = useQueryClient();
  const { activeFilters } = useFilterAndSortState();

  const rowData = useMemo(
    () => filterByType(txs, activeFilters).map(tx => toTxSummaryRow(tx)),
    [txs, activeFilters]
  );

  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [newTxsAvailable, setNewTxsAvailable] = useState(false);
  const newTxsTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Stable so the socket hook doesn't resubscribe the shared client on every render.
  const handleUpdate = useCallback(() => {
    // Wait 5 seconds to let the API catch up to the websocket before offering a refresh.
    if (newTxsTimer.current) return;
    newTxsTimer.current = setTimeout(() => {
      setNewTxsAvailable(true);
      newTxsTimer.current = undefined;
    }, 5000);
    setIsSubscriptionActive(false);
  }, []);
  useEffect(() => {
    if (!newTxsAvailable) setIsSubscriptionActive(true);
  }, [newTxsAvailable]);
  useEffect(() => () => clearTimeout(newTxsTimer.current), []);

  const handleRefresh = () => {
    setNewTxsAvailable(false);
    // Refetch only the newest page: refetching an infinite query re-requests every loaded page in
    // sequence. The current rows stay mounted until the new page lands.
    queryClient.setQueryData<InfiniteData<unknown>>(queryKey, trimToFirstPage);
    refetch();
    onRefresh?.();
  };

  return (
    <>
      {liveUpdates === 'blocks' ? (
        <BlocksListener active={isSubscriptionActive} onUpdate={handleUpdate} />
      ) : (
        <MempoolListener active={isSubscriptionActive} onUpdate={handleUpdate} />
      )}
      {/* Rendered outside the table so refresh stays reachable with a type filter active or when
          no loaded rows match (the table shows its empty state in that case). */}
      {newTxsAvailable && (
        <UpdateTableBanner
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
      />
      <ListFooter
        isLoading={isFetchingNextPage}
        isError={isFetchNextPageError}
        hasNextPage={hasNextPage}
        // Don't let a click cancel an in-flight refetch (e.g. the refresh above) and drop its page.
        fetchNextPage={() => fetchNextPage({ cancelRefetch: false })}
        label={label}
      />
    </>
  );
}
