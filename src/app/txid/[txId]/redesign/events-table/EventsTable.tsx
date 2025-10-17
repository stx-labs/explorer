'use client';

import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { AddressLinkCellRenderer } from '@/common/components/table/CommonTableCellRenderers';
import { Table } from '@/common/components/table/Table';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { getTxEventsByIdQueryKey, useTxEventsById } from '@/common/queries/useTxEventsById';
import { validateStacksContractId } from '@/common/utils/utils';
import { Icon } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TransactionEvent } from '@stacks/stacks-blockchain-api-types';

import {
  AmountCellRenderer,
  AssetEventTypeCellRenderer,
  IndexCellRenderer,
} from './EventsTableCellRenderers';
import { EVENTS_TABLE_PAGE_SIZE } from './consts';
import { EventsTableFilters } from './filters/useEventsTableFilters';
import {
  ExtendedTransactionEventAssetType,
  getAmount,
  getAsset,
  getAssetEventType,
  getAssetType,
  getFromAddress,
  getToAddress,
} from './utils';

export interface EventsTableAddressColumnData {
  // TODO: shared with TxTable TxTableAddressColumnData
  address: string;
  isContract: boolean;
}

export enum EventsTableColumns {
  Index = 'index',
  AssetEventType = 'asset-event-type',
  Asset = 'asset',
  AssetType = 'asset-type',
  Amount = 'amount',
  From = 'from',
  ArrowRight = 'arrow-right',
  To = 'to',
}

export interface EventsTableData {
  [EventsTableColumns.Index]: number;
  [EventsTableColumns.AssetEventType]: ExtendedTransactionEventAssetType;
  [EventsTableColumns.Asset]: string;
  [EventsTableColumns.AssetType]: string;
  [EventsTableColumns.Amount]: EventsTableAmountData;
  [EventsTableColumns.From]: EventsTableAddressColumnData;
  [EventsTableColumns.ArrowRight]: JSX.Element;
  [EventsTableColumns.To]: EventsTableAddressColumnData;
}

export interface TxTableAddressColumnData {
  address: string;
  isContract: boolean;
}

export interface EventsTableAmountData {
  amount: string | undefined;
  event: TransactionEvent;
}

export const defaultColumnDefinitions: ColumnDef<EventsTableData>[] = [
  {
    id: EventsTableColumns.Index,
    header: '#',
    accessorKey: EventsTableColumns.Index,
    cell: info => <IndexCellRenderer index={info.row.original[EventsTableColumns.Index]} />,
    enableSorting: false,
  },
  {
    id: EventsTableColumns.AssetEventType,
    header: 'Event',
    accessorKey: EventsTableColumns.AssetEventType,
    cell: info => (
      <AssetEventTypeCellRenderer
        assetEventType={info.row.original[EventsTableColumns.AssetEventType]}
      />
    ),
    enableSorting: false,
  },
  {
    id: EventsTableColumns.Asset,
    header: 'Asset',
    accessorKey: EventsTableColumns.Asset,
    cell: info => info.row.original[EventsTableColumns.Asset],
    enableSorting: false,
  },
  {
    id: EventsTableColumns.AssetType,
    header: 'Asset Type',
    accessorKey: EventsTableColumns.AssetType,
    cell: info => info.row.original[EventsTableColumns.AssetType],
    enableSorting: false,
  },
  {
    id: EventsTableColumns.Amount,
    header: 'Amount',
    accessorKey: EventsTableColumns.Amount,
    cell: info => AmountCellRenderer(info.row.original[EventsTableColumns.Amount]),
    enableSorting: false,
  },
  {
    id: EventsTableColumns.From,
    header: 'From',
    accessorKey: EventsTableColumns.From,
    cell: info => AddressLinkCellRenderer(info.row.original[EventsTableColumns.From]),
    enableSorting: false,
  },
  {
    id: EventsTableColumns.ArrowRight,
    header: '',
    accessorKey: EventsTableColumns.ArrowRight,
    cell: info => info.row.original[EventsTableColumns.ArrowRight],
    enableSorting: false,
  },
  {
    id: EventsTableColumns.To,
    header: 'To',
    accessorKey: EventsTableColumns.To,
    cell: info => AddressLinkCellRenderer(info.row.original[EventsTableColumns.To]),
    enableSorting: false,
  },
];

export interface EventsTableProps {
  txId: string;
  initialData: GenericResponseType<EventsTableData> | undefined;
  disablePagination?: boolean;
  columnDefinitions?: ColumnDef<EventsTableData>[];
  pageSize?: number;
  filters?: EventsTableFilters;
}

const DEFAULT_FILTERS: EventsTableFilters = {
  address: '',
  eventAssetTypes: [],
};

export function EventsTable({
  txId,
  filters = DEFAULT_FILTERS,
  initialData,
  disablePagination = false,
  columnDefinitions,
  pageSize = EVENTS_TABLE_PAGE_SIZE,
}: EventsTableProps) {
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
    const queryKey = getTxEventsByIdQueryKey(
      pagination.pageSize,
      pagination.pageIndex * pagination.pageSize,
      txId,
      { address: filters.address, type: filters.eventAssetTypes } // TODO: currently we are only listening to the from address even though users can set a to address
    );
    queryClient.setQueryData(queryKey, initialData);
    isCacheSetWithInitialData.current = true;
  }

  // fetch data
  let { data, isFetching, isLoading } = useTxEventsById(
    pagination.pageSize,
    pagination.pageIndex * pagination.pageSize,
    txId,
    { address: filters.address, type: filters.eventAssetTypes }, // TODO: currently we are only listening to the from address even though users can set a to address
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

  const { total, results: events = [] } = data || {};
  const isTableFiltered = Object.values(filters).some(v => v != null && v !== '');

  const rowData: EventsTableData[] = useMemo(
    () =>
      events.map((event, index) => {
        const to = getToAddress(event);
        const from = getFromAddress(event);
        const amount = getAmount(event);
        const assetEventType = getAssetEventType(event);
        const asset = getAsset(event);
        const assetType = getAssetType(event);

        return {
          [EventsTableColumns.Index]: index + 1,
          [EventsTableColumns.AssetEventType]: assetEventType,
          [EventsTableColumns.Asset]: asset,
          [EventsTableColumns.AssetType]: assetType,
          [EventsTableColumns.Amount]: {
            event,
            amount,
          },
          [EventsTableColumns.From]: {
            address: from,
            isContract: validateStacksContractId(from),
          },
          [EventsTableColumns.ArrowRight]: (
            <Icon color="iconTertiary">
              <ArrowRight />
            </Icon>
          ),
          [EventsTableColumns.To]: {
            address: to,
            isContract: validateStacksContractId(to),
          },
        };
      }),
    [events]
  );

  return (
    <Table
      data={rowData}
      columns={columnDefinitions ?? defaultColumnDefinitions}
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
      isFiltered={isTableFiltered}
    />
  );
}
