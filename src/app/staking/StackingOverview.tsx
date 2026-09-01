'use client';

import { Table } from '@/common/components/table/Table';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { buildUrl } from '@/common/utils/buildUrl';
import { formatDateShort } from '@/common/utils/date-utils';
import { MICROSTACKS_IN_STACKS, abbreviateNumber } from '@/common/utils/utils';
import { Text } from '@/ui/Text';
import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';
import { ColumnDef } from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';

import { ViewAllLink } from './ViewAllLink';
import { PREVIOUS_CYCLES_LIMIT, STAKING_LINKS } from './consts';
import { CycleRow, cycleColumns, toCycleRow } from './cycleColumns';
import { CycleRewards, PoxCycle } from './data';
import { DailyPrices, getCyclePrices } from './prices';
import {
  burnHeightToApproximateTimestamp,
  formatTermDuration,
  getCycleStackerRewardsSatsBigInt,
  getStackingYieldForCompletedCycle,
} from './projections';
import { formatBtc, formatDateWithYear, formatUsd } from './utils';

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
      <Text textStyle="text-regular-sm" whiteSpace="nowrap">
        {children}
      </Text>
    </Flex>
  );
}

/** A block height shown as a chip, the way the design marks cycle boundaries. */
function HeightChip({ height }: { height: number }) {
  return (
    <Text
      textStyle="text-mono-xs"
      color="textSecondary"
      bg="surfaceFourth"
      borderRadius="redesign.xs"
      px={2}
      py={0.5}
      whiteSpace="nowrap"
    >
      #{height.toLocaleString()}
    </Text>
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
  prices,
  cycleEndTimes,
}: {
  poxInfo: PoxInfo;
  cycles: PoxCycle[];
  cycleRewards: Record<number, CycleRewards>;
  pox5FirstCycleId?: number;
  firstBurnchainBlockHeight: number;
  currentBurnHeight: number;
  nowMs: number;
  /** Daily price history, so a finished cycle is priced at the time it ended. */
  prices?: DailyPrices;
  /** Real cycle end times, where the chain has been asked for them. */
  cycleEndTimes?: Record<number, number>;
}) {
  const { stxPrice, btcPrice } = useGlobalContext().tokenPrice;
  const network = useGlobalContext().activeNetwork;
  const currentCycleId = poxInfo?.current_cycle?.id;
  const stackedStx = (poxInfo?.current_cycle?.stacked_ustx ?? 0) / MICROSTACKS_IN_STACKS;
  const blocksUntilNextCycle = poxInfo?.next_reward_cycle_in ?? 0;
  const rewardCycleLength = poxInfo?.reward_cycle_length ?? 0;

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

  // The most recently settled cycle is what the callout reports, since a
  // running cycle holds only part of its rewards.
  const lastSettled = cycles
    .filter(cycle => currentCycleId === undefined || cycle.cycle_number < currentCycleId)
    .sort((a, b) => b.cycle_number - a.cycle_number)[0];
  const lastSettledRewards = lastSettled ? cycleRewards[lastSettled.cycle_number] : undefined;
  const lastSettledSats = lastSettledRewards
    ? getCycleStackerRewardsSatsBigInt(
        lastSettledRewards.rewardsPerMicroStx,
        lastSettledRewards.stakedMicroStx
      )
    : undefined;
  // The cycle has finished, so it is priced at the day it ended rather than at
  // today's rates, which would move a settled figure every time the market did.
  const lastSettledEndMs = lastSettled
    ? (cycleEndTimes?.[lastSettled.cycle_number] ??
      at(cycleStartHeight(lastSettled.cycle_number + 1)))
    : undefined;
  const lastSettledPrices =
    prices && lastSettledEndMs !== undefined ? getCyclePrices(prices, lastSettledEndMs) : undefined;
  const lastSettledPricedAtEnd =
    lastSettledPrices?.btcPriceUsd !== undefined && lastSettledPrices?.stxPriceUsd !== undefined;
  const lastSettledYield = lastSettledRewards
    ? getStackingYieldForCompletedCycle({
        rewardsPerMicroStx: lastSettledRewards.rewardsPerMicroStx,
        rewardCycleLength,
        btcPriceUsd: lastSettledPrices?.btcPriceUsd ?? btcPrice,
        stxPriceUsd: lastSettledPrices?.stxPriceUsd ?? stxPrice,
      })
    : undefined;

  const rows = useMemo<CycleRow[]>(
    () =>
      cycles
        // Finished cycles only. A running cycle holds part of its rewards, and
        // the API also returns cycles that have not started.
        .filter(cycle => currentCycleId === undefined || cycle.cycle_number < currentCycleId)
        .map(cycle =>
          toCycleRow({
            cycle,
            rewards: cycleRewards[cycle.cycle_number],
            pox5FirstCycleId,
            rewardCycleLength,
            cycleStartHeight,
            at,
            btcPrice,
            stxPrice,
            prices,
            cycleEndTimes,
          })
        ),
    [
      cycles,
      currentCycleId,
      cycleRewards,
      pox5FirstCycleId,
      rewardCycleLength,
      btcPrice,
      stxPrice,
      prices,
      cycleEndTimes,
      at,
      cycleStartHeight,
    ]
  );

  return (
    <Stack gap={5}>
      <Flex justify="space-between" align="baseline" gap={4} flexWrap="wrap">
        <Text textStyle="heading-md">STX-only Staking</Text>
        <a href={STAKING_LINKS.stackingTracker} target="_blank" rel="noopener noreferrer">
          <Flex
            align="center"
            gap={1}
            borderBottom="1px solid"
            borderColor="redesignBorderPrimary"
            width="fit-content"
          >
            <Text textStyle="text-medium-sm" color="textPrimary">
              stacking-tracker.com
            </Text>
            <Icon w={3.5} h={3.5} color="textPrimary">
              <ArrowUpRight weight="bold" />
            </Icon>
          </Flex>
        </a>
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
                textStyle="heading-lg"
                bg="surfaceFourth"
                borderRadius="redesign.xl"
                px={5}
                py={2}
                width="fit-content"
              >
                {currentCycleId ?? '-'}
              </Text>
            </Stack>
            {daysLeft && <Pill>Ends in ~{daysLeft}</Pill>}
          </Flex>

          <Flex gap={2} align="baseline" flexWrap="wrap">
            <Text textStyle="heading-sm" whiteSpace="nowrap">
              {abbreviateNumber(stackedStx, 1)} STX
            </Text>
            {stxPrice > 0 && (
              <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
                / {formatUsd(stackedStx * stxPrice)} stacked
              </Text>
            )}
          </Flex>

          <Stack gap={2}>
            <Flex justify="space-between">
              <Text textStyle="text-regular-sm">Started</Text>
              <Text textStyle="text-regular-sm">Ends</Text>
            </Flex>
            <Box bg="surfaceFourth" h={2} borderRadius="redesign.xl" overflow="hidden">
              <Box
                bg="accent.stacks-500"
                h="100%"
                w={`${Math.min(Math.max(elapsed, 0), 1) * 100}%`}
              />
            </Box>
            <Flex justify="space-between" gap={3} align="center" flexWrap="wrap">
              <Flex gap={2} align="center">
                <HeightChip height={currentStart} />
                <Text textStyle="text-regular-xs" color="textSecondary" suppressHydrationWarning>
                  {formatDateShort(at(currentStart))}
                </Text>
              </Flex>
              <Flex gap={2} align="center">
                <Text textStyle="text-regular-xs" color="textSecondary" suppressHydrationWarning>
                  ~{formatDateShort(at(currentEnd))}
                </Text>
                <HeightChip height={currentEnd} />
              </Flex>
            </Flex>
          </Stack>
        </Stack>

        <Stack gap={3} flex={{ base: '1 1 auto', lg: '2 1 0' }} minW={0}>
          <Stack
            gap={2}
            bg="surfaceFourth"
            border="1px solid"
            borderColor="redesignBorderSecondary"
            borderRadius="redesign.xl"
            p={[4, 5]}
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

          {/*
            The rewards figure is a contract read; the rate is derived from it.
            Naming the method beats hedging, so a reader can tell whether the
            number answers their question.
          */}
          {lastSettled && lastSettledSats !== undefined && (
            <Stack
              gap={1.5}
              bg="surfacePrimary"
              borderRadius="redesign.xl"
              p={[4, 5]}
              flex={{ base: '0 0 auto', lg: '1 1 auto' }}
              justify="center"
            >
              {/* The rule sits inside the padding rather than on the card edge. */}
              <Flex gap={4} align="stretch">
                <Box w="3px" bg="accent.stacks-500" borderRadius="redesign.xs" flexShrink={0} />
                <Stack gap={1.5}>
                  <Text textStyle="text-medium-sm">
                    {lastSettledYield?.apyPercent !== undefined
                      ? `${lastSettledYield.apyPercent.toFixed(2)}% APY · `
                      : ''}
                    {formatBtc(lastSettledSats)} paid last cycle
                  </Text>
                  <Text textStyle="text-regular-sm" color="textSecondary">
                    {`Cycle ${lastSettled.cycle_number} rewards are verified from on-chain contract reads.`}
                    {lastSettledYield?.apyPercent !== undefined &&
                      (lastSettledPricedAtEnd
                        ? ' APY is calculated from end-of-cycle BTC and STX prices.'
                        : ' APY is calculated from current BTC and STX prices.')}
                  </Text>
                </Stack>
              </Flex>
            </Stack>
          )}
        </Stack>
      </Flex>

      <Stack gap={3}>
        <Text textStyle="heading-xs">Previous cycles</Text>
        <Table data={rows.slice(0, PREVIOUS_CYCLES_LIMIT)} columns={cycleColumns} />
        <Flex justify="space-between" gap={4} flexWrap="wrap" align="baseline">
          <Text textStyle="text-regular-xs" color="textSecondary">
            Signer count, not stacker count. Rewards and APY start at the first pox-5 cycle.
          </Text>
          <ViewAllLink href={buildUrl('/staking/cycles', network)}>View all cycles</ViewAllLink>
        </Flex>
      </Stack>
    </Stack>
  );
}
