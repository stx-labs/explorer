'use client';

import { ListFooter } from '@/common/components/ListFooter';
import { SkeletonGenericTransactionList } from '@/common/components/loaders/skeleton-transaction';
import { useSuspenseCursorInfiniteQueryResult } from '@/common/hooks/useCursorInfiniteQueryResult';
import { useSuspensePrincipalTxSummariesInfinite } from '@/common/queries/usePrincipalTxSummaries';
import { PrincipalTransactionSummary } from '@/common/types/tx-v3';
import { FilteredTxSummaries } from '@/features/txs-list/v3/FilteredTxSummaries';
import { Box } from '@chakra-ui/react';
import { Suspense, useMemo } from 'react';

import { ExplorerErrorBoundary } from '../../../_components/ErrorBoundary';

function AddressConfirmedTxsBase({ principal }: { principal: string }) {
  const response = useSuspensePrincipalTxSummariesInfinite(principal);
  const items = useSuspenseCursorInfiniteQueryResult<PrincipalTransactionSummary>(response);
  const txs = useMemo(() => items.map(item => item.transaction), [items]);

  return (
    <Box flexGrow={1}>
      <Box position="relative">
        <FilteredTxSummaries txs={txs} />
        <ListFooter
          isLoading={response.isFetchingNextPage}
          hasNextPage={response.hasNextPage}
          fetchNextPage={response.fetchNextPage}
          label="transactions"
        />
      </Box>
    </Box>
  );
}

export function AddressConfirmedTxs({ principal }: { principal: string }) {
  return (
    <ExplorerErrorBoundary tryAgainButton>
      <Suspense fallback={<SkeletonGenericTransactionList />}>
        <AddressConfirmedTxsBase principal={principal} />
      </Suspense>
    </ExplorerErrorBoundary>
  );
}
