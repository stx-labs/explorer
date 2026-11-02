'use client';

import { ExplorerErrorBoundary } from '@/app/_components/ErrorBoundary';
import { InfiniteTxSummaryTable } from '@/common/components/table/table-examples/InfiniteTxSummaryTable';
import { defaultTableContainer } from '@/common/components/table/table-examples/TxsTable';
import { TX_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { confirmedTxSummaryColumns } from '@/common/components/table/table-examples/txSummaryColumns';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { throwOnFirstPageError } from '@/common/hooks/useCursorInfiniteQueryResult';
import {
  confirmedTxSummariesInfiniteQueryKey,
  useConfirmedTxSummariesInfinite,
} from '@/common/queries/useConfirmedTxSummaries';
import { TransactionSummaryListResponse } from '@/common/types/tx-v3';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';

interface ConfirmedTxsSummaryTableProps {
  initialData: TransactionSummaryListResponse | undefined;
}

function ConfirmedTxsSummaryTableBase({ initialData }: ConfirmedTxsSummaryTableProps) {
  const queryClient = useQueryClient();
  const { activeNetwork } = useGlobalContext();
  const isCacheSetWithInitialData = useRef(false);
  const queryKey = confirmedTxSummariesInfiniteQueryKey(
    activeNetwork.networkId,
    TX_TABLE_PAGE_SIZE
  );

  // react-query's initialData prop misbehaves across hydration, so seed the cache explicitly.
  if (!isCacheSetWithInitialData.current && initialData) {
    queryClient.setQueryData(queryKey, { pages: [initialData], pageParams: [undefined] });
    isCacheSetWithInitialData.current = true;
  }

  const response = useConfirmedTxSummariesInfinite(TX_TABLE_PAGE_SIZE, {
    throwOnError: throwOnFirstPageError,
  });
  const txs = useMemo(
    () => response.data?.pages.flatMap(page => page.results ?? []) ?? [],
    [response.data?.pages]
  );

  return (
    <InfiniteTxSummaryTable
      txs={txs}
      columns={confirmedTxSummaryColumns}
      queryKey={queryKey}
      liveUpdates="blocks"
      isLoading={response.isLoading}
      isFetchingNextPage={response.isFetchingNextPage}
      isFetchNextPageError={response.isFetchNextPageError}
      hasNextPage={response.hasNextPage}
      fetchNextPage={response.fetchNextPage}
      refetch={response.refetch}
      tableContainer={defaultTableContainer}
    />
  );
}

export function ConfirmedTxsSummaryTable(props: ConfirmedTxsSummaryTableProps) {
  return (
    <ExplorerErrorBoundary tryAgainButton>
      <ConfirmedTxsSummaryTableBase {...props} />
    </ExplorerErrorBoundary>
  );
}
