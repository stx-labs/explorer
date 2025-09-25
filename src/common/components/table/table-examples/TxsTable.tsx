'use client';

import { useSubscribeTxs } from '@/app/_components/BlockList/Sockets/useSubscribeTxs';
import { TxPageFilters } from '@/app/transactions/page';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { useConfirmedTransactions } from '@/common/queries/useConfirmedTransactionsInfinite';
import { formatTimestamp, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { CompressedTxTableData } from '@/common/utils/transaction-utils';
import { getAmount, getToAddress } from '@/common/utils/transaction-utils';
import { validateStacksContractId } from '@/common/utils/utils';
import { Flex, Icon } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef, Header, PaginationState } from '@tanstack/react-table';
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { useFilterAndSortState } from '../../../../features/txsFilterAndSort/useFilterAndSortState';
import { ScrollIndicator } from '../../ScrollIndicator';
import { AddressLinkCellRenderer } from '../CommonTableCellRenderers';
import { Table } from '../Table';
import { DefaultTableColumnHeader } from '../TableComponents';
import { TableContainer } from '../TableContainer';
import { UpdateTableBannerRow } from '../UpdateTableBannerRow';
import {
  FeeCellRenderer,
  IconCellRenderer,
  TimeStampCellRenderer,
  TransactionTitleCellRenderer,
  TxLinkCellRenderer,
  TxTypeCellRenderer,
} from './TxTableCellRenderers';
import { TX_TABLE_PAGE_SIZE } from './consts';
import { TxTableColumns } from './types';

export interface TxTableData {
  [TxTableColumns.Transaction]: Transaction | MempoolTransaction;
  [TxTableColumns.TxId]: string;
  [TxTableColumns.TxType]: Transaction['tx_type'];
  [TxTableColumns.From]: TxTableAddressColumnData;
  [TxTableColumns.ArrowRight]: JSX.Element;
  [TxTableColumns.To]: TxTableAddressColumnData;
  [TxTableColumns.Fee]: string;
  [TxTableColumns.Amount]: number;
  [TxTableColumns.BlockTime]: number;
  [TxTableColumns.Events]?: Transaction | MempoolTransaction;
}

export interface TxTableAddressColumnData {
  address: string;
  isContract: boolean;
}

export const defaultColumnDefinitions: ColumnDef<TxTableData>[] = [
  {
    id: TxTableColumns.Transaction,
    header: 'Transaction',
    accessorKey: TxTableColumns.Transaction,
    cell: info => TransactionTitleCellRenderer(info.getValue() as Transaction | MempoolTransaction),
    enableSorting: false,
  },
  {
    id: TxTableColumns.TxId,
    header: 'ID',
    accessorKey: TxTableColumns.TxId,
    cell: info => TxLinkCellRenderer(info.getValue() as string),
    enableSorting: false,
  },
  {
    id: TxTableColumns.TxType,
    header: 'Type',
    accessorKey: TxTableColumns.TxType,
    cell: info => <TxTypeCellRenderer txType={info.getValue() as string} />,
    enableSorting: false,
  },
  {
    id: TxTableColumns.From,
    header: 'From',
    accessorKey: TxTableColumns.From,
    cell: info => AddressLinkCellRenderer(info.getValue() as TxTableAddressColumnData),
    enableSorting: false,
  },
  {
    id: TxTableColumns.ArrowRight,
    header: '',
    accessorKey: TxTableColumns.ArrowRight,
    cell: info => IconCellRenderer(info.getValue() as JSX.Element),
    enableSorting: false,
    size: 45,
    minSize: 45,
    maxSize: 45,
  },
  {
    id: TxTableColumns.To,
    header: 'To',
    accessorKey: TxTableColumns.To,
    cell: info => AddressLinkCellRenderer(info.getValue() as TxTableAddressColumnData),
    enableSorting: false,
  },
  {
    id: TxTableColumns.Fee,
    header: ({ header }: { header: Header<TxTableData, unknown> }) => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        <DefaultTableColumnHeader header={header}>Fee</DefaultTableColumnHeader>
      </Flex>
    ),
    accessorKey: TxTableColumns.Fee,
    cell: info => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        {FeeCellRenderer(info.getValue() as string)}
      </Flex>
    ),
    enableSorting: false,
  },
  {
    id: TxTableColumns.BlockTime,
    header: ({ header }: { header: Header<TxTableData, unknown> }) => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        <DefaultTableColumnHeader header={header}>Timestamp</DefaultTableColumnHeader>
      </Flex>
    ),
    accessorKey: TxTableColumns.BlockTime,
    cell: info => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        {TimeStampCellRenderer(
          formatTimestampToRelativeTime(info.getValue() as number),
          formatTimestamp(info.getValue() as number, 'HH:mm:ss', true)
        )}
      </Flex>
    ),
    enableSorting: false,
    meta: {
      tooltip: 'Timestamps are shown in your local timezone',
    },
  },
];

export interface TxsTableProps {
  initialData: GenericResponseType<CompressedTxTableData> | undefined;
  disablePagination?: boolean;
  columnDefinitions?: ColumnDef<TxTableData>[];
  pageSize?: number;
  filters?: TxPageFilters;
  onTotalChange?: (total: number) => void;
  tableContainer?: (table: JSX.Element) => JSX.Element;
  disableBannerRow?: boolean;
}

const DEFAULT_FILTERS: TxPageFilters = {
  fromAddress: '',
  toAddress: '',
  startTime: '',
  endTime: '',
  transactionType: [],
};

export const defaultTableContainer = (table: JSX.Element) => (
  <TableContainer minH="500px">{table}</TableContainer>
);

export function TxsTable({
  filters = DEFAULT_FILTERS,
  initialData,
  disablePagination = false,
  columnDefinitions,
  pageSize = TX_TABLE_PAGE_SIZE,
  onTotalChange,
  tableContainer,
  disableBannerRow = false,
}: TxsTableProps) {
  const { activeConfirmedTxsSort, activeConfirmedTxsOrder } = useFilterAndSortState();

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

  const { fromAddress, toAddress, startTime, endTime, transactionType } = filters;

  /**
   * HACK: react query's cache is taking precedence over the initial data, which is causing hydration errors
   * Setting the gcTime to 0 prevents this from happening but it also prevents us from caching requests as the user paginates through the table
   * React query's initial data prop does not behave as expected. While it enables us to use the initial data for the first page, the initial data prop makes the logic required to replace initial data when it becomes stale difficult
   * By explicitly setting the cache for the first page with initial data, we guarantee the table will use the initial data from the server and behave as expected
   */
  if (isCacheSetWithInitialData.current === false && initialData) {
    const queryKey = [
      'confirmedTransactions',
      pagination.pageSize,
      pagination.pageIndex * pagination.pageSize,
      ...(fromAddress ? [{ fromAddress }] : []),
      ...(toAddress ? [{ toAddress }] : []),
      ...(startTime ? [{ startTime }] : []),
      ...(endTime ? [{ endTime }] : []),
      ...(activeConfirmedTxsOrder ? [{ order: activeConfirmedTxsOrder }] : []),
      ...(activeConfirmedTxsSort ? [{ sortBy: activeConfirmedTxsSort }] : []),
      ...(transactionType ? [{ transactionType }] : []),
    ];
    queryClient.setQueryData(queryKey, initialData);
    isCacheSetWithInitialData.current = true;
  }

  // fetch data
  let { data, refetch, isFetching, isLoading } = useConfirmedTransactions(
    pagination.pageSize,
    pagination.pageIndex * pagination.pageSize,
    {
      ...filters,
      order: activeConfirmedTxsOrder,
      sortBy: activeConfirmedTxsSort,
    },
    {
      staleTime: THIRTY_SECONDS,
      gcTime: THIRTY_SECONDS,
    }
  );

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [filters]);

  const { total, results: txs = [] } = data || {};
  const isTableFiltered = Object.values(filters).some(
    filterValue => filterValue != null && filterValue !== '' && filterValue?.length !== 0
  );

  useEffect(() => {
    if (onTotalChange && typeof total === 'number') {
      onTotalChange(total);
    }
  }, [total, onTotalChange]);

  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);

  const [newTxsAvailable, setNewTxsAvailable] = useState(false);

  useSubscribeTxs(isSubscriptionActive, tx => {
    // Waiting 5 seconds to let the API catch up to the websocket
    setTimeout(() => {
      setNewTxsAvailable(true);
    }, 5000);
    setIsSubscriptionActive(false);
  });
  useEffect(() => {
    if (!newTxsAvailable) {
      setIsSubscriptionActive(true);
    }
  }, [newTxsAvailable]);

  const rowData: TxTableData[] = useMemo(
    () =>
      txs.map(tx => {
        const to = getToAddress(tx);
        const amount = getAmount(tx);

        return {
          [TxTableColumns.Transaction]: tx,
          [TxTableColumns.TxId]: tx.tx_id,
          [TxTableColumns.TxType]: tx.tx_type,
          [TxTableColumns.From]: {
            address: tx.sender_address,
            isContract: validateStacksContractId(tx.sender_address),
          },
          [TxTableColumns.ArrowRight]: (
            <Icon color="iconTertiary">
              <ArrowRight />
            </Icon>
          ),
          [TxTableColumns.To]: {
            address: to,
            isContract: validateStacksContractId(to),
          },
          [TxTableColumns.Fee]: tx.fee_rate,
          [TxTableColumns.Amount]: amount,
          [TxTableColumns.BlockTime]: tx.block_time,
          [TxTableColumns.Events]: tx,
        };
      }),
    [txs]
  );

  return (
    <Table
      data={rowData}
      columns={columnDefinitions ?? defaultColumnDefinitions}
      tableContainerWrapper={tableContainer ? table => tableContainer(table) : undefined}
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
      bannerRow={
        !disableBannerRow && newTxsAvailable && pagination.pageIndex === 0 && !isTableFiltered ? (
          <UpdateTableBannerRow
            onClick={() => {
              setNewTxsAvailable(false);
              refetch();
            }}
            colSpan={Object.keys(TxTableColumns).length}
            message="New transactions have come in. Update list"
          />
        ) : null
      }
      isLoading={isLoading}
      isFetching={isFetching}
      isFiltered={isTableFiltered}
    />
  );
}
