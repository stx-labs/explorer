'use client';

import { Box, Flex, Icon, StackProps } from '@chakra-ui/react';

import { useSuspenseBlockListInfinite } from '../../../../common/queries/useBlockListInfinite';
import BitcoinCircleIcon from '../../../../ui/icons/BitcoinCircleIcon';
import { ExplorerErrorBoundary } from '../../ErrorBoundary';
import { StatSection } from '../StatSection';

function LastBlockBase(props: StackProps) {
  const { data: blocks } = useSuspenseBlockListInfinite();
  const lastBlockHeight = blocks?.pages?.[0]?.results?.[0]?.height;
  const lastBurnBlockHeight = blocks?.pages?.[0]?.results?.[0]?.burn_block_height;
  const lastBlockTxsCount = blocks?.pages?.[0]?.results?.[0]?.tx_count ?? 0;

  return (
    <StatSection
      title="Last Block"
      bodyMainText={`#${lastBlockHeight}`}
      bodySecondaryText={
        <Flex
          alignItems={'center'}
          ml={1.5}
          lineHeight={'1em'}
          position={'relative'}
          top={0.5}
          gap={1.5}
        >
          <Icon h={4.5} w={4.5} color="accent.bitcoin-500">
            <BitcoinCircleIcon />
          </Icon>
          #{lastBurnBlockHeight}
        </Flex>
      }
      caption={
        <>
          {lastBlockTxsCount} transaction{lastBlockTxsCount !== 1 ? 's' : ''}
        </>
      }
      {...props}
    />
  );
}

export function LastBlock(props: StackProps) {
  return (
    <ExplorerErrorBoundary
      Wrapper={Box}
      wrapperProps={{ borderRightWidth: ['0px', '0px', '0px', '1px'] }}
      tryAgainButton
    >
      <LastBlockBase {...props} />
    </ExplorerErrorBoundary>
  );
}
