'use client';

import { getHoldersQueryKey, useHolders } from '@/app/token/[tokenId]/Tabs/data/useHolders';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import {
  calculateHoldingPercentage,
  formatHoldingPercentage,
} from '@/common/utils/fungible-token-utils';
import { formatNumber } from '@/common/utils/string-utils';
import { getFtDecimalAdjustedBalance, validateStacksContractId } from '@/common/utils/utils';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useCallback, useMemo, useRef, useState } from 'react';

import { ScrollIndicator } from '../../ScrollIndicator';
import {
  AddressLinkCellRenderer,
  AddressLinkCellRendererProps,
  EllipsisText,
  IndexCellRenderer,
} from '../CommonTableCellRenderers';
import { Table } from '../Table';
import { TableContainer } from '../TableContainer';

export enum HoldersTableColumns {
  Index = 'index',
  Address = 'address',
  Balance = 'balance',
  Holding = 'holding',
}

export interface HoldersTableData {
  [HoldersTableColumns.Index]: number;
  [HoldersTableColumns.Address]: AddressLinkCellRendererProps;
  [HoldersTableColumns.Balance]: string;
  [HoldersTableColumns.Holding]: string;
}

export const defaultColumnDefinitions: ColumnDef<HoldersTableData>[] = [
  {
    id: HoldersTableColumns.Index,
    header: '#',
    accessorKey: HoldersTableColumns.Index,
    cell: info => <IndexCellRenderer index={info.row.original[HoldersTableColumns.Index]} />,
    enableSorting: false,
  },
  {
    id: HoldersTableColumns.Address,
    header: 'Address',
    accessorKey: HoldersTableColumns.Address,
    cell: info =>
      AddressLinkCellRenderer({
        address: info.row.original[HoldersTableColumns.Address].address,
        isContract: info.row.original[HoldersTableColumns.Address].isContract,
      }),
    enableSorting: false,
  },
  {
    id: HoldersTableColumns.Balance,
    header: 'Balance',
    accessorKey: HoldersTableColumns.Balance,
    cell: info => <EllipsisText>{info.row.original[HoldersTableColumns.Balance]}</EllipsisText>,
    enableSorting: false,
  },
  {
    id: HoldersTableColumns.Holding,
    header: 'Holding',
    accessorKey: HoldersTableColumns.Holding,
    cell: info => <EllipsisText>{info.row.original[HoldersTableColumns.Holding]}</EllipsisText>,
    enableSorting: false,
  },
];

export interface HoldersTableProps {
  assetId: string;
  totalSupply: number;
  decimals: number;
  initialData?: GenericResponseType<HoldersTableData> | undefined;
  disablePagination?: boolean;
  columnDefinitions?: ColumnDef<HoldersTableData>[];
  pageSize: number;
  onTotalChange?: (total: number) => void;
}

export function HoldersTable({
  assetId,
  totalSupply,
  decimals,
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
  const { data, isFetching, isLoading } = useHolders(
    assetId,
    pagination.pageSize,
    pagination.pageIndex * pagination.pageSize,
    {
      staleTime: THIRTY_SECONDS,
      gcTime: THIRTY_SECONDS,
    }
  );

  const { total, results: holders = [] } = data || {};

  const rowData: HoldersTableData[] = useMemo(() => {
    return holders.map((holder, index) => {
      const adjustedBalance = getFtDecimalAdjustedBalance(holder.balance, decimals);
      const adjustedTotalSupply = getFtDecimalAdjustedBalance(totalSupply, decimals);
      const formattedBalance = formatNumber(adjustedBalance, 0, decimals);
      const holdingPercentage = calculateHoldingPercentage(adjustedBalance, adjustedTotalSupply, 6);
      const formattedHoldingPercentage = holdingPercentage
        ? formatHoldingPercentage(holdingPercentage)
        : undefined;
      const holdersIndex = index + 1 + pagination.pageIndex * pagination.pageSize;

      return {
        [HoldersTableColumns.Index]: holdersIndex,
        [HoldersTableColumns.Address]: {
          address: holder.address,
          isContract: validateStacksContractId(holder.address),
        },
        [HoldersTableColumns.Balance]: formattedBalance,
        [HoldersTableColumns.Holding]: formattedHoldingPercentage || 'N/A',
      };
    });
  }, [holders, totalSupply, decimals, pagination]);

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
