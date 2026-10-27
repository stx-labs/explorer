'use client';

import { ListFooter } from '@/common/components/ListFooter';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { usePrincipalTxSummariesInfinite } from '@/common/queries/usePrincipalTxSummaries';
import { useFilterAndSortState } from '@/features/txsFilterAndSort/useFilterAndSortState';
import { useMemo } from 'react';

import { ExplorerErrorBoundary } from '../../../../app/_components/ErrorBoundary';
import { Table } from '../Table';
import { defaultTableContainer } from './TxsTable';
import { mapPrincipalTxRow, principalTxsColumns } from './principalTxsTableColumns';

export interface AddressTxsTableProps {
  principal: string;
}

function AddressTxsTableBase({ principal }: AddressTxsTableProps) {
  const response = usePrincipalTxSummariesInfinite(principal, {
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
    throwOnError: true,
  });
  const { activeFilters } = useFilterAndSortState();

  const rowData = useMemo(() => {
    const txs = (response.data?.pages.flatMap(page => page?.results ?? []) ?? []).map(
      item => item.transaction
    );
    const filtered =
      activeFilters.length === 0 ? txs : txs.filter(tx => activeFilters.includes(tx.type));
    return filtered.map(mapPrincipalTxRow);
  }, [response.data?.pages, activeFilters]);

  return (
    <>
      <Table
        data={rowData}
        columns={principalTxsColumns}
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

export function AddressTxsTable(props: AddressTxsTableProps) {
  return (
    <ExplorerErrorBoundary tryAgainButton>
      <AddressTxsTableBase {...props} />
    </ExplorerErrorBoundary>
  );
}
