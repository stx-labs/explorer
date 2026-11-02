'use client';

import { ListFooter } from '@/common/components/ListFooter';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { throwOnFirstPageError } from '@/common/hooks/useCursorInfiniteQueryResult';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { usePrincipalTxSummariesInfinite } from '@/common/queries/usePrincipalTxSummaries';
import { filterByType } from '@/features/txs-list/utils';
import { useFilterAndSortState } from '@/features/txsFilterAndSort/useFilterAndSortState';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { ExplorerErrorBoundary } from '../../../../app/_components/ErrorBoundary';
import { Table } from '../Table';
import { defaultTableContainer } from './TxsTable';
import {
  TxSummaryTableRow,
  confirmedTxSummaryColumns,
  toPrincipalTxSummaryRow,
} from './txSummaryColumns';

export interface AddressTxsTableProps {
  principal: string;
  columns?: ColumnDef<TxSummaryTableRow>[];
}

function AddressTxsTableBase({
  principal,
  columns = confirmedTxSummaryColumns,
}: AddressTxsTableProps) {
  const response = usePrincipalTxSummariesInfinite(principal, {
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
    throwOnError: throwOnFirstPageError,
  });
  const { activeFilters } = useFilterAndSortState();

  const rowData = useMemo(() => {
    const items = response.data?.pages.flatMap(page => page?.results ?? []) ?? [];
    // Filter on the summary item (not just its transaction) so its balance_changes stay available
    // to infer the principal's sent/received direction.
    return filterByType(items, activeFilters, item => item.transaction.type).map(
      toPrincipalTxSummaryRow
    );
  }, [response.data?.pages, activeFilters]);

  return (
    <>
      <Table
        data={rowData}
        columns={columns}
        tableContainerWrapper={defaultTableContainer}
        scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
        isLoading={response.isLoading}
        isFetching={response.isFetching && !response.isFetchingNextPage}
      />
      <ListFooter
        isLoading={response.isFetchingNextPage}
        isError={response.isFetchNextPageError}
        hasNextPage={response.hasNextPage}
        fetchNextPage={() => response.fetchNextPage({ cancelRefetch: false })}
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
