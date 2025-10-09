import { TabsContentContainer } from '@/app/txid/[txId]/redesign/TxTabs';
import { SummaryItem } from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { AddressTxsTable } from '@/common/components/table/table-examples/AddressTxsTable';
import { DEFAULT_RECENT_ADDRESS_TXS_LIMIT } from '@/common/components/table/table-examples/consts';
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
  const { tokenId, tokenData } = useTokenIdPageData();

  const tokenName = tokenData?.basic?.name || '';
  const tokenSymbol = tokenData?.basic?.symbol || '';

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

export function MarketDataCard() {
  const { redesignTokenData } = useTokenIdPageData();

  const circulatingSupply = redesignTokenData?.circulatingSupply;
  const totalSupply = redesignTokenData?.totalSupply;
  const totalHolders = 'dont know yet'; //redesignTokenData?.totalHolders;
  const price = redesignTokenData?.currentPrice;
  const marketCap = redesignTokenData?.marketCap;
  const volume = redesignTokenData?.tradingVolume24h;

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
