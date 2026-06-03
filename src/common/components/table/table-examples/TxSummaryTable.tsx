'use client';

import { useSubscribeTxs } from '@/app/_components/BlockList/Sockets/useSubscribeTxs';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import {
  confirmedTxSummariesQueryKey,
  useConfirmedTxSummaries,
} from '@/common/queries/useConfirmedTxSummaries';
import { TransactionSummary, TransactionSummaryListResponse } from '@/common/types/tx-v3';
import { validateStacksContractId } from '@/common/utils/utils';
import { getV3ToAddress } from '@/features/txs-list/utils';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { type JSX, useEffect, useMemo, useRef, useState } from 'react';

import { ScrollIndicator } from '../../ScrollIndicator';
import { Table } from '../Table';
import { UpdateTableBannerRow } from '../UpdateTableBannerRow';
import { TxTableAddressColumnData } from './TxsTable';
import { TxTableColumns } from './types';

export interface TxSummaryTableData {
  [TxTableColumns.Transaction]: TransactionSummary;
  [TxTableColumns.TxId]: string;
  [TxTableColumns.TxType]: TransactionSummary['type'];
  [TxTableColumns.From]: TxTableAddressColumnData;
  [TxTableColumns.To]: TxTableAddressColumnData;
  [TxTableColumns.BlockTime]: number;
}

export interface TxSummaryTableProps {
  initialData: TransactionSummaryListResponse | undefined;
  pageSize: number;
  columnDefinitions: ColumnDef<TxSummaryTableData>[];
  tableContainer?: (table: JSX.Element) => JSX.Element;
}

export function TxSummaryTable({
  initialData,
  pageSize,
  columnDefinitions,
  tableContainer,
}: TxSummaryTableProps) {
  const queryClient = useQueryClient();
  const { activeNetwork } = useGlobalContext();
  const isCacheSetWithInitialData = useRef(false);

  // react-query's initialData prop misbehaves across hydration, so seed the cache explicitly
  if (!isCacheSetWithInitialData.current && initialData) {
    queryClient.setQueryData(
      confirmedTxSummariesQueryKey(activeNetwork.networkId, pageSize),
      initialData
    );
    isCacheSetWithInitialData.current = true;
  }

  const { data, refetch, isFetching, isLoading } = useConfirmedTxSummaries(pageSize, {
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
  });

  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [newTxsAvailable, setNewTxsAvailable] = useState(false);

  useSubscribeTxs(isSubscriptionActive, () => {
    // Wait 5 seconds to let the API catch up to the websocket before offering a refresh.
    setTimeout(() => setNewTxsAvailable(true), 5000);
    setIsSubscriptionActive(false);
  });
  useEffect(() => {
    if (!newTxsAvailable) setIsSubscriptionActive(true);
  }, [newTxsAvailable]);

  const rowData: TxSummaryTableData[] = useMemo(
    () =>
      (data?.results ?? []).map(tx => {
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
          [TxTableColumns.BlockTime]: tx.block.time,
        };
      }),
    [data?.results]
  );

  return (
    <Table
      data={rowData}
      columns={columnDefinitions}
      tableContainerWrapper={tableContainer ? table => tableContainer(table) : undefined}
      scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
      bannerRow={
        newTxsAvailable ? (
          <UpdateTableBannerRow
            onClick={() => {
              setNewTxsAvailable(false);
              refetch();
            }}
            colSpan={columnDefinitions.length}
            message="New transactions have come in. Update list"
          />
        ) : null
      }
      isLoading={isLoading}
      isFetching={isFetching}
    />
  );
}
