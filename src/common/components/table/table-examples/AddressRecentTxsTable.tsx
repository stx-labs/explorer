'use client';

import { ExplorerErrorBoundary } from '@/app/_components/ErrorBoundary';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import {
  AddressLinkCellRenderer,
  FeeCellRenderer,
} from '@/common/components/table/CommonTableCellRenderers';
import { DefaultTableColumnHeader } from '@/common/components/table/TableComponents';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { usePrincipalTxSummaries } from '@/common/queries/usePrincipalTxSummaries';
import { PrincipalTransactionSummaryListResponse, TransactionSummary } from '@/common/types/tx-v3';
import { formatTimestampLocalized, formatTimestampToRelativeTime } from '@/common/utils/time-utils';
import { validateStacksContractId } from '@/common/utils/utils';
import { getV3ToAddress } from '@/features/txs-list/utils';
import { Flex } from '@chakra-ui/react';
import { ColumnDef, Header } from '@tanstack/react-table';
import { useMemo } from 'react';

import { Table } from '../Table';
import {
  EventsCellRenderer,
  TimeStampCellRenderer,
  TxLinkCellRenderer,
  TxSummaryTitleCellRenderer,
  TxTypeCellRenderer,
} from './TxTableCellRenderers';
import { TxTableAddressColumnData, defaultTableContainer } from './TxsTable';
import { TxTableColumns } from './types';

interface AddressRecentTxsTableProps {
  principal: string;
  pageSize: number;
  /** Server-fetched first page used to seed the table (avoids a cold-load skeleton). */
  initialData?: PrincipalTransactionSummaryListResponse;
}

interface AddressRecentTxTableData {
  [TxTableColumns.Transaction]: TransactionSummary;
  [TxTableColumns.TxType]: TransactionSummary['type'];
  [TxTableColumns.TxId]: string;
  [TxTableColumns.From]: TxTableAddressColumnData;
  [TxTableColumns.To]: TxTableAddressColumnData;
  [TxTableColumns.Fee]: string;
  [TxTableColumns.BlockTime]: number;
  [TxTableColumns.Events]: TransactionSummary;
}

const rightAlignedHeader =
  (label: string) =>
  ({ header }: { header: Header<AddressRecentTxTableData, unknown> }) => (
    <Flex alignItems="center" justifyContent="flex-end" w="full">
      <DefaultTableColumnHeader header={header}>{label}</DefaultTableColumnHeader>
    </Flex>
  );

const columnDefinitions: ColumnDef<AddressRecentTxTableData>[] = [
  {
    id: TxTableColumns.Transaction,
    header: 'Transaction',
    accessorKey: TxTableColumns.Transaction,
    cell: info => TxSummaryTitleCellRenderer(info.getValue() as TransactionSummary),
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
    header: rightAlignedHeader('Fee'),
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
    header: rightAlignedHeader('Timestamp'),
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
  {
    id: TxTableColumns.Events,
    header: rightAlignedHeader('Events'),
    accessorKey: TxTableColumns.Events,
    cell: info => (
      <Flex alignItems="center" justifyContent="flex-end" w="full">
        {EventsCellRenderer(info.getValue() as TransactionSummary)}
      </Flex>
    ),
    enableSorting: false,
  },
];

const mapRow = (tx: TransactionSummary): AddressRecentTxTableData => {
  const to = getV3ToAddress(tx);
  return {
    [TxTableColumns.Transaction]: tx,
    [TxTableColumns.TxType]: tx.type,
    [TxTableColumns.TxId]: tx.tx_id,
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
    [TxTableColumns.Events]: tx,
  };
};

function AddressRecentTxsTableBase({
  principal,
  pageSize,
  initialData,
}: AddressRecentTxsTableProps) {
  const { data, isLoading, isFetching } = usePrincipalTxSummaries(principal, pageSize, {
    initialData,
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
    throwOnError: true,
  });

  const rowData = useMemo(
    () => (data?.results ?? []).map(item => mapRow(item.transaction)),
    [data?.results]
  );

  return (
    <Table
      data={rowData}
      columns={columnDefinitions}
      tableContainerWrapper={defaultTableContainer}
      scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
      isLoading={isLoading}
      isFetching={isFetching}
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
