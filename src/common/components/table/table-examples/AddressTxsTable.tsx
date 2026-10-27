'use client';

import { ListFooter } from '@/common/components/ListFooter';
import { SkeletonGenericTransactionList } from '@/common/components/loaders/skeleton-transaction';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import {
  usePrincipalTxSummaries,
  usePrincipalTxSummariesInfinite,
} from '@/common/queries/usePrincipalTxSummaries';
import {
  PrincipalTransactionSummary,
  PrincipalTransactionSummaryListResponse,
} from '@/common/types/tx-v3';
import { FilteredTxSummaries } from '@/features/txs-list/v3/FilteredTxSummaries';
import { Box } from '@chakra-ui/react';
import { useMemo } from 'react';

import { ExplorerErrorBoundary } from '../../../../app/_components/ErrorBoundary';

export interface AddressTxsTableProps {
  principal: string;
  pageSize: number;
  disablePagination?: boolean;
  /** Server-fetched first page used to seed the recent-transactions list (disablePagination only). */
  initialData?: PrincipalTransactionSummaryListResponse;
}

const toSummaries = (items: PrincipalTransactionSummary[]) => items.map(item => item.transaction);

// Non-paginated "recent transactions" preview. Uses the single-page query (keyed by limit) so it
// can be seeded from SSR without affecting the paginated list's shared infinite cache.
function RecentTxsList({
  principal,
  pageSize,
  initialData,
}: {
  principal: string;
  pageSize: number;
  initialData?: PrincipalTransactionSummaryListResponse;
}) {
  const { data, isLoading } = usePrincipalTxSummaries(principal, pageSize, {
    initialData,
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
    throwOnError: true,
  });

  const txs = useMemo(() => toSummaries(data?.results ?? []), [data?.results]);

  if (isLoading) {
    return <SkeletonGenericTransactionList />;
  }

  return (
    <Box flexGrow={1}>
      <FilteredTxSummaries txs={txs} />
    </Box>
  );
}

// Paginated list with cursor "Load more".
function InfiniteTxsList({ principal }: { principal: string }) {
  const response = usePrincipalTxSummariesInfinite(principal, {
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
    throwOnError: true,
  });

  const txs = useMemo(
    () => toSummaries(response.data?.pages.flatMap(page => page?.results ?? []) ?? []),
    [response.data?.pages]
  );

  if (response.isLoading) {
    return <SkeletonGenericTransactionList />;
  }

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

export function AddressTxsTable({
  principal,
  pageSize,
  disablePagination = false,
  initialData,
}: AddressTxsTableProps) {
  return (
    <ExplorerErrorBoundary tryAgainButton>
      {disablePagination ? (
        <RecentTxsList principal={principal} pageSize={pageSize} initialData={initialData} />
      ) : (
        <InfiniteTxsList principal={principal} />
      )}
    </ExplorerErrorBoundary>
  );
}
