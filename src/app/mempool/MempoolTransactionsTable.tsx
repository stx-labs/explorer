'use client';

import { MempoolTransactionSummaryListResponse } from '@/common/types/tx-v3';
import { FilterButton } from '@/features/txsFilterAndSort/FilterButton';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';

import { MempoolTxsSummaryTable } from './MempoolTxsSummaryTable';

interface MempoolTransactionsTableProps {
  initialMempoolTxData?: MempoolTransactionSummaryListResponse;
}

export default function MempoolTransactionsTable({
  initialMempoolTxData,
}: MempoolTransactionsTableProps) {
  return (
    <Stack gap={5} mt={{ base: 0, '2xl': 12 }}>
      <Text textStyle="heading-md" color="textPrimary">
        Pending transactions
      </Text>
      <Stack gap={5}>
        <Flex gap={2} flexWrap={'wrap'}>
          <FilterButton />
        </Flex>
        <MempoolTxsSummaryTable initialData={initialMempoolTxData} />
      </Stack>
    </Stack>
  );
}
