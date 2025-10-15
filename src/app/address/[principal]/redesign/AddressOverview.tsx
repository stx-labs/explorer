import { sbtcContractAddress } from '@/app/token/[tokenId]/consts';
import { TabsContentContainer } from '@/app/txid/[txId]/redesign/TxTabs';
import {
  PriceSummaryItemValue,
  RowCopyButton,
  SummaryItem,
} from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { Circle } from '@/common/components/Circle';
import { AddressTxsTable } from '@/common/components/table/table-examples/AddressTxsTable';
import { ADDRESS_ID_PAGE_RECENT_ADDRESS_TXS_LIMIT } from '@/common/components/table/table-examples/consts';
import { microToStacks } from '@/common/utils/utils';
import { SimpleTag } from '@/ui/Badge';
import { NextLink } from '@/ui/NextLink';
import { Text } from '@/ui/Text';
import BitcoinIcon from '@/ui/icons/BitcoinIcon';
import StacksIconThin from '@/ui/icons/StacksIconThin';
import SBTCIcon from '@/ui/icons/sBTCIcon';
import { Flex, Grid, Icon, IconProps, Stack, Table } from '@chakra-ui/react';
import { ReactNode } from 'react';

import { useAddressIdPageData } from '../AddressIdPageContext';

type TokenBalanceType = 'stx' | 'sbtc';

export const AddressOverviewTable = () => {
  const {
    principal,
    initialAddressBalancesData,
    stxPrice,
    initialAddressLatestNonceData,
    initialAddressBNSNamesData,
  } = useAddressIdPageData();
  const totalFees = initialAddressBalancesData?.stx.total_fees_sent || 0;
  const bnsNames = initialAddressBNSNamesData?.names;

  return (
    <Table.Root w="full" h="fit-content">
      <Table.Body h="fit-content">
        <SummaryItem label="Address ID" value={principal} showCopyButton />
        {bnsNames && bnsNames.length > 0 && (
          <SummaryItem
            label="Associated BNS Name"
            value={bnsNames[0]}
            valueRenderer={value => (
              <SimpleTag label={value} _groupHover={{ bg: 'surfaceTertiary' }} />
            )}
            showCopyButton
            infoText="BNS is a decentralized naming system for human-readable names on Stacks."
          />
        )}
        <SummaryItem
          label="Total paid in fees"
          value={totalFees.toString()}
          valueRenderer={value => <PriceSummaryItemValue value={value} stxPrice={stxPrice} />}
        />
        <SummaryItem
          label="Last executed nonce"
          value={initialAddressLatestNonceData?.last_executed_tx_nonce?.toString() || ''}
          showCopyButton
          infoText="A nonce is a unique number used to track and order transactions from an address."
        />
      </Table.Body>
    </Table.Root>
  );
};

const BalanceItem = ({
  tokenBalance,
  tokenBalanceUsdValue,
  tokenBalanceType,
}: {
  tokenBalance: number;
  tokenBalanceUsdValue: number;
  tokenBalanceType: TokenBalanceType;
}) => {
  const formattedTokenBalance = tokenBalance.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
  const formattedTokenBalanceValue = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(tokenBalanceUsdValue);
  return (
    <Stack gap={1.5}>
      <Flex gap={2} alignItems="center" flexWrap="nowrap">
        <Circle bg="accent.stacks-500" h={6} w={6} border="none">
          <Icon h={3.5} w={3.5} color="neutral.sand-50">
            {tokenBalanceType === 'stx' ? <StacksIconThin /> : <SBTCIcon />}
          </Icon>
        </Circle>
        <Text textStyle="heading-sm" color="textPrimary" whiteSpace="nowrap">
          {formattedTokenBalance} {tokenBalanceType === 'stx' ? 'STX' : 'sBTC'}
        </Text>
        <RowCopyButton value={tokenBalance.toString()} ariaLabel={`copy balance`} />
      </Flex>
      <Flex>
        <SimpleTag label={`${formattedTokenBalanceValue}`} />
        <RowCopyButton value={tokenBalanceUsdValue.toString()} ariaLabel={`copy balance`} />
      </Flex>
    </Stack>
  );
};

const BalanceCard = () => {
  const { initialAddressBalancesData, stxPrice, btcPrice } = useAddressIdPageData();

  const totalBalanceMicroStacks = initialAddressBalancesData?.stx.balance;
  const isStxBalanceDefined =
    totalBalanceMicroStacks !== undefined && !isNaN(parseFloat(totalBalanceMicroStacks));
  const totalBalanceStacks = isStxBalanceDefined ? microToStacks(totalBalanceMicroStacks) : 0;
  const totalBalanceUsdValue = isStxBalanceDefined ? totalBalanceStacks * stxPrice : 0;

  const fungibleTokenBalances = initialAddressBalancesData?.fungible_tokens;
  const sbtcBalance = fungibleTokenBalances?.[sbtcContractAddress]?.balance;
  const isSbtcBalanceDefined = sbtcBalance !== undefined && !isNaN(parseFloat(sbtcBalance));
  const sbtcBalanceNumber = isSbtcBalanceDefined ? parseFloat(sbtcBalance) : 0;
  const sbtcBalanceUsdValue = isSbtcBalanceDefined ? sbtcBalanceNumber * btcPrice : 0;

  return (
    <Stack
      px={5}
      py={5}
      gap={4}
      bg="surfaceSecondary"
      borderRadius="redesign.xl"
      border="1px solid"
      borderColor="redesignBorderSecondary"
      w="full"
      minW={0}
    >
      <Text textStyle="text-medium-sm" color="textPrimary">
        Total balance
      </Text>
      <Stack gap={6}>
        <BalanceItem
          tokenBalance={totalBalanceStacks}
          tokenBalanceUsdValue={totalBalanceUsdValue}
          tokenBalanceType="stx"
        />
        <BalanceItem
          tokenBalance={sbtcBalanceNumber}
          tokenBalanceUsdValue={sbtcBalanceUsdValue}
          tokenBalanceType="sbtc"
        />
      </Stack>
    </Stack>
  );
};

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

export function TokenBalanceAndTokenBalanceUsdValueItem({
  tokenBalance,
  tokenBalanceUsdValue,
  tokenIcon,
  tokenTicker,
  iconProps,
}: {
  tokenBalance: number;
  tokenBalanceUsdValue: number;
  tokenIcon: ReactNode;
  tokenTicker: string;
  iconProps?: IconProps;
}) {
  const formattedTokenBalance = tokenBalance.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
  const formattedTokenBalanceValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(tokenBalanceUsdValue);
  return (
    <Flex gap={1} alignItems="center">
      <Flex gap={2} alignItems="center" flexWrap="nowrap">
        <Icon h={3.5} w={3.5} color="iconPrimary" {...iconProps}>
          {tokenIcon}
        </Icon>
        {formattedTokenBalance} {tokenTicker}
      </Flex>
      <RowCopyButton value={tokenBalance.toString()} ariaLabel={`copy ${tokenTicker} balance`} />
      <Flex gap={2} alignItems="center">
        <SimpleTag label={formattedTokenBalanceValue} />
        <RowCopyButton
          value={tokenBalanceUsdValue.toString()}
          ariaLabel={`copy ${tokenTicker} balance USD value`}
        />
      </Flex>
    </Flex>
  );
}

export function CurrentCycleValue() {
  const { initialPoxInfoData } = useAddressIdPageData();
  const { currentCycleId, currentCycleProgressPercentage, approximateDaysTilNextCycle } =
    initialPoxInfoData || {};
  const countdownText =
    approximateDaysTilNextCycle === 0
      ? 'Ends today'
      : `Ends in ${approximateDaysTilNextCycle} ${approximateDaysTilNextCycle === 1 ? 'day' : 'days'}`;
  return (
    <Stack gap={1}>
      <NextLink
        href={`/stacking/cycle/${currentCycleId}`}
        textStyle="text-regular-sm"
        color="textSecondary"
        w="fit-content"
      >
        {currentCycleId}
      </NextLink>
      <Flex gap={1.5} alignItems="center">
        <Flex bg="surfaceFifth" borderRadius="redesign.xl" w="50%" h={1} alignItems="center">
          <Flex
            bg="accent.stacks-500"
            borderRadius="redesign.xl"
            w={currentCycleProgressPercentage ? `${currentCycleProgressPercentage * 100}%` : '0%'}
            h="full"
          />
        </Flex>
        <Text textStyle="text-medium-sm" color="textSecondary">
          {currentCycleProgressPercentage
            ? `${(currentCycleProgressPercentage * 100).toFixed(0)}%`
            : '0%'}
        </Text>
      </Flex>
      <Text textStyle="text-medium-sm" color="textSecondary">
        {countdownText}
      </Text>
    </Stack>
  );
}

const StackingCard = () => {
  const { initialAddressBalancesData, stxPrice, btcPrice, initialBurnChainRewardsData } =
    useAddressIdPageData();
  const burnChainLockHeight = initialAddressBalancesData?.stx.burnchain_lock_height;
  const burnChainUnlockHeight = initialAddressBalancesData?.stx.burnchain_unlock_height;
  const lockedSTX = initialAddressBalancesData?.stx.locked;
  const lockedSTXFormatted = microToStacks(lockedSTX || '0');
  const minerRewards = initialAddressBalancesData?.stx.total_miner_rewards_received;
  const btcRewards = parseFloat(initialBurnChainRewardsData?.reward_amount || '0');

  if (!lockedSTX || lockedSTX === '0') {
    return null;
  }

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
        Stacking
      </Text>
      <Stack gap={4}>
        <StackingCardItem
          label="Locked"
          value={
            <TokenBalanceAndTokenBalanceUsdValueItem
              tokenBalance={lockedSTXFormatted}
              tokenBalanceUsdValue={lockedSTXFormatted * stxPrice}
              tokenIcon={<StacksIconThin />}
              tokenTicker="STX"
            />
          }
        />
        <StackingCardItem
          label="BTC Rewards"
          value={
            <TokenBalanceAndTokenBalanceUsdValueItem
              tokenBalance={btcRewards}
              tokenBalanceUsdValue={btcRewards * btcPrice}
              tokenIcon={<BitcoinIcon />}
              tokenTicker="BTC"
              iconProps={{
                color: 'accent.bitcoin-500',
              }}
            />
          }
        />
        <StackingCardItem label="Current cycle" value={<CurrentCycleValue />} />
        <StackingCardItem
          label="BTC lock height"
          value={
            <Text textStyle="text-regular-sm" color="textPrimary">
              {burnChainLockHeight}
            </Text>
          }
        />
        <StackingCardItem
          label="BTC unlock height"
          value={
            <Text textStyle="text-regular-sm" color="textPrimary">
              {burnChainUnlockHeight}
            </Text>
          }
        />
      </Stack>
    </Stack>
  );
};

export function MinerCard() {
  const { initialAddressBalancesData, stxPrice } = useAddressIdPageData();
  const minerRewardsInMicroStacks = initialAddressBalancesData?.stx.total_miner_rewards_received;

  if (!minerRewardsInMicroStacks || parseFloat(minerRewardsInMicroStacks) <= 0) {
    return null;
  }

  const minerRewardsInStacks = microToStacks(minerRewardsInMicroStacks || '0');
  const minerRewardUsdValue = minerRewardsInStacks * stxPrice;

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
        Miner rewards
      </Text>
      <TokenBalanceAndTokenBalanceUsdValueItem
        tokenBalance={minerRewardsInStacks}
        tokenBalanceUsdValue={minerRewardUsdValue}
        tokenIcon={<StacksIconThin />}
        tokenTicker="STX"
      />
    </Stack>
  );
}

export const AddressOverview = () => {
  const { initialAddressRecentTransactionsData, principal } = useAddressIdPageData();

  return (
    <Grid templateColumns={{ base: '100%', lg: '75% 25%' }} gap={2} w="full" minW={0}>
      <Stack gap={2} display={{ base: 'flex', lg: 'none' }} w="full" minW={0}>
        <BalanceCard />
        <StackingCard />
        <MinerCard />
      </Stack>
      <Stack gap={8}>
        <TabsContentContainer h="fit-content">
          <AddressOverviewTable />
        </TabsContentContainer>
        <Stack gap={3}>
          <Text textStyle="heading-xs" color="textPrimary">
            Recent transactions
          </Text>
          <AddressTxsTable
            principal={principal}
            initialData={initialAddressRecentTransactionsData}
            disablePagination
            pageSize={ADDRESS_ID_PAGE_RECENT_ADDRESS_TXS_LIMIT}
          />
        </Stack>
      </Stack>
      <Stack gap={2} display={{ base: 'none', lg: 'flex' }} w="full" minW={0}>
        <BalanceCard />
        <StackingCard />
        <MinerCard />
      </Stack>
    </Grid>
  );
};
