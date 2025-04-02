'use client';

import { MempoolTableWithFilters } from '@/common/components/table/mempool-table/MempoolTableWithFilters';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';

import { CompressedMempoolTxTableData } from '../transactions/utils';

interface MempoolTransactionsTableProps {
  initialMempoolTxData?: GenericResponseType<CompressedMempoolTxTableData>;
  searchParams?: Record<string, string>;
}

export default function MempoolTransactionsTable({
  initialMempoolTxData,
  searchParams,
}: MempoolTransactionsTableProps) {
  return (
    <Stack gap={5} mt={{ base: 0, '2xl': 12 }}>
      <Text textStyle="heading-md" color="textPrimary">
        Pending transactions
      </Text>
      <Stack gap={5}>
        <MempoolTableWithFilters initialData={initialMempoolTxData} searchParams={searchParams} />
      </Stack>
    </Stack>
  );
}
