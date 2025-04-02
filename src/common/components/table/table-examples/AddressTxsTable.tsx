'use client';

import { CompressedTxTableData } from '@/app/transactions/utils';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import {
  getAddressConfirmedTxsWithTransfersQueryKey,
  useAddressConfirmedTxsWithTransfers,
} from '@/common/queries/useAddressConfirmedTxsWithTransfersInfinite';
import { formatTimestamp, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { getAmount, getToAddress } from '@/common/utils/transaction-utils';
import { validateStacksContractId } from '@/common/utils/utils';
import { Flex, Icon } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef, Header, PaginationState } from '@tanstack/react-table';
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Transaction } from '@stacks/stacks-blockchain-api-types';

import { ScrollIndicator } from '../../ScrollIndicator';
import { AddressLinkCellRenderer } from '../CommonTableCellRenderers';
import { Table } from '../Table';
import { DefaultTableColumnHeader } from '../TableComponents';
import { TableContainer } from '../TableContainer';
import {
  EventsCellRenderer,
  FeeCellRenderer,
  IconCellRenderer,
  TimeStampCellRenderer,
  TransactionTitleCellRenderer,
  TxLinkCellRenderer,
  TxTypeCellRenderer,
} from './TxTableCellRenderers';
import { TX_TABLE_PAGE_SIZE } from './consts';
import { TxTableColumns } from './types';

export interface AddressTxTableData {
  [TxTableColumns.Transaction]: Transaction;
  [TxTableColumns.TxId]: string;
  [TxTableColumns.TxType]: Transaction['tx_type'];
  [TxTableColumns.From]: TxTableAddressColumnData;
  [TxTableColumns.ArrowRight]: JSX.Element;
  [TxTableColumns.To]: TxTableAddressColumnData;
  [TxTableColumns.Fee]: string;
  [TxTableColumns.Amount]: number;
  [TxTableColumns.BlockTime]: number;
  [TxTableColumns.Events]: Transaction;
}

export interface TxTableAddressColumnData {
  address: string;
  isContract: boolean;
}

export const defaultColumnDefinitions: ColumnDef<AddressTxTableData>[] = [
  {
    id: TxTableColumns.Transaction,
    header: 'Transaction',
    accessorKey: TxTableColumns.Transaction,
    cell: info => {
      const transaction = info.row.original[TxTableColumns.Transaction];
      return TransactionTitleCellRenderer(transaction);
    },
    enableSorting: false,
  },
  {
    id: TxTableColumns.TxId,
    header: 'ID',
    accessorKey: TxTableColumns.TxId,
    cell: info => {
      const txId = info.row.original[TxTableColumns.TxId];
      return TxLinkCellRenderer(txId);
    },
    enableSorting: false,
  },
  {
    id: TxTableColumns.TxType,
    header: 'Type',
    accessorKey: TxTableColumns.TxType,
    cell: info => {
      const txType = info.row.original[TxTableColumns.TxType];
      return <TxTypeCellRenderer txType={txType} />;
    },
    enableSorting: false,
  },
  {
    id: TxTableColumns.From,
    header: 'From',
    accessorKey: TxTableColumns.From,
    cell: info => {
      const from = info.row.original[TxTableColumns.From];
      return AddressLinkCellRenderer(from);
    },
    enableSorting: false,
  },
  {
    id: TxTableColumns.ArrowRight,
    header: '',
    accessorKey: TxTableColumns.ArrowRight,
    cell: info => {
      const arrowRight = info.row.original[TxTableColumns.ArrowRight];
      return IconCellRenderer(arrowRight);
    },
    enableSorting: false,
    size: 45,
    minSize: 45,
    maxSize: 45,
  },
  {
    id: TxTableColumns.To,
    header: 'To',
    accessorKey: TxTableColumns.To,
    cell: info => {
      const to = info.row.original[TxTableColumns.To];
      return AddressLinkCellRenderer(to);
    },
    enableSorting: false,
  },
  {
    id: TxTableColumns.Fee,
    header: ({ header }: { header: Header<AddressTxTableData, unknown> }) => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        <DefaultTableColumnHeader header={header}>Fee</DefaultTableColumnHeader>
      </Flex>
    ),
    accessorKey: TxTableColumns.Fee,
    cell: info => {
      const fee = info.row.original[TxTableColumns.Fee];
      return (
        <Flex alignItems="center" justifyContent="flex-end" w="full">
          {FeeCellRenderer(fee)}
        </Flex>
      );
    },
    enableSorting: false,
  },
  {
    id: TxTableColumns.BlockTime,
    header: ({ header }: { header: Header<AddressTxTableData, unknown> }) => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        <DefaultTableColumnHeader header={header}>Timestamp</DefaultTableColumnHeader>
      </Flex>
    ),
    accessorKey: TxTableColumns.BlockTime,
    cell: info => {
      const blockTime = info.row.original[TxTableColumns.BlockTime];
      return (
        <Flex alignItems="center" justifyContent="flex-end" w="full">
          {TimeStampCellRenderer(
            formatTimestampToRelativeTime(blockTime),
            formatTimestamp(blockTime, 'HH:mm:ss', true)
          )}
        </Flex>
      );
    },
    enableSorting: false,
    meta: {
      tooltip: 'Timestamps are shown in your local timezone',
    },
  },
  {
    id: TxTableColumns.Events,
    header: ({ header }: { header: Header<AddressTxTableData, unknown> }) => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        <DefaultTableColumnHeader header={header}>Events</DefaultTableColumnHeader>
      </Flex>
    ),
    accessorKey: TxTableColumns.Events,
    cell: info => {
      const events = info.row.original[TxTableColumns.Events];
      return (
        <Flex alignItems="center" justifyContent="flex-end" w="full">
          {EventsCellRenderer(events)}
        </Flex>
      );
    },
    enableSorting: false,
  },
];

export interface AddressTxsTableProps {
  principal: string;
  initialData: GenericResponseType<CompressedTxTableData> | undefined;
  disablePagination?: boolean;
  columnDefinitions?: ColumnDef<AddressTxTableData>[];
  pageSize?: number;
  onTotalChange?: (total: number) => void;
}

export function AddressTxsTable({
  principal,
  initialData,
  disablePagination = false,
  columnDefinitions,
  pageSize = TX_TABLE_PAGE_SIZE,
  onTotalChange,
}: AddressTxsTableProps) {
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
    const queryKey = getAddressConfirmedTxsWithTransfersQueryKey(
      principal,
      pagination.pageSize,
      pagination.pageIndex * pagination.pageSize
    );
    queryClient.setQueryData(queryKey, initialData);
    isCacheSetWithInitialData.current = true;
  }

  // fetch data
  let { data, refetch, isFetching, isLoading } = useAddressConfirmedTxsWithTransfers(
    principal,
    pagination.pageSize,
    pagination.pageIndex * pagination.pageSize,
    {
      staleTime: THIRTY_SECONDS,
      gcTime: THIRTY_SECONDS,
    }
  );

  const { total, results: txs = [] } = data || {};

  useEffect(() => {
    if (onTotalChange && typeof total === 'number') {
      onTotalChange(total);
    }
  }, [total, onTotalChange]);

  const rowData: AddressTxTableData[] = useMemo(
    () =>
      txs.map(tx => {
        const transaction = tx.tx;
        const amount = getAmount(transaction);
        const to = getToAddress(transaction);

        return {
          [TxTableColumns.Transaction]: transaction,
          [TxTableColumns.TxId]: transaction.tx_id,
          [TxTableColumns.TxType]: transaction.tx_type,
          [TxTableColumns.From]: {
            address: transaction.sender_address,
            isContract: validateStacksContractId(transaction.sender_address),
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
          [TxTableColumns.Fee]: transaction.fee_rate,
          [TxTableColumns.Amount]: amount,
          [TxTableColumns.BlockTime]: transaction.block_time,
          [TxTableColumns.Events]: transaction,
        };
      }),
    [txs]
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
