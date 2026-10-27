'use client';

import { TxTableFiltersProvider } from '@/common/components/table/tx-table/useTxTableFilters';
import { PENDING_TX_REFETCH_INTERVAL_MS } from '@/common/constants/env';
import { useTxById } from '@/common/queries/useTxById';
import { TxDetails } from '@/common/types/tx-v3';
import { getPendingTxRefetchInterval } from '@/common/utils/tx-details-utils';
import { Text } from '@/ui/Text';
import { Flex, Spinner } from '@chakra-ui/react';
import { Query } from '@tanstack/react-query';

import { useTxIdPageData } from './TxIdPageContext';
import { CoinbasePage as CoinbasePageRedesign } from './redesign/CoinbasePage';
import { ContractCallPage as ContractCallPageRedesign } from './redesign/ContractCallPage';
import { SmartContractPage as SmartContractPageRedesign } from './redesign/SmartContractPage';
import { TenureChangePage as TenureChangePageRedesign } from './redesign/TenureChangePage';
import { TokenTransferPage as TokenTransferPageRedesign } from './redesign/TokenTransferPage';

function TransactionIdPage() {
  const { initialTxData, filters, txId } = useTxIdPageData();
  // Seeded with the server-rendered transaction and re-read while it's pending, so the page shows
  // the confirmation without a reload. On the contract-ID route, the transaction is the deploy.
  const {
    data: clientTxData,
    isLoading,
    error,
  } = useTxById(initialTxData?.tx_id ?? txId, {
    initialData: initialTxData,
    refetchInterval: (query: Query<TxDetails>) =>
      getPendingTxRefetchInterval(
        query.state.data,
        query.state.error,
        PENDING_TX_REFETCH_INTERVAL_MS
      ),
  });
  const tx = clientTxData ?? initialTxData;

  if (!tx && isLoading) {
    return (
      <Flex align="center" justify="center" py={20}>
        <Spinner size="lg" />
      </Flex>
    );
  }

  // A failed re-read keeps showing the last known transaction.
  if (!tx && error) {
    return (
      <Flex align="center" justify="center" py={20} direction="column" gap={4}>
        <Text color="error">Failed to load transaction</Text>
        <Text fontSize="sm" color="textSubdued">
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </Flex>
    );
  }

  let txPage = null;

  if (tx?.type === 'smart_contract') txPage = <SmartContractPageRedesign tx={tx} />;

  if (tx?.type === 'token_transfer') txPage = <TokenTransferPageRedesign tx={tx} />;

  if (tx?.type === 'tenure_change') txPage = <TenureChangePageRedesign tx={tx} />;

  if (tx?.type === 'coinbase') txPage = <CoinbasePageRedesign tx={tx} />;

  if (tx?.type === 'contract_call') txPage = <ContractCallPageRedesign tx={tx} />;

  if (tx && !txPage) {
    return (
      <Flex align="center" justify="center" py={20} direction="column" gap={4}>
        <Text color="error">Transaction not found</Text>
      </Flex>
    );
  }

  return (
    <TxTableFiltersProvider
      defaultTransactionType={filters.transactionType}
      defaultFromAddress={filters.fromAddress}
      defaultToAddress={filters.toAddress}
      defaultStartTime={filters.startTime}
      defaultEndTime={filters.endTime}
    >
      {txPage}
    </TxTableFiltersProvider>
  );
}

export default TransactionIdPage;
