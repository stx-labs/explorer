'use client';

import { getHoldersQueryKey, useHolders } from '@/app/token/[tokenId]/Tabs/data/useHolders';
import { TxTableAddressColumnData } from '@/common/components/table/table-examples/TxsTable';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useCallback, useMemo, useRef, useState } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { ScrollIndicator } from '../../ScrollIndicator';
import { AddressLinkCellRenderer } from '../CommonTableCellRenderers';
import { Table } from '../Table';
import { TableContainer } from '../TableContainer';
import { TransactionTitleCellRenderer } from './AddressTxsTaBleCellRenderers';

export enum HoldersTableColumns {
  Index = 'index',
  Address = 'address',
  Balance = 'balance',
  Holding = 'holding',
}

export interface HoldersTableData {
  [HoldersTableColumns.Index]: number;
  [HoldersTableColumns.Address]: string;
  [HoldersTableColumns.Balance]: string;
  [HoldersTableColumns.Holding]: string;
}

type AddressTxsTableTransactionTitleColumnData = {
  principal: string;
  tx: Transaction | MempoolTransaction;
};

export const defaultColumnDefinitions: ColumnDef<HoldersTableData>[] = [
  {
    id: HoldersTableColumns.Index,
    header: 'Index',
    accessorKey: HoldersTableColumns.Index,
    cell: info => {
      const { principal, tx } = info.getValue() as AddressTxsTableTransactionTitleColumnData;
      return TransactionTitleCellRenderer(principal, tx);
    },
    enableSorting: false,
  },
  {
    id: HoldersTableColumns.Address,
    header: 'Address',
    accessorKey: HoldersTableColumns.Address,
    cell: info => AddressLinkCellRenderer(info.getValue() as TxTableAddressColumnData),
    enableSorting: false,
  },
  {
    id: HoldersTableColumns.Balance,
    header: 'Balance',
    accessorKey: HoldersTableColumns.Balance,
    cell: info => info.getValue() as string,
    enableSorting: false,
  },
  {
    id: HoldersTableColumns.Holding,
    header: 'Holding',
    accessorKey: HoldersTableColumns.Holding,
    cell: info => info.getValue() as string,
    enableSorting: false,
  },
];

export interface HoldersTableProps {
  assetId: string;
  initialData?: GenericResponseType<HoldersTableData> | undefined;
  disablePagination?: boolean;
  columnDefinitions?: ColumnDef<HoldersTableData>[];
  pageSize: number;
  onTotalChange?: (total: number) => void;
}

export function HoldersTable({
  assetId,
  initialData,
  disablePagination = false,
  columnDefinitions,
  pageSize,
}: HoldersTableProps) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const handlePageChange = useCallback((page: PaginationState) => {
    setPagination(prev => ({
      ...prev,
      pageIndex: page.pageIndex,
    }));
    window?.scrollTo(0, 0); // Smooth scroll to top
  }, []);

  const queryClient = useQueryClient();

  const isCacheSetWithInitialData = useRef(false);
  /**
   * HACK: react query's cache is taking precedence over the initial data, which is causing hydration errors
   * Setting the gcTime to 0 prevents this from happening but it also prevents us from caching requests as the user paginates through the table
   * React query's initial data prop does not behave as expected. While it enables us to use the initial data for the first page, the initial data prop makes the logic required to replace initial data when it becomes stale difficult
   * By explicitly setting the cache for the first page with initial data, we guarantee the table will use the initial data from the server and behave as expected
   */
  if (isCacheSetWithInitialData.current === false && initialData) {
    const queryKey = getHoldersQueryKey(
      assetId,
      pagination.pageSize,
      pagination.pageIndex * pagination.pageSize
    );
    queryClient.setQueryData(queryKey, initialData);
    isCacheSetWithInitialData.current = true;
  }

  // fetch data
  let { data, isFetching, isLoading } = useHolders(
    assetId,
    pagination.pageSize,
    pagination.pageIndex * pagination.pageSize,
    {
      staleTime: THIRTY_SECONDS,
      gcTime: THIRTY_SECONDS,
    }
  );

  const { total, results: holders = [] } = data || {};
  console.log('HoldersTable', { holders });

  const rowData: HoldersTableData[] = useMemo(
    () =>
      holders.map((holder, index) => {
        return {
          [HoldersTableColumns.Index]: index,
          [HoldersTableColumns.Address]: holder.address,
          [HoldersTableColumns.Balance]: holder.balance,
          [HoldersTableColumns.Holding]: holder.holding,
        };
      }),
    [holders]
  );

  return (
    <Table
      data={rowData}
      columns={columnDefinitions ?? defaultColumnDefinitions}
      tableContainerWrapper={table => <TableContainer>{table}</TableContainer>}
      scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
      pagination={
        disablePagination
          ? undefined
          : {
              manualPagination: true,
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
              totalRows: total || 0,
              onPageChange: handlePageChange,
            }
      }
      isLoading={isLoading}
      isFetching={isFetching}
    />
  );
}
