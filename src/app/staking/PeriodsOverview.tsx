'use client';

import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { formatDateShort } from '@/common/utils/date-utils';
import { ButtonLink } from '@/ui/ButtonLink';
import { TabsLabel, TabsList, TabsRoot, TabsTrigger } from '@/ui/Tabs';
import { Text } from '@/ui/Text';
import { Box, Flex, Stack } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

import type { BondTooltipData } from './BondTooltip';
import { BondsTable } from './BondsTable';
import {
  ROW_LABEL_WIDTH,
  SEGMENT_PAID_BG,
  SEGMENT_REMAINING_BG,
  TimelinePlot,
} from './TimelinePlot';
import {
  BOND_GAP_CYCLES,
  DISTRIBUTIONS_PER_BOND,
  TIMELINE_BONDS_AFTER,
  TIMELINE_BONDS_BEFORE,
} from './consts';
import type { Bond } from './data';
import {
  burnHeightToApproximateTimestamp,
  formatTermDuration,
  getBarPosition,
  getBondLifecycleState,
  getBondSchedule,
  getBondTimelineState,
  getDistributionCadence,
  getDistributionGridCells,
  getTimelineBounds,
  getTimelineTicks,
} from './projections';
import { bondLabel, toBigInt } from './utils';

function LegendKey({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <Flex align="center" gap={1.5}>
      {swatch}
      <Text textStyle="text-regular-xs" color="textSecondary" whiteSpace="nowrap">
        {label}
      </Text>
    </Flex>
  );
}

function Swatch({ bg, dashed }: { bg?: string; dashed?: boolean }) {
  return (
    <Box
      w={4}
      h={3}
      borderRadius="redesign.xs"
      bg={bg}
      border={dashed ? '1px dashed' : undefined}
      borderColor={dashed ? 'neutral.sand-400' : undefined}
    />
  );
}

export function PeriodsOverview({
  bonds,
  featuredIndex,
  rewardsByBond,
  scheduledBonds = [],
  rewardCycleLength,
  prepareCycleLength,
  firstBurnchainBlockHeight,
  currentBurnHeight,
  nowMs,
}: {
  bonds: Bond[];
  featuredIndex?: number;
  rewardsByBond?: Record<number, bigint>;
  scheduledBonds?: { index: number; activationHeight: number; termEndHeight: number }[];
  rewardCycleLength: number;
  prepareCycleLength: number;
  firstBurnchainBlockHeight: number;
  currentBurnHeight: number;
  nowMs: number;
}) {
  const [view, setView] = useState<'timeline' | 'table'>('timeline');
  const network = useGlobalContext().activeNetwork;
  const viewAllHref = buildUrl('/staking/bonds', network);

  const { rows, bounds, ticks, todayPercent, cells } = useMemo(() => {
    const cadence = getDistributionCadence(rewardCycleLength);
    const countDistributionsPaid = (activationHeight: number) =>
      cadence > 0
        ? Math.min(
            Math.max(Math.floor((currentBurnHeight - activationHeight) / cadence), 0),
            DISTRIBUTIONS_PER_BOND
          )
        : 0;

    const byIndex = [...bonds].sort((a, b) => a.index - b.index);
    const featuredPosition = byIndex.findIndex(bond => bond.index === featuredIndex);
    const fallback = byIndex.findIndex(
      bond => (bond.schedule?.unlock?.bitcoin_height ?? 0) > currentBurnHeight
    );
    const current = featuredPosition >= 0 ? featuredPosition : Math.max(fallback, 0);
    const from = Math.max(current - TIMELINE_BONDS_BEFORE, 0);
    const onChain = byIndex.slice(from, current + TIMELINE_BONDS_AFTER + 1);
    const forwardOnChain = onChain.length - (current - from);

    const bars = [
      ...onChain.map(bond => {
        const activationHeight = bond.schedule?.activation?.bitcoin_height ?? 0;
        const unlockHeight = bond.schedule?.unlock?.bitcoin_height ?? 0;
        const schedule = getBondSchedule(
          activationHeight,
          unlockHeight,
          rewardCycleLength,
          prepareCycleLength
        );
        return {
          index: bond.index,
          label: bondLabel(bond.index),
          startMs: burnHeightToApproximateTimestamp(activationHeight, currentBurnHeight, nowMs),
          endMs: burnHeightToApproximateTimestamp(unlockHeight, currentBurnHeight, nowMs),
          state: getBondTimelineState(activationHeight, unlockHeight, currentBurnHeight),
          distributionsPaid: countDistributionsPaid(activationHeight),
          tooltip: {
            label: bondLabel(bond.index),
            state: getBondLifecycleState(schedule, currentBurnHeight, true),
            schedule,
            capacitySats: toBigInt(bond.parameters?.btc_capacity),
            lockedSats: toBigInt(bond.balances?.locked?.btc),
            rewardedSats: rewardsByBond?.[bond.index],
            targetRateBps: bond.parameters?.target_rate_bps,
          } satisfies BondTooltipData,
        };
      }),
      ...scheduledBonds
        .slice(0, Math.max(TIMELINE_BONDS_AFTER + 1 - forwardOnChain, 0))
        .map(scheduled => ({
          index: scheduled.index,
          label: bondLabel(scheduled.index),
          startMs: burnHeightToApproximateTimestamp(
            scheduled.activationHeight,
            currentBurnHeight,
            nowMs
          ),
          endMs: burnHeightToApproximateTimestamp(
            scheduled.termEndHeight,
            currentBurnHeight,
            nowMs
          ),
          state: 'upcoming' as const,
          distributionsPaid: 0,
          tooltip: {
            label: bondLabel(scheduled.index),
            state: 'scheduled' as const,
            schedule: getBondSchedule(
              scheduled.activationHeight,
              scheduled.termEndHeight,
              rewardCycleLength,
              prepareCycleLength
            ),
            lockedSats: BigInt(0),
            rewardedSats: BigInt(0),
          } satisfies BondTooltipData,
        })),
    ];

    const timelineBounds = getTimelineBounds(bars, nowMs);
    const span = timelineBounds.endMs - timelineBounds.startMs;

    const gridCells = getDistributionGridCells({
      startMs: timelineBounds.startMs,
      endMs: timelineBounds.endMs,
      cadence,
      firstBurnchainBlockHeight,
      currentBurnHeight,
      nowMs,
    });

    return {
      cells: gridCells,
      rows: bars.map(bar => ({
        ...bar,
        ...getBarPosition(bar.startMs, bar.endMs, timelineBounds.startMs, timelineBounds.endMs),
      })),
      bounds: timelineBounds,
      ticks: getTimelineTicks(
        timelineBounds.startMs,
        timelineBounds.endMs,
        timelineBounds.granularity
      ),
      todayPercent: span > 0 ? ((nowMs - timelineBounds.startMs) / span) * 100 : 0,
    };
  }, [
    bonds,
    featuredIndex,
    rewardsByBond,
    scheduledBonds,
    rewardCycleLength,
    prepareCycleLength,
    firstBurnchainBlockHeight,
    currentBurnHeight,
    nowMs,
  ]);

  if (rows.length === 0) return null;

  const nextBond = rows.find(row => row.tooltip.state === 'scheduled');
  const leadTime = formatTermDuration(BOND_GAP_CYCLES * rewardCycleLength);
  const nextBondNote =
    nextBond && leadTime
      ? `Next bond's offering & target rate drop ~${leadTime} before start · ${nextBond.label} details expected ~${formatDateShort(
          burnHeightToApproximateTimestamp(
            nextBond.tooltip.schedule.enrollmentOpensHeight,
            currentBurnHeight,
            nowMs
          )
        )}`
      : undefined;

  const statesShown = new Set(rows.map(row => row.state));
  return (
    <Stack gap={4}>
      <Flex justify="space-between" align="center" gap={4}>
        <Text textStyle="heading-xs">Period overview</Text>
        <ButtonLink
          href={viewAllHref}
          buttonLinkSize="big"
          display={{ base: 'none', md: 'inline' }}
        >
          View all bonds
        </ButtonLink>
      </Flex>
      <Flex align="center" gap={4} flexWrap="wrap" justify="space-between">
        <TabsRoot
          variant="primary"
          size="redesignMd"
          value={view}
          onValueChange={({ value }) => setView(value as 'timeline' | 'table')}
          aria-label="Period overview view options"
        >
          <Flex align="center" gap={0}>
            <TabsLabel as="span" id="period-overview-view-label" whiteSpace="nowrap">
              View by:
            </TabsLabel>
            <TabsList aria-labelledby="period-overview-view-label">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Flex>
        </TabsRoot>
        {nextBondNote && (
          <Text textStyle="text-regular-xs" color="textSecondary">
            {nextBondNote}
          </Text>
        )}
      </Flex>
      {view === 'table' ? (
        <BondsTable
          bonds={bonds}
          currentBurnHeight={currentBurnHeight}
          nowMs={nowMs}
          rewardsByBond={rewardsByBond}
          rewardCycleLength={rewardCycleLength}
        />
      ) : (
        <Stack gap={4} bg="surfaceSecondary" borderRadius="redesign.xl" px={[4, 6]} py={[4, 5]}>
          <ScrollIndicator>
            <Box minW="32rem">
              <Flex>
                <Box w={ROW_LABEL_WIDTH} flexShrink={0} />
                <Box position="relative" flex={1} h={8}>
                  {ticks.map(tick => (
                    <Flex
                      key={`${tick.year}-${tick.label}`}
                      position="absolute"
                      left={`${tick.leftPercent}%`}
                      top={0}
                      gap={1}
                      align="baseline"
                      pl={1.5}
                    >
                      <Text textStyle="text-mono-xs" color="textSecondary" whiteSpace="nowrap">
                        {tick.label}
                      </Text>
                      {tick.isYearStart && (
                        <Text textStyle="text-mono-xs" color="textTertiary">
                          &apos;{`${tick.year}`.slice(2)}
                        </Text>
                      )}
                    </Flex>
                  ))}
                  <Box
                    position="absolute"
                    left={0}
                    right={0}
                    bottom={0}
                    borderBottom="1px solid"
                    borderColor="redesignBorderSecondary"
                  />
                  {ticks.map(tick => (
                    <Box
                      key={`tick-${tick.year}-${tick.label}`}
                      position="absolute"
                      left={`${tick.leftPercent}%`}
                      bottom={0}
                      h={2}
                      borderLeft="1px solid"
                      borderColor="redesignBorderSecondary"
                    />
                  ))}
                </Box>
              </Flex>

              <TimelinePlot
                rows={rows}
                cells={cells}
                bounds={bounds}
                todayPercent={todayPercent}
                currentBurnHeight={currentBurnHeight}
                nowMs={nowMs}
                rewardCycleLength={rewardCycleLength}
                firstBurnchainBlockHeight={firstBurnchainBlockHeight}
              />
            </Box>
          </ScrollIndicator>

          <Flex gap={5} flexWrap="wrap" pl={{ base: 0, md: ROW_LABEL_WIDTH }}>
            <LegendKey
              swatch={<Swatch bg={SEGMENT_PAID_BG} />}
              label="Completed reward distribution"
            />
            <LegendKey
              swatch={<Swatch bg={SEGMENT_REMAINING_BG} />}
              label="Upcoming reward distribution"
            />
            <LegendKey
              swatch={
                <Box w={4} h={3} borderRadius="redesign.xs" bg="surfaceFifth" opacity={0.3} />
              }
              label="One reward distribution"
            />
            {statesShown.has('upcoming') && (
              <LegendKey swatch={<Swatch dashed />} label="Scheduled · not yet started" />
            )}
            <LegendKey
              swatch={<Box w={4} borderTop="1px dashed" borderColor="neutral.sand-400" />}
              label="Today"
            />
          </Flex>
        </Stack>
      )}
      <ButtonLink href={viewAllHref} buttonLinkSize="big" display={{ base: 'inline', md: 'none' }}>
        View all bonds
      </ButtonLink>
    </Stack>
  );
}
