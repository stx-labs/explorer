'use client';

import { useMemo } from 'react';

import { ListFooter } from '../../../../common/components/ListFooter';
import { ScrollIndicator } from '../../../../common/components/ScrollIndicator';
import { Section } from '../../../../common/components/Section';
import { SkeletonGenericTransactionList } from '../../../../common/components/loaders/skeleton-transaction';
import { Table } from '../../../../common/components/table/Table';
import { defaultTableContainer } from '../../../../common/components/table/table-examples/TxsTable';
import {
  blockTxSummaryColumns,
  toTxSummaryRow,
} from '../../../../common/components/table/table-examples/txSummaryColumns';
import { useSuspenseCursorInfiniteQueryResult } from '../../../../common/hooks/useCursorInfiniteQueryResult';
import { useSuspenseBlockTxSummariesInfinite } from '../../../../common/queries/useBlockTxSummariesInfinite';
import { TransactionSummary } from '../../../../common/types/tx-v3';
import { filterByType } from '../../../../features/txs-list/utils';
import { FilterButton } from '../../../../features/txsFilterAndSort/FilterButton';
import { useFilterAndSortState } from '../../../../features/txsFilterAndSort/useFilterAndSortState';
import { ExplorerErrorBoundary } from '../../../_components/ErrorBoundary';

interface BlockTxsListProps {
  blockHash: string;
  limit?: number;
}

function BlockTxsListBase({ blockHash, limit }: BlockTxsListProps) {
  const response = useSuspenseBlockTxSummariesInfinite(blockHash);
  const txs = useSuspenseCursorInfiniteQueryResult<TransactionSummary>(response, limit);
  const { activeFilters } = useFilterAndSortState();

  const rowData = useMemo(
    () => filterByType(txs, activeFilters).map(tx => toTxSummaryRow(tx)),
    [txs, activeFilters]
  );

  if (response.isLoading) {
    return <SkeletonGenericTransactionList />;
  }

  return (
    <Section title={'Transactions'} topRight={<FilterButton />}>
      <Table
        data={rowData}
        columns={blockTxSummaryColumns}
        tableContainerWrapper={defaultTableContainer}
        scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
        isLoading={response.isLoading}
      />
      <ListFooter
        isLoading={response.isFetchingNextPage}
        isError={response.isFetchNextPageError}
        hasNextPage={response.hasNextPage}
        fetchNextPage={limit ? undefined : () => response.fetchNextPage({ cancelRefetch: false })}
        label={'transactions'}
      />
    </Section>
  );
}

export function BlockTxsList(props: BlockTxsListProps) {
  return (
    <ExplorerErrorBoundary
      Wrapper={Section}
      wrapperProps={{ title: 'Transactions' }}
      tryAgainButton
    >
      <BlockTxsListBase {...props} />
    </ExplorerErrorBoundary>
  );
}
