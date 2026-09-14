'use client';

import { ProgressBar } from '@/common/components/ProgressBar';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { Table } from '@/common/components/table/Table';
import { TableContainer } from '@/common/components/table/TableContainer';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { NetworkModes } from '@/common/types/network';
import { MICROSTACKS_IN_STACKS, abbreviateNumber } from '@/common/utils/utils';
import { BlockHeightBadge } from '@/ui/Badge';
import { ButtonLink } from '@/ui/ButtonLink';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Box, Flex, Grid, Icon, Stack } from '@chakra-ui/react';
import { Info } from '@phosphor-icons/react';
import { useCallback, useMemo } from 'react';

import { MAINNET_HISTORIC_CYCLES, PREVIOUS_CYCLES_LIMIT, STAKING_LINKS } from './consts';
import { CycleRow, cycleColumns, toCycleRow } from './cycleColumns';
import { CycleRewards, PoxCycle } from './data';
import type { DailyPrices } from './prices';
import {
  burnHeightToApproximateTimestamp,
  formatTermDuration,
  getCycleStackerRewardsSatsBigInt,
} from './projections';
import type { CurrentCycleEstimate } from './reward-estimate';
import { formatBurnDate, formatDateWithYear, formatSbtc, formatUsd } from './utils';

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <Flex
      align="center"
      gap={2}
      bg="surfaceFourth"
      borderRadius="redesign.xl"
      px={3}
      py={1.5}
      width="fit-content"
    >
      <Box w={2} h={2} borderRadius="full" bg="feedback.green-500" />
      <Text textStyle="text-medium-md" whiteSpace="nowrap">
        {children}
      </Text>
    </Flex>
  );
}

export function StackingOverview({
  poxInfo,
  cycles,
  cycleRewards,
  pox5FirstCycleId,
  firstBurnchainBlockHeight,
  currentBurnHeight,
  nowMs,
  burnBlockTimes,
  lastCalculationHeightByCycle,
  prices,
  currentCycleEstimate,
}: {
  poxInfo: PoxInfo;
  cycles: PoxCycle[];
  cycleRewards: Record<number, CycleRewards>;
  pox5FirstCycleId?: number;
  firstBurnchainBlockHeight: number;
  currentBurnHeight: number;
  nowMs: number;
  burnBlockTimes: Record<number, number>;
  lastCalculationHeightByCycle?: Record<number, number>;
  prices?: DailyPrices;
  currentCycleEstimate?: CurrentCycleEstimate;
}) {
  const { stxPrice, btcPrice } = useGlobalContext().tokenPrice;
  const network = useGlobalContext().activeNetwork;
  const historic = network.mode === NetworkModes.Mainnet ? MAINNET_HISTORIC_CYCLES : undefined;
  const currentCycleId = poxInfo.current_cycle?.id;
  const currentCycleRewards =
    currentCycleId !== undefined ? cycleRewards[currentCycleId] : undefined;
  const stackedStx = currentCycleRewards
    ? Number(currentCycleRewards.stakedMicroStx) / MICROSTACKS_IN_STACKS
    : undefined;
  const blocksUntilNextCycle = poxInfo.next_reward_cycle_in ?? 0;
  const rewardCycleLength = poxInfo.reward_cycle_length ?? 0;
  const cycleStartHeight = useCallback(
    (cycleNumber: number) => firstBurnchainBlockHeight + cycleNumber * rewardCycleLength,
    [firstBurnchainBlockHeight, rewardCycleLength]
  );
  const at = useCallback(
    (height: number) => burnHeightToApproximateTimestamp(height, currentBurnHeight, nowMs),
    [currentBurnHeight, nowMs]
  );

  const currentStart = cycleStartHeight(currentCycleId ?? 0);
  const currentEnd = cycleStartHeight((currentCycleId ?? 0) + 1);
  const elapsed = rewardCycleLength > 0 ? 1 - blocksUntilNextCycle / rewardCycleLength : 0;
  const daysLeft = formatTermDuration(blocksUntilNextCycle);

  const previousCycle = cycles
    .filter(cycle => currentCycleId !== undefined && cycle.cycle_number < currentCycleId)
    .sort((a, b) => b.cycle_number - a.cycle_number)[0];
  const previousRow = previousCycle
    ? toCycleRow({
        cycle: previousCycle,
        rewards: cycleRewards[previousCycle.cycle_number],
        pox5FirstCycleId,
        cycleStartHeight,
        burnBlockTimes,
        lastCalculationHeightByCycle,
        historic,
        currentBurnHeight,
        nowMs,
        prices,
        btcPrice,
        stxPrice,
      })
    : undefined;
  const estimate =
    currentCycleEstimate?.cycleNumber === currentCycleId ? currentCycleEstimate : undefined;
  const currentCycleSats =
    estimate?.creditedSats ??
    (currentCycleRewards
      ? getCycleStackerRewardsSatsBigInt(
          currentCycleRewards.rewardsPerMicroStx,
          currentCycleRewards.stakedMicroStx
        )
      : undefined);
  const currentRewardText =
    currentCycleSats !== undefined
      ? `${formatSbtc(currentCycleSats, 2)} rewarded so far`
      : 'Reward data unavailable';
  const currentRewardNote = 'Assumes this cycle’s average reward rate continues.';

  const rows = useMemo<CycleRow[]>(
    () =>
      cycles
        .filter(cycle => currentCycleId === undefined || cycle.cycle_number < currentCycleId)
        .map(cycle =>
          toCycleRow({
            cycle,
            rewards: cycleRewards[cycle.cycle_number],
            pox5FirstCycleId,
            cycleStartHeight,
            burnBlockTimes,
            lastCalculationHeightByCycle,
            historic,
            currentBurnHeight,
            nowMs,
            prices,
            btcPrice,
            stxPrice,
          })
        ),
    [
      cycles,
      currentCycleId,
      cycleRewards,
      pox5FirstCycleId,
      burnBlockTimes,
      lastCalculationHeightByCycle,
      cycleStartHeight,
      historic,
      currentBurnHeight,
      nowMs,
      prices,
      btcPrice,
      stxPrice,
    ]
  );

  return (
    <Stack gap={8}>
      <Stack gap={4}>
        <Flex justify="space-between" align="baseline" gap={4} flexWrap="wrap">
          <Text textStyle="heading-md">STX-only Staking</Text>
          <ButtonLink
            href={STAKING_LINKS.stackingTracker}
            buttonLinkSize="big"
            target="_blank"
            rel="noopener noreferrer"
          >
            stacking-tracker.com
          </ButtonLink>
        </Flex>

        <Flex gap={3} flexDirection={{ base: 'column', lg: 'row' }} align="stretch">
          <Stack
            gap={5}
            bg="surfacePrimary"
            borderRadius="redesign.xl"
            p={[4, 6]}
            flex={{ base: '1 1 auto', lg: '3 1 0' }}
            minW={0}
          >
            <Flex justify="space-between" gap={3} flexWrap="wrap" align="flex-start">
              <Stack gap={3}>
                <Text textStyle="text-regular-sm" color="textSecondary">
                  Current cycle
                </Text>
                <Text
                  textStyle="heading-md"
                  bg="surfaceFourth"
                  borderRadius="redesign.xl"
                  px={5}
                  py={2}
                  width="fit-content"
                >
                  {currentCycleId ?? '-'}
                </Text>
              </Stack>
              <Pill>
                {Math.round(Math.min(Math.max(elapsed, 0), 1) * 100)}% complete
                {daysLeft && ` · ends in ~${daysLeft}`}
              </Pill>
            </Flex>

            <Stack gap={1}>
              <Flex gap={2} align="baseline" flexWrap="wrap">
                <Text textStyle="heading-sm" whiteSpace="nowrap">
                  {stackedStx === undefined
                    ? 'Unavailable'
                    : `${abbreviateNumber(stackedStx, 1)} STX`}
                </Text>
                {stackedStx !== undefined && stxPrice > 0 && (
                  <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
                    / {formatUsd(stackedStx * stxPrice)} stacked
                  </Text>
                )}
              </Flex>
              <Text textStyle="text-regular-sm" color="textSecondary">
                {currentRewardText}
              </Text>
              {estimate?.projectedTotalSats !== undefined && (
                <Flex gap={1} align="center">
                  <Text textStyle="text-regular-sm" color="textSecondary">
                    ~{formatSbtc(estimate.projectedTotalSats, 2)} estimated total this cycle
                  </Text>
                  <Tooltip
                    variant="redesignPrimary"
                    size="lg"
                    portalled
                    contentProps={{ maxW: '18rem', whiteSpace: 'normal', textAlign: 'left' }}
                    content={currentRewardNote}
                  >
                    <Icon
                      w={3.5}
                      h={3.5}
                      flexShrink={0}
                      color="iconSecondary"
                      cursor="help"
                      tabIndex={0}
                      aria-label={currentRewardNote}
                    >
                      <Info />
                    </Icon>
                  </Tooltip>
                </Flex>
              )}
            </Stack>

            <Stack gap={4}>
              <Stack gap={1}>
                <Flex justify="space-between">
                  <Text textStyle="text-medium-sm" color="textPrimary">
                    Started
                  </Text>
                  <Text textStyle="text-medium-sm" color="textPrimary">
                    Ends
                  </Text>
                </Flex>
                <ProgressBar percentage={Math.min(Math.max(elapsed, 0), 1) * 100} />
              </Stack>
              <Flex justify="space-between" gap={3}>
                <Text
                  textStyle="text-medium-xs"
                  color="textPrimary"
                  borderRadius="redesign.md"
                  bg="surfaceFifth"
                  px={2}
                  py={1}
                  suppressHydrationWarning
                >
                  {formatBurnDate(currentStart, currentBurnHeight, nowMs, burnBlockTimes)}
                </Text>
                <Text
                  textStyle="text-medium-xs"
                  color="textPrimary"
                  borderRadius="redesign.md"
                  bg="surfaceFifth"
                  px={2}
                  py={1}
                  suppressHydrationWarning
                >
                  {formatBurnDate(currentEnd, currentBurnHeight, nowMs, burnBlockTimes)}
                </Text>
              </Flex>
              <Flex justify="space-between" gap={3} align="flex-start">
                <BlockHeightBadge blockType="btc" blockHeight={currentStart} />
                <BlockHeightBadge blockType="btc" blockHeight={currentEnd} disableLink />
              </Flex>
            </Stack>
          </Stack>

          <Grid
            gap={3}
            flex={{ base: '1 1 auto', lg: '2 1 0' }}
            minW={0}
            templateRows={{ lg: previousRow?.hasRewardData ? '1fr 1fr' : '1fr' }}
          >
            <Stack
              gap={2}
              bg="surfaceFourth"
              border="1px solid"
              borderColor="redesignBorderSecondary"
              borderRadius="redesign.xl"
              p={[4, 5]}
              justify={{ base: 'flex-start', lg: 'space-between' }}
            >
              <Text textStyle="text-regular-sm" color="textSecondary">
                Next cycle
              </Text>
              <Flex gap={2} align="baseline" flexWrap="wrap">
                <Text textStyle="heading-md">{(currentCycleId ?? 0) + 1}</Text>
                <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
                  starts #{currentEnd.toLocaleString()}
                </Text>
              </Flex>
              <Text textStyle="text-regular-sm" color="accent.stacks-500" suppressHydrationWarning>
                ~{formatDateWithYear(at(currentEnd))} · projected
              </Text>
            </Stack>

            {previousRow?.hasRewardData && (
              <Stack
                gap={2}
                bg="surfacePrimary"
                borderRadius="redesign.xl"
                p={[4, 5]}
                flex={{ base: '0 0 auto', lg: '1 1 0' }}
                minH={0}
                justify={{ base: 'flex-start', lg: 'space-between' }}
              >
                <Text textStyle="text-regular-sm" color="textSecondary">
                  Previous cycle
                </Text>
                <Flex gap={2} align="baseline" flexWrap="wrap">
                  <Text textStyle="heading-md">{previousRow.cycleNumber}</Text>
                  <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
                    {previousRow.apyPercent !== undefined
                      ? `${previousRow.yieldEstimated ? '~' : ''}${previousRow.apyPercent.toFixed(2)}% APY · `
                      : ''}
                    {formatSbtc(previousRow.rewardsSats, 2)} rewarded
                  </Text>
                </Flex>
                <Text textStyle="text-regular-sm" color="textSecondary">
                  {previousRow.settled
                    ? previousRow.yieldEstimated
                      ? 'Gross APY estimated at current prices, assuming repeated cycle returns.'
                      : 'Gross APY at historical daily prices, assuming repeated cycle returns.'
                    : 'Final reward calculation pending or unverified.'}
                </Text>
              </Stack>
            )}
          </Grid>
        </Flex>
      </Stack>

      <Stack gap={4}>
        <Flex justify="space-between" align="center" gap={4}>
          <Text textStyle="heading-xs">Previous cycles</Text>
          <ButtonLink
            href={STAKING_LINKS.stackingTracker}
            buttonLinkSize="big"
            target="_blank"
            rel="noopener noreferrer"
            display={{ base: 'none', md: 'inline' }}
          >
            View all cycles at stacking-tracker.com
          </ButtonLink>
        </Flex>
        <Table
          data={rows.slice(0, PREVIOUS_CYCLES_LIMIT)}
          columns={cycleColumns}
          tableContainerWrapper={table => (
            <TableContainer pt={{ base: 3, lg: 4 }}>{table}</TableContainer>
          )}
          scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
          tableProps={{ mt: { base: -3, lg: -4 } }}
        />
        <Text textStyle="text-regular-xs" color="textSecondary">
          Rewards and gross yield before PoX-5 come from stacking-tracker.com. Gross APY assumes
          repeated cycle returns compounded for a year, before pool or signer fees. ~ indicates
          current-price estimates.
        </Text>
        <ButtonLink
          href={STAKING_LINKS.stackingTracker}
          buttonLinkSize="big"
          target="_blank"
          rel="noopener noreferrer"
          display={{ base: 'inline', md: 'none' }}
        >
          View all cycles at stacking-tracker.com
        </ButtonLink>
      </Stack>
    </Stack>
  );
}
