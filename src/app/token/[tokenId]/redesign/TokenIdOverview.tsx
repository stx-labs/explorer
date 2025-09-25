import { TabsContentContainer } from '@/app/txid/[txId]/redesign/TxTabs';
import { SummaryItem } from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { TokenLink, TxLink } from '@/common/components/ExplorerLinks';
import { StackingCardItem } from '@/common/components/id-pages/Overview';
import { AddressTxsTable } from '@/common/components/table/table-examples/AddressTxsTable';
import { DEFAULT_RECENT_ADDRESS_TXS_LIMIT } from '@/common/components/table/table-examples/consts';
import { formatNumber, formatUsdValue } from '@/common/utils/string-utils';
import { formatTimestamp } from '@/common/utils/time-utils';
import { getFtDecimalAdjustedBalance } from '@/common/utils/utils';
import { SimpleTag } from '@/ui/Badge';
import { Text } from '@/ui/Text';
import { Grid, Stack, Table } from '@chakra-ui/react';

import { useTokenIdPageData } from './context/TokenIdPageContext';

export const TokenIdOverviewTable = () => {
  const { tokenId, tokenData, txBlockTime, txId } = useTokenIdPageData();

  const tokenName = tokenData?.name || '';
  const tokenSymbol = tokenData?.symbol || '';
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
              <Text textStyle="text-regular-sm">{value}</Text>
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

const NO_DATA = (
  <Text textStyle="text-regular-sm" fontStyle="italic">
    No data available
  </Text>
);

export function MarketDataCard() {
  const { tokenData, holders } = useTokenIdPageData();

  const circulatingSupply =
    holders?.total_supply && tokenData?.decimals !== undefined
      ? formatNumber(
          getFtDecimalAdjustedBalance(holders?.total_supply, tokenData?.decimals),
          0,
          tokenData?.decimals
        )
      : NO_DATA;
  const totalSupply =
    tokenData?.totalSupply && tokenData?.decimals !== undefined
      ? formatNumber(
          getFtDecimalAdjustedBalance(tokenData?.totalSupply, tokenData?.decimals),
          0,
          tokenData?.decimals
        )
      : NO_DATA;
  const totalHolders = holders?.total ? formatNumber(holders.total) : NO_DATA;
  const price = tokenData?.currentPrice ? formatUsdValue(tokenData.currentPrice) : NO_DATA;
  const marketCap = tokenData?.marketCap ? formatUsdValue(tokenData?.marketCap) : NO_DATA;
  const volume = tokenData?.tradingVolume24h
    ? formatUsdValue(tokenData?.tradingVolume24h)
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
    <Grid
      templateColumns={{ base: '1fr', lg: '75% 25%' }}
      templateRows={{ base: 'auto auto', lg: 'auto' }}
      gap={2}
    >
      <Stack
        gap={8}
        gridColumn={{ base: '1', lg: '1' }}
        gridRow={{ base: '2', lg: '1' }}
        order={{ base: 2, lg: 1 }}
      >
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
      <Stack
        gap={2}
        gridColumn={{ base: '1', lg: '2' }}
        gridRow={{ base: '1', lg: '1' }}
        order={{ base: 1, lg: 2 }}
      >
        <MarketDataCard />
      </Stack>
    </Grid>
  );
};
