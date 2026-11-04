'use client';

import { ExplorerErrorBoundary } from '@/app/_components/ErrorBoundary';
import { InfiniteTxSummaryTable } from '@/common/components/table/table-examples/InfiniteTxSummaryTable';
import { defaultTableContainer } from '@/common/components/table/table-examples/TxsTable';
import { TX_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { sortableMempoolTxSummaryColumns } from '@/common/components/table/table-examples/txSummaryColumns';
import { TxTableColumns } from '@/common/components/table/table-examples/types';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { throwOnFirstPageError } from '@/common/hooks/useCursorInfiniteQueryResult';
import {
  DEFAULT_MEMPOOL_TXS_ORDER,
  DEFAULT_MEMPOOL_TXS_SORT_BY,
  mempoolTxSummariesInfiniteQueryKey,
  useMempoolTxSummariesInfinite,
} from '@/common/queries/useMempoolTxSummaries';
import {
  MempoolTransactionSummaryListResponse,
  MempoolTxsOrder,
  MempoolTxsSortBy,
} from '@/common/types/tx-v3';
import { MEMPOOL_TX_TYPE_FILTER_VALUES, toTypeParam } from '@/features/txs-list/utils';
import { useFilterAndSortState } from '@/features/txsFilterAndSort/useFilterAndSortState';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

const COLUMN_TO_SORT_BY: Record<string, MempoolTxsSortBy> = {
  [TxTableColumns.Fee]: 'fee',
  [TxTableColumns.BlockTime]: 'receipt_time',
};

const SORT_BY_TO_COLUMN: Record<MempoolTxsSortBy, string> = {
  fee: TxTableColumns.Fee,
  receipt_time: TxTableColumns.BlockTime,
};

interface MempoolTxsSummaryTableProps {
  initialData: MempoolTransactionSummaryListResponse | undefined;
}

function MempoolTxsSummaryTableBase({ initialData }: MempoolTxsSummaryTableProps) {
  const queryClient = useQueryClient();
  const { activeNetwork } = useGlobalContext();
  const { activeFilters } = useFilterAndSortState();
  const [sortBy, setSortBy] = useState<MempoolTxsSortBy>(DEFAULT_MEMPOOL_TXS_SORT_BY);
  const [order, setOrder] = useState<MempoolTxsOrder>(DEFAULT_MEMPOOL_TXS_ORDER);
  const types = useMemo(
    () => toTypeParam(activeFilters, MEMPOOL_TX_TYPE_FILTER_VALUES),
    [activeFilters]
  );
  const isCacheSetWithInitialData = useRef(false);
  const queryKey = mempoolTxSummariesInfiniteQueryKey(activeNetwork.networkId, TX_TABLE_PAGE_SIZE, {
    types,
    sortBy,
    order,
  });

  // react-query's initialData prop misbehaves across hydration, so seed the cache explicitly. The
  // server renders the default view: every type, newest received first.
  if (!isCacheSetWithInitialData.current && initialData) {
    queryClient.setQueryData(
      mempoolTxSummariesInfiniteQueryKey(activeNetwork.networkId, TX_TABLE_PAGE_SIZE),
      { pages: [initialData], pageParams: [undefined] }
    );
    isCacheSetWithInitialData.current = true;
  }

  const response = useMempoolTxSummariesInfinite(
    TX_TABLE_PAGE_SIZE,
    { types, sortBy, order },
    { throwOnError: throwOnFirstPageError }
  );
  const txs = useMemo(
    () => response.data?.pages.flatMap(page => page.results ?? []) ?? [],
    [response.data?.pages]
  );

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mempoolTransactionStats'] });
    queryClient.invalidateQueries({ queryKey: ['feeEstimates'] });
  }, [queryClient]);

  const serverSorting = useMemo(
    () => ({
      sorting: [{ id: SORT_BY_TO_COLUMN[DEFAULT_MEMPOOL_TXS_SORT_BY], desc: true }],
      onSortChange: (columnId: string, nextOrder: MempoolTxsOrder) => {
        const nextSortBy = COLUMN_TO_SORT_BY[columnId];
        if (!nextSortBy) return;
        setSortBy(nextSortBy);
        setOrder(nextOrder);
      },
    }),
    []
  );

  return (
    <InfiniteTxSummaryTable
      txs={txs}
      columns={sortableMempoolTxSummaryColumns}
      serverSorting={serverSorting}
      queryKey={queryKey}
      liveUpdates="mempool"
      isLoading={response.isLoading}
      isFetchingNextPage={response.isFetchingNextPage}
      isFetchNextPageError={response.isFetchNextPageError}
      hasNextPage={response.hasNextPage}
      fetchNextPage={response.fetchNextPage}
      refetch={response.refetch}
      tableContainer={defaultTableContainer}
      onRefresh={onRefresh}
    />
  );
}

export function MempoolTxsSummaryTable(props: MempoolTxsSummaryTableProps) {
  return (
    <ExplorerErrorBoundary tryAgainButton>
      <MempoolTxsSummaryTableBase {...props} />
    </ExplorerErrorBoundary>
  );
}
