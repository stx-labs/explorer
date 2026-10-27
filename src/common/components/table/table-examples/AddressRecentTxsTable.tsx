'use client';

import { ExplorerErrorBoundary } from '@/app/_components/ErrorBoundary';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { usePrincipalTxSummaries } from '@/common/queries/usePrincipalTxSummaries';
import { PrincipalTransactionSummaryListResponse } from '@/common/types/tx-v3';
import { useMemo } from 'react';

import { Table } from '../Table';
import { defaultTableContainer } from './TxsTable';
import { mapPrincipalTxRow, principalTxsColumns } from './principalTxsTableColumns';

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
  const { data, isLoading } = usePrincipalTxSummaries(principal, pageSize, {
    initialData,
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
    throwOnError: true,
  });

  const rowData = useMemo(
    () => (data?.results ?? []).map(item => mapPrincipalTxRow(item.transaction)),
    [data?.results]
  );

  // Only block on the initial cold load, not background refetches: this capped preview keeps its
  // (at most `pageSize`) rows while refreshing, so it stays the height of the loaded rows instead of
  // collapsing into the full-height loading spinner the way a stale SSR-seeded refetch otherwise would.
  return (
    <Table
      data={rowData}
      columns={principalTxsColumns}
      tableContainerWrapper={defaultTableContainer}
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
