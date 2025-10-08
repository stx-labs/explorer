'use client';

import { TxTableFilters } from '@/common/components/table/filters/TxTableFilters';
import { MempoolTable } from '@/common/components/table/table-examples/MempoolTable';
import {
  TxTableFiltersProvider,
  useTxTableFilters,
} from '@/common/components/table/tx-table/useTxTableFilters';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { CompressedMempoolTxTableData } from '@/common/utils/transaction-utils';
import { Stack } from '@chakra-ui/react';

interface MempoolTableWithFiltersContentProps {
  initialData?: GenericResponseType<CompressedMempoolTxTableData>;
}

function MempoolTableWithFiltersContent({ initialData }: MempoolTableWithFiltersContentProps) {
  const { fromAddress, toAddress, transactionType } = useTxTableFilters();

  return (
    <Stack gap={4}>
      <TxTableFilters showDateFilter={false} showTypeFilter={false} />
      <MempoolTable
        filters={{
          fromAddress,
          toAddress,
          transactionType,
        }}
        initialData={initialData}
        disablePagination={false}
      />
    </Stack>
  );
}

export function MempoolTableWithFilters({
  initialData,
  searchParams,
}: {
  initialData?: GenericResponseType<CompressedMempoolTxTableData>;
  searchParams?: Record<string, string>;
}) {
  const defaultFromAddress = searchParams?.fromAddress || '';
  const defaultToAddress = searchParams?.toAddress || '';
  const defaultStartTime = searchParams?.startTime || '';
  const defaultEndTime = searchParams?.endTime || '';

  return (
    <TxTableFiltersProvider
      defaultFromAddress={defaultFromAddress}
      defaultToAddress={defaultToAddress}
      defaultStartTime={defaultStartTime}
      defaultEndTime={defaultEndTime}
    >
      <MempoolTableWithFiltersContent initialData={initialData} />
    </TxTableFiltersProvider>
  );
}
