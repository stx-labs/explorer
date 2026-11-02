'use client';

import { ExplorerErrorBoundary } from '@/app/_components/ErrorBoundary';
import { InfiniteTxSummaryTable } from '@/common/components/table/table-examples/InfiniteTxSummaryTable';
import { defaultTableContainer } from '@/common/components/table/table-examples/TxsTable';
import { TX_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { mempoolTxSummaryColumns } from '@/common/components/table/table-examples/txSummaryColumns';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { throwOnFirstPageError } from '@/common/hooks/useCursorInfiniteQueryResult';
import {
  mempoolTxSummariesInfiniteQueryKey,
  useMempoolTxSummariesInfinite,
} from '@/common/queries/useMempoolTxSummaries';
import { MempoolTransactionSummaryListResponse } from '@/common/types/tx-v3';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';

interface MempoolTxsSummaryTableProps {
  initialData: MempoolTransactionSummaryListResponse | undefined;
}

function MempoolTxsSummaryTableBase({ initialData }: MempoolTxsSummaryTableProps) {
  const queryClient = useQueryClient();
  const { activeNetwork } = useGlobalContext();
  const isCacheSetWithInitialData = useRef(false);
  const queryKey = mempoolTxSummariesInfiniteQueryKey(activeNetwork.networkId, TX_TABLE_PAGE_SIZE);

  // react-query's initialData prop misbehaves across hydration, so seed the cache explicitly.
  if (!isCacheSetWithInitialData.current && initialData) {
    queryClient.setQueryData(queryKey, { pages: [initialData], pageParams: [undefined] });
    isCacheSetWithInitialData.current = true;
  }

  const response = useMempoolTxSummariesInfinite(TX_TABLE_PAGE_SIZE, {
    throwOnError: throwOnFirstPageError,
  });
  const txs = useMemo(
    () => response.data?.pages.flatMap(page => page.results ?? []) ?? [],
    [response.data?.pages]
  );

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mempoolTransactionStats'] });
    queryClient.invalidateQueries({ queryKey: ['feeEstimates'] });
  }, [queryClient]);

  return (
    <InfiniteTxSummaryTable
      txs={txs}
      columns={mempoolTxSummaryColumns}
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
