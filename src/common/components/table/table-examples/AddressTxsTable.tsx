'use client';

import { CompressedTxAndMempoolTxTableData } from '@/app/transactions/utils';
import { TxTableAddressColumnData } from '@/common/components/table/table-examples/TxsTable';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import {
  getAddressTxsQueryKey,
  useAddressTxs,
} from '@/common/queries/useAddressConfirmedTxsWithTransfersInfinite';
import { formatTimestamp, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { getAmount, getToAddress, isConfirmedTx } from '@/common/utils/transaction-utils';
import { validateStacksContractId } from '@/common/utils/utils';
import { Flex, Icon } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef, Header, PaginationState } from '@tanstack/react-table';
import { type JSX, useCallback, useMemo, useRef, useState } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { ScrollIndicator } from '../../ScrollIndicator';
import { AddressLinkCellRenderer } from '../CommonTableCellRenderers';
import { Table } from '../Table';
import { DefaultTableColumnHeader } from '../TableComponents';
import { TableContainer } from '../TableContainer';
import { EventsCellRenderer, TransactionTitleCellRenderer } from './AddressTxsTaBleCellRenderers';
import {
  FeeCellRenderer,
  IconCellRenderer,
  TimeStampCellRenderer,
  TxLinkCellRenderer,
  TxTypeCellRenderer,
} from './TxTableCellRenderers';

export enum AddressTxsTableColumns {
  Transaction = 'transaction',
  TxId = 'txId',
  TxType = 'txType',
  From = 'from',
  ArrowRight = 'arrowRight',
  To = 'to',
  Fee = 'fee',
  Amount = 'amount',
  BlockTime = 'blockTime',
  Events = 'events',
}

export interface AddressTxsTableData {
  [AddressTxsTableColumns.Transaction]: AddressTxsTableTransactionTitleColumnData;
  [AddressTxsTableColumns.TxId]: string;
  [AddressTxsTableColumns.TxType]: Transaction['tx_type'];
  [AddressTxsTableColumns.From]: TxTableAddressColumnData;
  [AddressTxsTableColumns.ArrowRight]: JSX.Element;
  [AddressTxsTableColumns.To]: TxTableAddressColumnData;
  [AddressTxsTableColumns.Fee]: string;
  [AddressTxsTableColumns.Amount]: number;
  [AddressTxsTableColumns.BlockTime]: number | undefined;
  [AddressTxsTableColumns.Events]: AddressTxsTableEventsColumnData;
}

type AddressTxsTableTransactionTitleColumnData = {
  principal: string;
  tx: Transaction | MempoolTransaction;
};

type AddressTxsTableEventsColumnData = {
  numEvents: number;
  txId: string;
};

export const EVENTS_COLUMN_DEFINITION: ColumnDef<AddressTxsTableData> = {
  id: AddressTxsTableColumns.Events,
  header: ({ header }: { header: Header<AddressTxsTableData, unknown> }) => (
    <Flex alignItems="center" justifyContent="flex-end" w="full">
      <DefaultTableColumnHeader header={header}>Events</DefaultTableColumnHeader>
    </Flex>
  ),
  accessorKey: AddressTxsTableColumns.Events,
  cell: info => {
    const { numEvents, txId } = info.getValue() as AddressTxsTableEventsColumnData;
    return (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        {EventsCellRenderer(numEvents, txId)}
      </Flex>
    );
  },
  enableSorting: false,
};

export const defaultColumnDefinitions: ColumnDef<AddressTxsTableData>[] = [
  {
    id: AddressTxsTableColumns.Transaction,
    header: 'Transaction',
    accessorKey: AddressTxsTableColumns.Transaction,
    cell: info => {
      const { principal, tx } = info.getValue() as AddressTxsTableTransactionTitleColumnData;
      return TransactionTitleCellRenderer(principal, tx);
    },
    enableSorting: false,
  },
  {
    id: AddressTxsTableColumns.TxType,
    header: 'Type',
    accessorKey: AddressTxsTableColumns.TxType,
    cell: info => <TxTypeCellRenderer txType={info.getValue() as string} />,
    enableSorting: false,
  },
  {
    id: AddressTxsTableColumns.TxId,
    header: 'ID',
    accessorKey: AddressTxsTableColumns.TxId,
    cell: info => TxLinkCellRenderer(info.getValue() as string),
    enableSorting: false,
  },
  {
    id: AddressTxsTableColumns.From,
    header: 'From',
    accessorKey: AddressTxsTableColumns.From,
    cell: info => AddressLinkCellRenderer(info.getValue() as TxTableAddressColumnData),
    enableSorting: false,
  },
  {
    id: AddressTxsTableColumns.ArrowRight,
    header: '',
    accessorKey: AddressTxsTableColumns.ArrowRight,
    cell: info => IconCellRenderer(info.getValue() as JSX.Element),
    enableSorting: false,
    size: 45,
    minSize: 45,
    maxSize: 45,
  },
  {
    id: AddressTxsTableColumns.To,
    header: 'To',
    accessorKey: AddressTxsTableColumns.To,
    cell: info => AddressLinkCellRenderer(info.getValue() as TxTableAddressColumnData),
    enableSorting: false,
  },
  {
    id: AddressTxsTableColumns.Fee,
    header: ({ header }: { header: Header<AddressTxsTableData, unknown> }) => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        <DefaultTableColumnHeader header={header}>Fee</DefaultTableColumnHeader>
      </Flex>
    ),
    accessorKey: AddressTxsTableColumns.Fee,
    cell: info => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        {FeeCellRenderer(info.getValue() as string)}
      </Flex>
    ),
    enableSorting: false,
  },
  {
    id: AddressTxsTableColumns.BlockTime,
    header: ({ header }: { header: Header<AddressTxsTableData, unknown> }) => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        <DefaultTableColumnHeader header={header}>Timestamp</DefaultTableColumnHeader>
      </Flex>
    ),
    accessorKey: AddressTxsTableColumns.BlockTime,
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

export interface AddressTxsTableProps {
  principal: string;
  initialData?: GenericResponseType<CompressedTxAndMempoolTxTableData> | undefined;
  disablePagination?: boolean;
  columnDefinitions?: ColumnDef<AddressTxsTableData>[];
  pageSize: number;
  onTotalChange?: (total: number) => void;
}

export function AddressTxsTable({
  principal,
  initialData,
  disablePagination = false,
  columnDefinitions,
  pageSize,
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
    const queryKey = getAddressTxsQueryKey(
      principal,
      pagination.pageSize,
      pagination.pageIndex * pagination.pageSize
    );
    queryClient.setQueryData(queryKey, initialData);
    isCacheSetWithInitialData.current = true;
  }

  // fetch data
  let { data, isFetching, isLoading } = useAddressTxs(
    principal,
    pagination.pageSize,
    pagination.pageIndex * pagination.pageSize,
    {
      staleTime: THIRTY_SECONDS,
      gcTime: THIRTY_SECONDS,
    }
  );

  const { total, results: txs = [] } = data || {};

  const rowData: AddressTxsTableData[] = useMemo(
    () =>
      txs.map(tx => {
        const isConfirmed = isConfirmedTx(tx);
        const to = getToAddress(tx);
        const amount = getAmount(tx);
        const events = isConfirmed ? tx.events || [] : [];

        return {
          [AddressTxsTableColumns.Transaction]: { principal, tx },
          [AddressTxsTableColumns.TxId]: tx.tx_id,
          [AddressTxsTableColumns.TxType]: tx.tx_type,
          [AddressTxsTableColumns.From]: {
            address: tx.sender_address,
            isContract: validateStacksContractId(tx.sender_address),
          },
          [AddressTxsTableColumns.ArrowRight]: (
            <Icon color="iconTertiary">
              <ArrowRight />
            </Icon>
          ),
          [AddressTxsTableColumns.To]: {
            address: to,
            isContract: validateStacksContractId(to),
          },
          [AddressTxsTableColumns.Fee]: tx.fee_rate,
          [AddressTxsTableColumns.Amount]: amount,
          [AddressTxsTableColumns.BlockTime]: isConfirmed ? tx.block_time : undefined,
          [AddressTxsTableColumns.Events]: {
            numEvents: events.length,
            txId: tx.tx_id,
          },
        };
      }),
    [principal, txs]
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
