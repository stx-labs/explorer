'use client';

import { ListFooter } from '@/common/components/ListFooter';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { usePrincipalMempoolTxSummariesInfinite } from '@/common/queries/useMempoolTxSummaries';
import { useFilterAndSortState } from '@/features/txsFilterAndSort/useFilterAndSortState';
import { useMemo } from 'react';

import { ExplorerErrorBoundary } from '../../../../app/_components/ErrorBoundary';
import { Table } from '../Table';
import { defaultTableContainer } from './TxsTable';
import { mapPrincipalMempoolTxRow, principalMempoolTxsColumns } from './principalMempoolTxsColumns';

export interface AddressMempoolTxsTableProps {
  principal: string;
}

function AddressMempoolTxsTableBase({ principal }: AddressMempoolTxsTableProps) {
  const response = usePrincipalMempoolTxSummariesInfinite(principal, {
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
    throwOnError: true,
  });
  const { activeFilters } = useFilterAndSortState();

  const rowData = useMemo(() => {
    const txs = response.data?.pages.flatMap(page => page?.results ?? []) ?? [];
    const filtered =
      activeFilters.length === 0 ? txs : txs.filter(tx => activeFilters.includes(tx.type));
    return filtered.map(mapPrincipalMempoolTxRow);
  }, [response.data?.pages, activeFilters]);

  return (
    <>
      <Table
        data={rowData}
        columns={principalMempoolTxsColumns}
        tableContainerWrapper={defaultTableContainer}
        scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
        isLoading={response.isLoading}
        isFetching={response.isFetching && !response.isFetchingNextPage}
      />
      <ListFooter
        isLoading={response.isFetchingNextPage}
        hasNextPage={response.hasNextPage}
        fetchNextPage={response.fetchNextPage}
        label="transactions"
      />
    </>
  );
}

/** The address "Pending" tab: a principal's mempool transactions as a v3 cursor-paginated table. */
export function AddressMempoolTxsTable(props: AddressMempoolTxsTableProps) {
  return (
    <ExplorerErrorBoundary tryAgainButton>
      <AddressMempoolTxsTableBase {...props} />
    </ExplorerErrorBoundary>
  );
}
