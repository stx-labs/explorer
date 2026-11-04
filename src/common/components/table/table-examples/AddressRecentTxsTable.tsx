'use client';

import { ExplorerErrorBoundary } from '@/app/_components/ErrorBoundary';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { throwOnFirstPageError } from '@/common/hooks/useCursorInfiniteQueryResult';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import {
  principalTxSummariesQueryKey,
  usePrincipalTxSummaries,
} from '@/common/queries/usePrincipalTxSummaries';
import { PrincipalTransactionSummaryListResponse } from '@/common/types/tx-v3';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';

import { Table } from '../Table';
import { TableContainer } from '../TableContainer';
import { confirmedTxSummaryColumns, toPrincipalTxSummaryRow } from './txSummaryColumns';

interface AddressRecentTxsTableProps {
  principal: string;
  pageSize: number;
  /** Server-fetched first page used to seed the table (avoids a cold-load skeleton). */
  initialData?: PrincipalTransactionSummaryListResponse;
}

function AddressRecentTxsTableBase({
  principal,
  pageSize,
  initialData,
}: AddressRecentTxsTableProps) {
  const queryClient = useQueryClient();
  const { activeNetwork } = useGlobalContext();
  const isCacheSetWithInitialData = useRef(false);

  // react-query's initialData prop misbehaves across hydration, so seed the cache explicitly.
  if (!isCacheSetWithInitialData.current && initialData) {
    queryClient.setQueryData(
      principalTxSummariesQueryKey(activeNetwork.networkId, principal, pageSize),
      initialData
    );
    isCacheSetWithInitialData.current = true;
  }

  const { data, isLoading } = usePrincipalTxSummaries(principal, pageSize, {
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
    throwOnError: throwOnFirstPageError,
  });

  const rowData = useMemo(
    () => (data?.results ?? []).map(toPrincipalTxSummaryRow),
    [data?.results]
  );

  // Only block on the initial cold load, not background refetches: this capped preview keeps its
  // (at most `pageSize`) rows while refreshing, so it stays the height of the loaded rows instead of
  // collapsing into the full-height loading spinner the way a stale SSR-seeded refetch otherwise would.
  return (
    <Table
      data={rowData}
      columns={confirmedTxSummaryColumns}
      // A capped preview sizes to its rows — unlike `defaultTableContainer`, which reserves a
      // `minH` meant for full, paginated tables and would leave empty space under 3 rows.
      tableContainerWrapper={table => <TableContainer>{table}</TableContainer>}
      scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
      isLoading={isLoading}
    />
  );
}

/**
 * The recent-transactions table shown on the Address and Token "Overview" tabs: a capped, columnar
 * view (no pagination) of the latest v3 principal transaction summaries, optionally seeded from SSR.
 */
export function AddressRecentTxsTable(props: AddressRecentTxsTableProps) {
  return (
    <ExplorerErrorBoundary tryAgainButton>
      <AddressRecentTxsTableBase {...props} />
    </ExplorerErrorBoundary>
  );
}
