'use client';

import { ExplorerErrorBoundary } from '@/app/_components/ErrorBoundary';
import {
  AddressLinkCellRenderer,
  FeeCellRenderer,
} from '@/common/components/table/CommonTableCellRenderers';
import { DefaultTableColumnHeader } from '@/common/components/table/TableComponents';
import { InfiniteTxSummaryTable } from '@/common/components/table/table-examples/InfiniteTxSummaryTable';
import {
  TimeStampCellRenderer,
  TxLinkCellRenderer,
  TxSummaryTitleCellRenderer,
  TxTypeCellRenderer,
} from '@/common/components/table/table-examples/TxTableCellRenderers';
import {
  TxTableAddressColumnData,
  defaultTableContainer,
} from '@/common/components/table/table-examples/TxsTable';
import { TX_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { TxTableColumns } from '@/common/components/table/table-examples/types';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { throwOnFirstPageError } from '@/common/hooks/useCursorInfiniteQueryResult';
import {
  confirmedTxSummariesInfiniteQueryKey,
  useConfirmedTxSummariesInfinite,
} from '@/common/queries/useConfirmedTxSummaries';
import { TransactionSummary, TransactionSummaryListResponse } from '@/common/types/tx-v3';
import { formatTimestampLocalized, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { validateStacksContractId } from '@/common/utils/utils';
import { getV3ToAddress } from '@/features/txs-list/utils';
import { Flex } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef, Header } from '@tanstack/react-table';
import { useMemo, useRef } from 'react';

interface ConfirmedTxSummaryTableData {
  [TxTableColumns.Transaction]: TransactionSummary;
  [TxTableColumns.TxId]: string;
  [TxTableColumns.TxType]: TransactionSummary['type'];
  [TxTableColumns.From]: TxTableAddressColumnData;
  [TxTableColumns.To]: TxTableAddressColumnData;
  [TxTableColumns.Fee]: string;
  [TxTableColumns.BlockTime]: number;
}

const columnDefinitions: ColumnDef<ConfirmedTxSummaryTableData>[] = [
  {
    id: TxTableColumns.Transaction,
    header: 'Transaction',
    accessorKey: TxTableColumns.Transaction,
    cell: info => TxSummaryTitleCellRenderer(info.getValue() as TransactionSummary),
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
    header: 'By',
    accessorKey: TxTableColumns.From,
    cell: info => AddressLinkCellRenderer(info.getValue() as TxTableAddressColumnData),
    enableSorting: false,
  },
  {
    id: TxTableColumns.To,
    header: 'Target',
    accessorKey: TxTableColumns.To,
    cell: info => AddressLinkCellRenderer(info.getValue() as TxTableAddressColumnData),
    enableSorting: false,
  },
  {
    id: TxTableColumns.Fee,
    header: ({ header }: { header: Header<ConfirmedTxSummaryTableData, unknown> }) => (
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
    header: ({ header }: { header: Header<ConfirmedTxSummaryTableData, unknown> }) => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        <DefaultTableColumnHeader header={header}>Timestamp</DefaultTableColumnHeader>
      </Flex>
    ),
    accessorKey: TxTableColumns.BlockTime,
    cell: info => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        {TimeStampCellRenderer(
          formatTimestampToRelativeTime(info.getValue() as number),
          formatTimestampLocalized(info.getValue() as number)
        )}
      </Flex>
    ),
    enableSorting: false,
    size: 150,
  },
];

const mapRow = (tx: TransactionSummary): ConfirmedTxSummaryTableData => {
  const to = getV3ToAddress(tx);
  return {
    [TxTableColumns.Transaction]: tx,
    [TxTableColumns.TxId]: tx.tx_id,
    [TxTableColumns.TxType]: tx.type,
    [TxTableColumns.From]: {
      address: tx.sender.address,
      isContract: validateStacksContractId(tx.sender.address),
    },
    [TxTableColumns.To]: {
      address: to,
      isContract: validateStacksContractId(to),
    },
    [TxTableColumns.Fee]: tx.fee_rate,
    [TxTableColumns.BlockTime]: tx.block.time,
  };
};

const getType = (tx: TransactionSummary) => tx.type;

interface ConfirmedTxsSummaryTableProps {
  initialData: TransactionSummaryListResponse | undefined;
}

function ConfirmedTxsSummaryTableBase({ initialData }: ConfirmedTxsSummaryTableProps) {
  const queryClient = useQueryClient();
  const { activeNetwork } = useGlobalContext();
  const isCacheSetWithInitialData = useRef(false);

  // react-query's initialData prop misbehaves across hydration, so seed the cache explicitly.
  if (!isCacheSetWithInitialData.current && initialData) {
    queryClient.setQueryData(
      confirmedTxSummariesInfiniteQueryKey(activeNetwork.networkId, TX_TABLE_PAGE_SIZE),
      { pages: [initialData], pageParams: [undefined] }
    );
    isCacheSetWithInitialData.current = true;
  }

  const response = useConfirmedTxSummariesInfinite(TX_TABLE_PAGE_SIZE, {
    throwOnError: throwOnFirstPageError,
  });
  const txs = useMemo(
    () => response.data?.pages.flatMap(page => page.results ?? []) ?? [],
    [response.data?.pages]
  );

  return (
    <InfiniteTxSummaryTable
      txs={txs}
      columns={columnDefinitions}
      mapRow={mapRow}
      getType={getType}
      isLoading={response.isLoading}
      isFetching={response.isFetching}
      isFetchingNextPage={response.isFetchingNextPage}
      isFetchNextPageError={response.isFetchNextPageError}
      hasNextPage={response.hasNextPage}
      fetchNextPage={response.fetchNextPage}
      refetch={response.refetch}
      tableContainer={defaultTableContainer}
    />
  );
}

export function ConfirmedTxsSummaryTable(props: ConfirmedTxsSummaryTableProps) {
  return (
    <ExplorerErrorBoundary tryAgainButton>
      <ConfirmedTxsSummaryTableBase {...props} />
    </ExplorerErrorBoundary>
  );
}
