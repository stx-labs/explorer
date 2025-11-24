'use client';

import { isSBTC } from '@/app/tokens/utils';
import { TabsContentContainer } from '@/app/txid/[txId]/redesign/TxTabs';
import {
  DEFAULT_BUTTON_STYLING,
  DEFAULT_ICON_STYLING,
  SummaryItem,
} from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { CopyButtonRedesign } from '@/common/components/CopyButton';
import { AddressLink, TokenLink, TxLink } from '@/common/components/ExplorerLinks';
import { StackingCardItem } from '@/common/components/id-pages/Overview';
import { EllipsisText } from '@/common/components/table/CommonTableCellRenderers';
import { AddressTxsTable } from '@/common/components/table/table-examples/AddressTxsTable';
import { DEFAULT_OVERVIEW_TAB_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { formatNumber, formatUsdValue } from '@/common/utils/string-utils';
import { formatTimestamp } from '@/common/utils/time-utils';
import {
  getAssetNameParts,
  getContractName,
  getFtDecimalAdjustedBalance,
} from '@/common/utils/utils';
import { Badge, SimpleTag } from '@/ui/Badge';
import { Text } from '@/ui/Text';
import ClarityIcon from '@/ui/icons/ClarityIcon';
import { Flex, Grid, Icon, Stack, Table } from '@chakra-ui/react';

import { sbtcContractAddress, sbtcDepositAddress, sbtcWidthdrawlContractAddress } from '../consts';
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
          valueRenderer={value => (
            <SimpleTag
              label={value}
              _groupHover={{
                bg: 'surfaceTertiary',
              }}
            />
          )}
          showCopyButton
        />
        <SummaryItem
          label="Contract"
          value={tokenId}
          valueRenderer={value => (
            <TokenLink tokenId={value} variant="tableLink">
              <Text textStyle="text-regular-sm" wordBreak="break-all">
                {value}
              </Text>
            </TokenLink>
          )}
          showCopyButton
        />
        {txId && (
          <SummaryItem
            label="Contract deploy transaction"
            value={txId}
            valueRenderer={value => (
              <TxLink txId={value} variant="tableLink">
                <Text textStyle="text-regular-sm" wordBreak="break-all">
                  {value}
                </Text>
              </TxLink>
            )}
            showCopyButton
          />
        )}
        {txBlockTime && (
          <SummaryItem
            label="Created on"
            value={tokenTxTimestamp}
            valueRenderer={value => (
              <SimpleTag
                label={value}
                _groupHover={{
                  bg: 'surfaceTertiary',
                }}
              />
            )}
            showCopyButton
          />
        )}
      </Table.Body>
    </Table.Root>
  );
};

const NO_DATA = (
  <Text textStyle="text-regular-sm" fontStyle="italic" color="textSecondary">
    No data available
  </Text>
);

export function MarketDataCard() {
  const { tokenData, holders, tokenId } = useTokenIdPageData();

  const circulatingSupply =
    holders?.total_supply && tokenData?.decimals !== undefined
      ? formatNumber(
          getFtDecimalAdjustedBalance(holders?.total_supply, tokenData?.decimals),
          0,
          tokenData?.decimals
        )
      : undefined;
  const totalSupply =
    tokenData?.totalSupply && tokenData?.decimals !== undefined
      ? formatNumber(
          getFtDecimalAdjustedBalance(tokenData?.totalSupply, tokenData?.decimals),
          0,
          tokenData?.decimals
        )
      : undefined;
  const totalHolders = holders?.total ? formatNumber(holders.total) : undefined;
  const price = tokenData?.currentPrice ? formatUsdValue(tokenData.currentPrice) : undefined;
  const marketCap = tokenData?.marketCap ? formatUsdValue(tokenData?.marketCap) : undefined;
  const volume = tokenData?.tradingVolume24h
    ? formatUsdValue(tokenData?.tradingVolume24h)
    : undefined;

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
      <StackingCardItem
        label="Circulating supply"
        value={circulatingSupply ?? NO_DATA}
        copyValue={circulatingSupply}
      />
      <StackingCardItem
        label="Total supply"
        value={totalSupply ?? NO_DATA}
        copyValue={totalSupply}
      />
      <StackingCardItem
        label="Total holders"
        value={totalHolders ?? NO_DATA}
        copyValue={totalHolders}
      />
      <StackingCardItem label="Price" value={price ?? NO_DATA} copyValue={price} />
      <StackingCardItem label="Market cap" value={marketCap ?? NO_DATA} copyValue={marketCap} />
      <StackingCardItem label="Volume" value={volume ?? NO_DATA} copyValue={volume} />
    </Stack>
  );
}

function ContractBadge({ address }: { address: string }) {
  return (
    <Flex>
      <Badge
        variant="solid"
        content="label"
        _groupHover={{
          bg: 'surfaceTertiary',
        }}
      >
        <Flex gap={1} alignItems="center">
          <Icon h={3} w={3} color="iconPrimary">
            <ClarityIcon />
          </Icon>
          <AddressLink principal={address} variant="tableLink">
            <EllipsisText
              textStyle="text-regular-xs"
              color="textPrimary"
              _hover={{
                color: 'textInteractiveHover',
              }}
              fontFamily="var(--font-matter-mono)"
            >
              {getContractName(address)}
            </EllipsisText>
          </AddressLink>
        </Flex>
      </Badge>
      <CopyButtonRedesign
        initialValue={address}
        aria-label={address}
        iconProps={{
          ...DEFAULT_ICON_STYLING,
          height: 3.5,
          width: 3.5,
        }}
        buttonProps={{
          ...DEFAULT_BUTTON_STYLING,
          p: 1.5,
        }}
      />
    </Flex>
  );
}

function SbtcProtocolContractCard() {
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
        Protocol contracts
      </Text>
      <ContractBadge address={sbtcDepositAddress} />
      <ContractBadge address={sbtcContractAddress} />
      <ContractBadge address={sbtcWidthdrawlContractAddress} />
    </Stack>
  );
}

function MobileTokenIdOverview() {
  const { initialAddressRecentTransactionsData, tokenId } = useTokenIdPageData();

  return (
    <Stack gap={8} hideFrom="lg" className="mobile-token-id-overview">
      <TabsContentContainer h="fit-content">
        <TokenIdOverviewTable />
      </TabsContentContainer>
      <MarketDataCard />
      <Stack
        gap={3}
        gridColumn={{ base: '1', lg: '1' }}
        gridRow={{ base: '3', lg: '2' }}
        order={{ base: 3, lg: 3 }}
      >
        <Text textStyle="heading-xs" color="textPrimary">
          Recent transactions
        </Text>
        <AddressTxsTable
          principal={tokenId}
          initialData={initialAddressRecentTransactionsData}
          pageSize={DEFAULT_OVERVIEW_TAB_TABLE_PAGE_SIZE}
          disablePagination
        />
      </Stack>
    </Stack>
  );
}

function DesktopTokenIdOverview() {
  const { initialAddressRecentTransactionsData, tokenId } = useTokenIdPageData();
  const { address, contract } = getAssetNameParts(tokenId || '');
  const contractId = `${address}.${contract}`;
  const isSbtc = isSBTC(contractId);

  return (
    <Grid
      templateColumns={'75% 25%'}
      templateRows={'auto auto'}
      columnGap={2.5}
      alignItems="start"
      hideBelow="lg"
      className="desktop-token-id-overview"
    >
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
            pageSize={DEFAULT_OVERVIEW_TAB_TABLE_PAGE_SIZE}
            disablePagination
          />
        </Stack>
      </Stack>

      {isSbtc ? <SbtcProtocolContractCard /> : <MarketDataCard />}
    </Grid>
  );
}

export const TokenIdOverview = () => {
  return (
    <>
      <MobileTokenIdOverview />
      <DesktopTokenIdOverview />
    </>
  );
};
