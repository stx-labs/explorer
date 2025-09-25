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
            valueRenderer={value => <SimpleTag label={value} />}
            showCopyButton
            infoText="BNS is a decentralized naming system for human-readable names on Stacks."
          />
        )}
        <SummaryItem
          label="Total paid in fees"
          value={totalFees.toString()}
          valueRenderer={value => <PriceSummaryItemValue value={value} stxPrice={stxPrice} />}
          showCopyButton
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
  tokenBalanceValue,
  tokenBalanceType,
}: {
  tokenBalance: string;
  tokenBalanceValue: string;
  tokenBalanceType: TokenBalanceType;
}) => {
  const formattedTokenBalance = parseFloat(tokenBalance).toFixed(6).toLocaleString();
  return (
    <Stack gap={1.5}>
      <Flex gap={2} alignItems="center">
        <Circle bg="accent.stacks-500" h={6} w={6} border="none">
          <Icon h={3.5} w={3.5} color="colors.neutral.sand-50">
            {tokenBalanceType === 'stx' ? <StacksIconThin /> : <SBTCIcon />}
          </Icon>
        </Circle>
        <Text textStyle="heading-sm" color="textPrimary">
          {formattedTokenBalance} STX
        </Text>
        <RowCopyButton value={tokenBalance} ariaLabel={`copy balance`} />
      </Flex>
      <Flex>
        <SimpleTag label={`$${tokenBalanceValue}`} />
        <RowCopyButton value={tokenBalanceValue} ariaLabel={`copy balance`} />
      </Flex>
    </Stack>
  );
};

const BalanceCard = () => {
  const { initialAddressBalancesData, stxPrice, btcPrice } = useAddressIdPageData();

  const totalBalanceMicroStacks = initialAddressBalancesData?.stx.balance;
  const isStxBalanceDefined = totalBalanceMicroStacks !== undefined;
  const totalBalanceStacks = isStxBalanceDefined ? microToStacks(totalBalanceMicroStacks) : 0;
  const totalBalanceUsdValue = (totalBalanceStacks * stxPrice).toFixed(2);

  const fungibleTokenBalances = initialAddressBalancesData?.fungible_tokens;
  const sbtcBalance = fungibleTokenBalances?.[sbtcContractAddress]?.balance;
  const isSbtcBalanceDefined = sbtcBalance !== undefined;
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
    >
      <Text textStyle="text-medium-sm" color="textPrimary">
        Total balance
      </Text>
      <Stack gap={6}>
        <BalanceItem
          tokenBalance={isStxBalanceDefined ? totalBalanceStacks.toString() : '-'}
          tokenBalanceValue={isStxBalanceDefined ? totalBalanceUsdValue : '-'}
          tokenBalanceType="stx"
        />
        {isSbtcBalanceDefined && (
          <BalanceItem
            tokenBalance={sbtcBalance}
            tokenBalanceValue={sbtcBalanceUsdValue.toString()}
            tokenBalanceType="sbtc"
          />
        )}
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

export function CryptoStackingCard({
  tokenBalance,
  tokenPrice,
  tokenIcon,
  tokenTicker,
  iconProps,
}: {
  tokenBalance: number;
  tokenPrice: number;
  tokenIcon: ReactNode;
  tokenTicker: string;
  iconProps?: IconProps;
}) {
  const tokenBalanceValue = tokenBalance * tokenPrice;

  return (
    <Flex gap={1.5} alignItems="center">
      <Icon h={3.5} w={3.5} color="iconPrimary" {...iconProps}>
        {tokenIcon}
      </Icon>
      {tokenBalance} {tokenTicker}
      <RowCopyButton value={tokenBalance.toString()} ariaLabel={`copy ${tokenTicker} balance`} />
      <Text textStyle="text-regular-sm" color="textSecondary">
        /
      </Text>
      <Text textStyle="text-regular-sm" color="textSecondary">
        {tokenBalanceValue}
      </Text>
      <RowCopyButton
        value={tokenBalanceValue.toString()}
        ariaLabel={`copy ${tokenTicker} balance USD value`}
      />
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
      borderColor="borderSecondary"
    >
      <Text textStyle="text-medium-sm" color="textPrimary">
        Stacking
      </Text>
      <Stack gap={4}>
        <StackingCardItem
          label="Locked"
          value={
            <CryptoStackingCard
              tokenBalance={lockedSTXFormatted}
              tokenPrice={stxPrice}
              tokenIcon={<StacksIconThin />}
              tokenTicker="STX"
            />
          }
        />
        <StackingCardItem
          label="BTC Rewards"
          value={
            <CryptoStackingCard
              tokenBalance={btcRewards}
              tokenPrice={btcPrice}
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
  const minerRewards = initialAddressBalancesData?.stx.total_miner_rewards_received;

  if (!minerRewards || minerRewards === '0') {
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
        Miner rewards
      </Text>
      <CryptoStackingCard
        tokenBalance={parseFloat(minerRewards)}
        tokenPrice={stxPrice}
        tokenIcon={<StacksIconThin />}
        tokenTicker="STX"
      />
    </Stack>
  );
}

export const AddressOverview = () => {
  const { initialAddressRecentTransactionsData, principal } = useAddressIdPageData();

  return (
    <Grid templateColumns={{ base: '1fr', md: '75% 25%' }} gap={2}>
      <Stack gap={2} display={{ base: 'flex', md: 'none' }}>
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
      <Stack gap={2} display={{ base: 'none', md: 'flex' }}>
        <BalanceCard />
        <StackingCard />
        <MinerCard />
      </Stack>
    </Grid>
  );
};
