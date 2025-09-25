'use client';

import { TxTableFilters } from '@/common/components/table/filters/TxTableFilters';
import { TxTableFiltersModal } from '@/common/components/table/filters/TxTableFiltersModal';
import { TxsTableWithFilters } from '@/common/components/table/tx-table/TxsTableWithFilters';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { buildUrl } from '@/common/utils/buildUrl';
import { CompressedTxTableData } from '@/common/utils/transaction-utils';
import { ButtonLink } from '@/ui/ButtonLink';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';

import {
  TxTableFiltersProvider,
  TxTableFilters as TxTableFiltersType,
} from '../../common/components/table/tx-table/useTxTableFilters';

export default function ({
  initialTxTableData,
  filters,
}: {
  initialTxTableData: GenericResponseType<CompressedTxTableData> | undefined;
  filters: TxTableFiltersType;
}) {
  const network = useGlobalContext().activeNetwork;

  return (
    <Stack gap={24} fontFamily="var(--font-instrument-sans)">
      {/* <Overview /> */}
      <Stack gap={8}>
        <Flex
          justifyContent={'space-between'}
          alignItems={{ base: 'flex-start', md: 'baseline' }}
          flexDirection={{ base: 'column', md: 'row' }}
          gap={4}
        >
          <Text textStyle="heading-md" color="textPrimary">
            Latest transactions
          </Text>
          <ButtonLink href={buildUrl('/mempool', network)} buttonLinkSize="big">
            View pending transactions in Mempool
          </ButtonLink>
        </Flex>
        <Stack gap={5}>
          <TxTableFiltersProvider
            defaultTransactionType={filters.transactionType}
            defaultFromAddress={filters.fromAddress}
            defaultToAddress={filters.toAddress}
            defaultStartTime={filters.startTime}
            defaultEndTime={filters.endTime}
          >
            <TxTableFilters />
            <TxsTableWithFilters initialData={initialTxTableData} />
            <TxTableFiltersModal />
          </TxTableFiltersProvider>
        </Stack>
      </Stack>
    </Stack>
  );
}
