import { TabsContentContainer } from '@/app/txid/[txId]/redesign/TxTabs';
import { SummaryItem } from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { TokenLink, TxLink } from '@/common/components/ExplorerLinks';
import { AddressTxsTable } from '@/common/components/table/table-examples/AddressTxsTable';
import { DEFAULT_RECENT_ADDRESS_TXS_LIMIT } from '@/common/components/table/table-examples/consts';
import { formatTimestamp } from '@/common/utils/time-utils';
import { SimpleTag } from '@/ui/Badge';
import { Text } from '@/ui/Text';
import { Grid, Stack, Table } from '@chakra-ui/react';
import { ReactNode } from 'react';

import { useTokenIdPageData } from './context/TokenIdPageContext';

const MissingData = () => {
  return (
    <Text fontStyle="italic" textStyle="text-regular-sm">
      No data available
    </Text>
  );
};

export const TokenIdOverviewTable = () => {
  const { tokenId, redesignTokenData, txBlockTime, txId } = useTokenIdPageData();

  const tokenName = redesignTokenData?.name || '';
  const tokenSymbol = redesignTokenData?.symbol || '';
  const tokenTxTimestamp = txBlockTime ? formatTimestamp(txBlockTime) : '';
  return (
    <Table.Root w="full" h="fit-content">
      <Table.Body h="fit-content">
        <SummaryItem label="Token name" value={tokenName} showCopyButton />
        <SummaryItem
          label="Ticker"
          value={tokenSymbol}
          valueRenderer={value => <SimpleTag label={value} />}
          showCopyButton
        />
        <SummaryItem
          label="Contract"
          value={tokenId}
          valueRenderer={value => (
            <TokenLink tokenId={value} variant="tableLink">
              <Text textStyle="text-regular-sm">{tokenId}</Text>
            </TokenLink>
          )}
          showCopyButton
        />
        {txId && (
          <SummaryItem
            label="Contract deploy transaction"
            value={txId}
            valueRenderer={value => (
              <TxLink txId={value}>
                <Text textStyle="text-regular-sm">{value}</Text>
              </TxLink>
            )}
            showCopyButton
          />
        )}
        {txBlockTime && (
          <SummaryItem
            label="Created on"
            value={tokenTxTimestamp}
            valueRenderer={value => <SimpleTag label={value} />}
            showCopyButton
          />
        )}
      </Table.Body>
    </Table.Root>
  );
};

// TODO: should be shared
const StackingCardItem = ({ label, value }: { label: string; value: ReactNode }) => {
  return (
    <Stack gap={0.5}>
      <Text textStyle="text-medium-sm" color="textSecondary">
        {label}
      </Text>
      {value}
    </Stack>
  );
};

const NO_DATA = (
  <Text textStyle="text-regular-sm" fontStyle="italic">
    No data available
  </Text>
);

export function MarketDataCard() {
  const { redesignTokenData, holders } = useTokenIdPageData();

  const circulatingSupply =
    redesignTokenData?.circulatingSupply?.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }) || NO_DATA;
  const totalSupply =
    redesignTokenData?.totalSupply?.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }) || NO_DATA;
  const totalHolders = holders?.total
    ? holders.total.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    : NO_DATA;
  const price = redesignTokenData?.currentPrice
    ? new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(redesignTokenData?.currentPrice)
    : NO_DATA;
  const marketCap = redesignTokenData?.marketCap
    ? new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(redesignTokenData?.marketCap)
    : NO_DATA;
  const volume = redesignTokenData?.tradingVolume24h
    ? new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(redesignTokenData?.tradingVolume24h)
    : NO_DATA;

  return (
    <Stack
      px={5}
      py={5}
      gap={4}
      bg="surfaceSecondary"
      borderRadius="redesign.xl"
      border="1px solid"
      borderColor="redesignBorderSecondary"
    >
      <Text textStyle="text-medium-sm" color="textPrimary">
        Market data
      </Text>
      <StackingCardItem label="Circulating supply" value={circulatingSupply} />
      <StackingCardItem label="Total supply" value={totalSupply} />
      <StackingCardItem label="Total holders" value={totalHolders} />
      <StackingCardItem label="Price" value={price} />
      <StackingCardItem label="Market cap" value={marketCap} />
      <StackingCardItem label="Volume" value={volume} />
    </Stack>
  );
}

export const TokenIdOverview = () => {
  const { initialAddressRecentTransactionsData, tokenId } = useTokenIdPageData();

  return (
    <Grid templateColumns={{ base: '1fr', md: '75% 25%' }} gap={2}>
      <Stack gap={2} display={{ base: 'flex', md: 'none' }}>
        <MarketDataCard />
      </Stack>
      <Stack gap={8}>
        <TabsContentContainer h="fit-content">
          <TokenIdOverviewTable />
        </TabsContentContainer>
        <Stack gap={3}>
          <Text textStyle="heading-xs" color="textPrimary">
            Recent transactions
          </Text>
          <AddressTxsTable
            principal={tokenId}
            initialData={initialAddressRecentTransactionsData}
            disablePagination
            pageSize={DEFAULT_RECENT_ADDRESS_TXS_LIMIT}
          />
        </Stack>
      </Stack>
      <Stack gap={2} display={{ base: 'none', md: 'flex' }}>
        <MarketDataCard />
      </Stack>
    </Grid>
  );
};
