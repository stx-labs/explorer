'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { TransactionSummaryListResponse } from '@/common/types/tx-v3';
import { buildUrl } from '@/common/utils/buildUrl';
import { FilterButton } from '@/features/txsFilterAndSort/FilterButton';
import { ButtonLink } from '@/ui/ButtonLink';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';

import { ConfirmedTxsSummaryTable } from './ConfirmedTxsSummaryTable';

export default function ({
  initialData,
}: {
  initialData: TransactionSummaryListResponse | undefined;
}) {
  const network = useGlobalContext().activeNetwork;

  return (
    <Stack gap={24} fontFamily="var(--font-instrument-sans)">
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
          <Flex gap={2} flexWrap={'wrap'}>
            <FilterButton />
          </Flex>
          <ConfirmedTxsSummaryTable initialData={initialData} />
        </Stack>
      </Stack>
    </Stack>
  );
}
