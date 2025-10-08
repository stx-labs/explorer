'use client';

import { useSubscribeTxs } from '@/app/_components/BlockList/Sockets/useSubscribeTxs';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import {
  getMempoolTransactionsQueryKey,
  useMempoolTransactions,
} from '@/common/queries/useMempoolTransactionsInfinite';
import { formatTimestamp, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { CompressedMempoolTxTableData } from '@/common/utils/transaction-utils';
import { getAmount, getToAddress } from '@/common/utils/transaction-utils';
import { validateStacksContractId } from '@/common/utils/utils';
import { Flex } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef, Header, PaginationState } from '@tanstack/react-table';
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { AddressLinkCellRenderer } from '../CommonTableCellRenderers';
import { Table } from '../Table';
import { DefaultTableColumnHeader } from '../TableComponents';
import { TableContainer } from '../TableContainer';
import { UpdateTableBannerRow } from '../UpdateTableBannerRow';
import { TxTableFilters } from '../tx-table/useTxTableFilters';
import {
  FeeCellRenderer,
  IconCellRenderer,
  TimeStampCellRenderer,
  TransactionTitleCellRenderer,
  TxLinkCellRenderer,
  TxTypeCellRenderer,
} from './TxTableCellRenderers';
import { TxTableAddressColumnData } from './TxsTable';
import { TxTableColumns } from './types';

export interface MempoolTableData {
  [TxTableColumns.Transaction]: Transaction | MempoolTransaction;
  [TxTableColumns.TxId]: string;
  [TxTableColumns.TxType]: MempoolTransaction['tx_type'];
  [TxTableColumns.From]: TxTableAddressColumnData;
  [TxTableColumns.ArrowRight]: JSX.Element;
  [TxTableColumns.To]: TxTableAddressColumnData;
  [TxTableColumns.Fee]: string;
  [TxTableColumns.Amount]: number;
  [TxTableColumns.BlockTime]: number;
}

const defaultColumnDefinitions: ColumnDef<MempoolTableData>[] = [
  {
    id: TxTableColumns.Transaction,
    header: 'Transaction',
    accessorKey: TxTableColumns.Transaction,
    cell: info => TransactionTitleCellRenderer(info.getValue() as Transaction | MempoolTransaction),
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
    id: TxTableColumns.TxId,
    header: 'ID',
    accessorKey: TxTableColumns.TxId,
    cell: info => TxLinkCellRenderer(info.getValue() as string),
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
    header: ({ header }: { header: Header<MempoolTableData, unknown> }) => (
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
    enableSorting: true,
  },
  {
    id: TxTableColumns.BlockTime,
    header: ({ header }: { header: Header<MempoolTableData, unknown> }) => (
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

const TX_TABLE_PAGE_SIZE = 20;

export function MempoolTable({
  columnDefinitions,
  disablePagination = false,
  sort = 'age',
  order = 'desc',
  filters,
  initialData,
}: {
  columnDefinitions?: ColumnDef<MempoolTableData>[];
  disablePagination?: boolean;
  sort?: 'age' | 'size' | 'fee';
  order?: 'asc' | 'desc';
  filters?: Partial<TxTableFilters>;
  initialData?: GenericResponseType<CompressedMempoolTxTableData>;
}) {
  const queryClient = useQueryClient();
  const isCacheSetWithInitialData = useRef(false);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: TX_TABLE_PAGE_SIZE,
  });

  const { fromAddress, toAddress } = filters || {};

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [fromAddress, toAddress]);

  if (isCacheSetWithInitialData.current === false && initialData) {
    const queryKey = getMempoolTransactionsQueryKey(
      pagination.pageSize,
      pagination.pageIndex * pagination.pageSize,
      sort,
      order,
      { fromAddress, toAddress }
    );
    queryClient.setQueryData(queryKey, initialData);
    isCacheSetWithInitialData.current = true;
  }

  const { data, refetch, isFetching, isLoading } = useMempoolTransactions(
    pagination.pageSize,
    pagination.pageIndex * pagination.pageSize,
    { fromAddress, toAddress },
    sort,
    order,
    {
      staleTime: THIRTY_SECONDS,
      gcTime: THIRTY_SECONDS,
    }
  );

  const handlePageChange = useCallback((page: PaginationState) => {
    setPagination(prev => ({
      ...prev,
      pageIndex: page.pageIndex,
    }));
    window?.scrollTo(0, 0); // Smooth scroll to top
  }, []);

  const isTableFiltered =
    (filters?.fromAddress && filters.fromAddress !== '') ||
    (filters?.toAddress && filters.toAddress !== '');

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

  const { total, results: txs = [] } = data || {};

  const rowData: MempoolTableData[] = useMemo(() => {
    return txs.map(tx => {
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
        [TxTableColumns.ArrowRight]: <ArrowRight />,
        [TxTableColumns.To]: {
          address: to,
          isContract: validateStacksContractId(to),
        },
        [TxTableColumns.Fee]: tx.fee_rate,
        [TxTableColumns.Amount]: amount,
        [TxTableColumns.BlockTime]: tx.receipt_time,
      };
    });
  }, [txs]);

  return (
    <Table
      data={rowData}
      columns={columnDefinitions ?? defaultColumnDefinitions}
      tableContainerWrapper={table => <TableContainer minH="500px">{table}</TableContainer>}
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
        newTxsAvailable && pagination.pageIndex === 0 && !isTableFiltered ? (
          <UpdateTableBannerRow
            onClick={() => {
              setNewTxsAvailable(false);
              refetch();
              queryClient.invalidateQueries({
                queryKey: ['mempoolTransactionStats'],
              });
              queryClient.invalidateQueries({
                queryKey: ['feeEstimates'],
              });
            }}
            colSpan={Object.keys(TxTableColumns).length}
            message="New transactions have come in. Update list"
          />
        ) : null
      }
      isLoading={isLoading}
      isFetching={isFetching}
    />
  );
}
