'use client';

import { ListFooter } from '@/common/components/ListFooter';
import { SkeletonGenericTransactionList } from '@/common/components/loaders/skeleton-transaction';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { usePrincipalTxSummariesInfinite } from '@/common/queries/usePrincipalTxSummaries';
import { PrincipalTransactionSummary } from '@/common/types/tx-v3';
import { FilteredTxSummaries } from '@/features/txs-list/v3/FilteredTxSummaries';
import { Box } from '@chakra-ui/react';
import { useMemo } from 'react';

import { ExplorerErrorBoundary } from '../../../../app/_components/ErrorBoundary';

export interface AddressTxsTableProps {
  principal: string;
  pageSize: number;
  disablePagination?: boolean;
}

function AddressTxsTableBase({
  principal,
  pageSize,
  disablePagination = false,
}: AddressTxsTableProps) {
  const response = usePrincipalTxSummariesInfinite(principal, {
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
  });

  const txs = useMemo(() => {
    const items: PrincipalTransactionSummary[] =
      response.data?.pages.flatMap(page => page?.results ?? []) ?? [];
    const summaries = items.map(item => item.transaction);
    return disablePagination ? summaries.slice(0, pageSize) : summaries;
  }, [response.data?.pages, disablePagination, pageSize]);

  if (response.isLoading) {
    return <SkeletonGenericTransactionList />;
  }

  return (
    <Box flexGrow={1}>
      <Box position="relative">
        <FilteredTxSummaries txs={txs} />
        {!disablePagination && (
          <ListFooter
            isLoading={response.isFetchingNextPage}
            hasNextPage={response.hasNextPage}
            fetchNextPage={response.fetchNextPage}
            label="transactions"
          />
        )}
      </Box>
    </Box>
  );
}

export function AddressTxsTable(props: AddressTxsTableProps) {
  return (
    <ExplorerErrorBoundary tryAgainButton>
      <AddressTxsTableBase {...props} />
    </ExplorerErrorBoundary>
  );
}
