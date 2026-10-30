'use client';

import { Flex } from '@chakra-ui/react';
import { useMemo } from 'react';

import { ListFooter } from '../../../../common/components/ListFooter';
import { ScrollIndicator } from '../../../../common/components/ScrollIndicator';
import { Section } from '../../../../common/components/Section';
import { SkeletonGenericTransactionList } from '../../../../common/components/loaders/skeleton-transaction';
import { Table } from '../../../../common/components/table/Table';
import { defaultTableContainer } from '../../../../common/components/table/table-examples/TxsTable';
import {
  mapPrincipalTxRow,
  principalTxsColumns,
} from '../../../../common/components/table/table-examples/principalTxsTableColumns';
import { useSuspenseCursorInfiniteQueryResult } from '../../../../common/hooks/useCursorInfiniteQueryResult';
import { useSuspenseBlockTxSummariesInfinite } from '../../../../common/queries/useBlockTxSummariesInfinite';
import { TransactionSummary } from '../../../../common/types/tx-v3';
import { FilterButton } from '../../../../features/txsFilterAndSort/FilterButton';
import { ShowValueMenu } from '../../../../features/txsFilterAndSort/ShowValueMenu';
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

  const rowData = useMemo(() => {
    const filtered =
      activeFilters.length === 0 ? txs : txs.filter(tx => activeFilters.includes(tx.type));
    return filtered.map(mapPrincipalTxRow);
  }, [txs, activeFilters]);

  if (response.isLoading) {
    return <SkeletonGenericTransactionList />;
  }

  return (
    <Section
      title={'Transactions'}
      topRight={
        <Flex gap={4} direction={['column', 'row']}>
          <ShowValueMenu />
          <FilterButton />
        </Flex>
      }
    >
      <Table
        data={rowData}
        columns={principalTxsColumns}
        tableContainerWrapper={defaultTableContainer}
        scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
        isLoading={response.isLoading}
      />
      <ListFooter
        isLoading={response.isFetchingNextPage}
        hasNextPage={response.hasNextPage}
        fetchNextPage={limit ? undefined : response.fetchNextPage}
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
