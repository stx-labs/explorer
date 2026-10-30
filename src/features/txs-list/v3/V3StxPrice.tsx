'use client';

import { Flex } from '@chakra-ui/react';
import { FC, useMemo } from 'react';

import { ExplorerErrorBoundary } from '../../../app/_components/ErrorBoundary';
import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { useStxPrice } from '../../../common/queries/useCurrentPrices';
import { useAppSelector } from '../../../common/state/hooks';
import { TransactionValueFilterTypes } from '../../../common/state/slices/transaction-value-filter-slice';
import { getUsdValue } from '../../../common/utils/utils';

interface V3StxPriceProps {
  value: number;
  bitcoinBlockTime: number;
}

const V3StxPriceBase: FC<V3StxPriceProps> = ({ value, bitcoinBlockTime }) => {
  const blockBurnTimeIso = useMemo(
    () => (bitcoinBlockTime ? new Date(bitcoinBlockTime * 1000).toISOString() : undefined),
    [bitcoinBlockTime]
  );
  const { data: historicalStxPrice } = useStxPrice(blockBurnTimeIso, {
    enabled: !!blockBurnTimeIso,
  });
  const { data: currentStxPrice } = useStxPrice();

  const activeTransactionValueFilter = useAppSelector(
    state => state.activeTransactionValueFilter.activeTransactionValueFilter
  );
  const currentPriceFormatted = useMemo(
    () => getUsdValue(value, currentStxPrice, true),
    [currentStxPrice, value]
  );
  const historicalPriceFormatted = useMemo(
    () => getUsdValue(value, historicalStxPrice, true),
    [historicalStxPrice, value]
  );

  const isMainnet = useGlobalContext().activeNetwork.mode === 'mainnet';
  if (!isMainnet) return null;

  return (
    <Flex
      height="24px"
      justifyContent={'center'}
      alignItems={'center'}
      borderRadius="md"
      padding="0px 8px"
      ml={'5px'}
      fontSize={'xs'}
      _focus={{ outline: 0 }}
      flexShrink={0}
      suppressHydrationWarning={true}
      bg={'stxPrice.background'}
      _hover={{ bg: 'purple.400' }}
      color={'black'}
    >
      {activeTransactionValueFilter === TransactionValueFilterTypes.CurrentValue
        ? currentPriceFormatted
        : historicalPriceFormatted}
    </Flex>
  );
};

/**
 * USD value of an STX amount, toggling between current and historical (block-time) price via the
 * global transaction value filter (the `ShowValueMenu`). Renders nothing off mainnet or on error.
 */
export const V3StxPrice: FC<V3StxPriceProps> = props => (
  <ExplorerErrorBoundary renderContent={() => null}>
    <V3StxPriceBase {...props} />
  </ExplorerErrorBoundary>
);
