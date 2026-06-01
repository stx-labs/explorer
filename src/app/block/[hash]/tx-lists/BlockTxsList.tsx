'use client';

import { Box, Flex } from '@chakra-ui/react';
import * as React from 'react';

import { ListFooter } from '../../../../common/components/ListFooter';
import { Section } from '../../../../common/components/Section';
import { SkeletonGenericTransactionList } from '../../../../common/components/loaders/skeleton-transaction';
import { useSuspenseCursorInfiniteQueryResult } from '../../../../common/hooks/useCursorInfiniteQueryResult';
import { useSuspenseBlockTxSummariesInfinite } from '../../../../common/queries/useBlockTxSummariesInfinite';
import { TransactionSummary } from '../../../../common/types/tx-v3';
import { FilteredTxSummaries } from '../../../../features/txs-list/v3/FilteredTxSummaries';
import { FilterButton } from '../../../../features/txsFilterAndSort/FilterButton';
import { ShowValueMenu } from '../../../../features/txsFilterAndSort/ShowValueMenu';
import { ExplorerErrorBoundary } from '../../../_components/ErrorBoundary';

interface BlockTxsListProps {
  blockHash: string;
  limit?: number;
}

function BlockTxsListBase({ blockHash, limit }: BlockTxsListProps) {
  const response = useSuspenseBlockTxSummariesInfinite(blockHash);
  const txs = useSuspenseCursorInfiniteQueryResult<TransactionSummary>(response, limit);

  if (response.isLoading) {
    return <SkeletonGenericTransactionList />;
  }

  return (
    <Section
      title={'Transactions'}
      topRight={
        <Flex gap={4} direction={['column', 'row']}>
          <ShowValueMenu />
          <FilterButton />
        </Flex>
      }
    >
      <Box flexGrow={1}>
        <Box position={'relative'}>
          <FilteredTxSummaries txs={txs} />
          <ListFooter
            isLoading={response.isFetchingNextPage}
            hasNextPage={response.hasNextPage}
            fetchNextPage={limit ? undefined : response.fetchNextPage}
            label={'transactions'}
          />
        </Box>
      </Box>
    </Section>
  );
}

export function BlockTxsList(props: BlockTxsListProps) {
  return (
    <ExplorerErrorBoundary
      Wrapper={Section}
      wrapperProps={{ title: 'Transactions' }}
      tryAgainButton
    >
      <BlockTxsListBase {...props} />
    </ExplorerErrorBoundary>
  );
}
