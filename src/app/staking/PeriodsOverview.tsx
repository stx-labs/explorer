'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { formatDateShort } from '@/common/utils/date-utils';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Box, Flex, Stack } from '@chakra-ui/react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { BondTooltip, BondTooltipData } from './BondTooltip';
import { BondsTable } from './BondsTable';
import { ViewAllLink } from './ViewAllLink';
import {
  BOND_GAP_CYCLES,
  DISTRIBUTIONS_PER_BOND,
  TIMELINE_BONDS_AFTER,
  TIMELINE_BONDS_BEFORE,
} from './consts';
import { Bond } from './data';
import {
  BondTimelineState,
  approximateBurnHeightAt,
  burnHeightToApproximateTimestamp,
  burnHeightToRewardCycle,
  formatTermDuration,
  getBarPosition,
  getBondLifecycleState,
  getBondSchedule,
  getBondTimelineState,
  getDistributionCadence,
  getTimelineBounds,
  getTimelineTicks,
} from './projections';
import { formatDateWithYear, getBondDisplayName, toBigInt } from './utils';

const ROW_LABEL_WIDTH = 20;

/**
 * A bond's term drawn as its 24 reward distributions.
 *
 * Fab's prototype colours bars by whether the bond is yours, which needs a
 * connected wallet. Here each bar is divided into the distributions it will
 * receive, so the fill shows how much of the term has actually paid out rather
 * than just how much time has passed.
 */
const SEGMENT_PAID_BG = 'accent.stacks-500';
const SEGMENT_REMAINING_BG = 'accent.stacks-300';

function Bar({
  state,
  distributionsPaid,
}: {
  state: BondTimelineState;
  distributionsPaid: number;
}) {
  // A bond that has not started has no distributions to divide, and its term is
  // an outline rather than a fill.
  if (state === 'upcoming') {
    return (
      <Box
        h={7}
        w="100%"
        borderRadius="redesign.xs"
        border="1px dashed"
        borderColor="neutral.sand-400"
      />
    );
  }
  return (
    <Flex h={7} w="100%" gap="1px" borderRadius="redesign.xs" overflow="hidden">
      {Array.from({ length: DISTRIBUTIONS_PER_BOND }, (_, index) => (
        <Box
          key={index}
          flex="1 1 0"
          bg={index < distributionsPaid ? SEGMENT_PAID_BG : SEGMENT_REMAINING_BG}
        />
      ))}
    </Flex>
  );
}

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
  /** Keeps the top row the same bond the Current bond section features. */
  featuredIndex?: number;
  /** Sats rewarded per bond, passed through to the table view. */
  rewardsByBond?: Record<number, bigint>;
  /** Bonds the cadence guarantees but the chain has not created yet. */
  scheduledBonds?: { index: number; activationHeight: number; termEndHeight: number }[];
  rewardCycleLength: number;
  prepareCycleLength: number;
  firstBurnchainBlockHeight: number;
  currentBurnHeight: number;
  nowMs: number;
}) {
  const [view, setView] = useState<'timeline' | 'table'>('timeline');
  const network = useGlobalContext().activeNetwork;

  // The cursor names the moment under it, so the axis never has to print more
  // dates than it can fit. Measured against the plot area rather than the row,
  // since the labels take a fixed strip on the left.
  const plotRef = useRef<HTMLDivElement>(null);
  const [hoverPercent, setHoverPercent] = useState<number>();
  const trackCursor = useCallback((event: React.MouseEvent) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    // A bond under the cursor has its own tooltip, so the flag stands down
    // rather than the two competing for the same spot.
    const overBar = (event.target as HTMLElement).closest?.('[data-bond-bar]') != null;
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    setHoverPercent(!overBar && percent >= 0 && percent <= 100 ? percent : undefined);
  }, []);
  const clearCursor = useCallback(() => setHoverPercent(undefined), []);
  const { rows, bounds, ticks, todayPercent } = useMemo(() => {
    // The featured bond leads, then the ones that follow it, so the timeline
    // and the Current bond section always agree on what "current" means.
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
    // The recent past leads into the current bond, so the timeline reads as a
    // sequence rather than starting at whatever happens to be running. The two
    // windows are counted separately, so widening the past never eats into the
    // bonds shown ahead.
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
          label: getBondDisplayName(bond),
          lockedSats: toBigInt(bond.balances?.locked?.btc),
          startMs: burnHeightToApproximateTimestamp(activationHeight, currentBurnHeight, nowMs),
          endMs: burnHeightToApproximateTimestamp(unlockHeight, currentBurnHeight, nowMs),
          state: getBondTimelineState(activationHeight, unlockHeight, currentBurnHeight),
          distributionsPaid: countDistributionsPaid(activationHeight),
          activationHeight,
          unlockHeight,
          tooltip: {
            label: getBondDisplayName(bond),
            state: getBondLifecycleState(schedule, currentBurnHeight, true),
            schedule,
            capacitySats: toBigInt(bond.parameters?.btc_capacity),
            lockedSats: toBigInt(bond.balances?.locked?.btc),
            rewardedSats: rewardsByBond?.[bond.index],
            targetRateBps: bond.parameters?.target_rate_bps,
          } satisfies BondTooltipData,
        };
      }),
      // Bonds the contract will create on its fixed cadence. Their timing is
      // arithmetic; their parameters are not knowable until the Endowment sets
      // them, so they carry no balances and read as not started.
      ...scheduledBonds
        .slice(0, Math.max(TIMELINE_BONDS_AFTER + 1 - forwardOnChain, 0))
        .map(scheduled => ({
          index: scheduled.index,
          label: `Bond ${scheduled.index}`,
          lockedSats: BigInt(0),
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
          activationHeight: scheduled.activationHeight,
          unlockHeight: scheduled.termEndHeight,
          tooltip: {
            label: `Bond ${scheduled.index}`,
            // A bond the contract has not created yet has no parameters to
            // report, so it always reads as scheduled.
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
    return {
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
    currentBurnHeight,
    nowMs,
  ]);

  if (rows.length === 0) return null;

  const todayLabel = new Date(nowMs).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  // When the next bond's terms become knowable. Offering and target rate are
  // set when enrollment opens, which the cadence fixes relative to its start.
  const nextBond = rows.find(row => row.state === 'upcoming');
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

  // What the cursor is over, named in the chain's own terms.
  const cursor = (() => {
    if (hoverPercent === undefined) return undefined;
    const span = bounds.endMs - bounds.startMs;
    if (span <= 0) return undefined;
    const atMs = bounds.startMs + (hoverPercent / 100) * span;
    const height = approximateBurnHeightAt(atMs, currentBurnHeight, nowMs);
    const cycle = burnHeightToRewardCycle(height, firstBurnchainBlockHeight, rewardCycleLength);
    // Heights the chain has passed are known; the rest are projected.
    const prefix = height > currentBurnHeight ? '~' : '';
    return {
      percent: hoverPercent,
      label: [
        cycle !== undefined ? `cycle ${cycle}` : undefined,
        `#${height.toLocaleString()}`,
        `${prefix}${formatDateWithYear(atMs)}`,
      ]
        .filter(Boolean)
        .join(' · '),
    };
  })();

  const statesShown = new Set(rows.map(row => row.state));
  // The legend's count describes the current bond, which the timeline shows
  // partway down now that earlier bonds lead into it.
  const featuredPaid = (
    rows.find(row => row.index === featuredIndex) ?? rows.find(row => row.state === 'active')
  )?.distributionsPaid;

  return (
    <Stack gap={3}>
      <Text textStyle="heading-xs">Period overview</Text>
      <Flex align="center" gap={4} flexWrap="wrap" justify="space-between">
        <Flex gap={2} align="center">
          <Text textStyle="text-regular-sm" color="textSecondary">
            View by:
          </Text>
          {(['timeline', 'table'] as const).map(option => (
            <Button
              key={option}
              type="button"
              variant="unstyled"
              size="big"
              px={3}
              py={1.5}
              height="auto"
              borderRadius="redesign.md"
              bg={view === option ? 'surfaceFifth' : undefined}
              color={view === option ? 'textPrimary' : 'textSecondary'}
              _hover={view === option ? undefined : { color: 'textPrimary' }}
              onClick={() => setView(option)}
              aria-pressed={view === option}
            >
              {option === 'timeline' ? 'Timeline' : 'Table'}
            </Button>
          ))}
        </Flex>
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
        <Stack
          gap={4}
          bg="surfaceSecondary"
          borderRadius="redesign.xl"
          px={[4, 6]}
          py={[4, 5]}
          overflowX="auto"
        >
          <Box minW="32rem">
            {/* Axis: labels above a rule, with a tick at each division. */}
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

            {/* Bars. The today marker sits in its own overlay that covers only
              the bar area, so it can be positioned as a plain percentage. */}
            <Box position="relative" pt={9} onMouseMove={trackCursor} onMouseLeave={clearCursor}>
              <Stack gap={2.5}>
                {rows.map(row => (
                  <Flex key={row.index} align="center">
                    <Box w={ROW_LABEL_WIDTH} flexShrink={0} pr={3}>
                      <Text textStyle="text-regular-sm" whiteSpace="nowrap">
                        {row.label}
                      </Text>
                    </Box>
                    <Box position="relative" flex={1} h={7}>
                      <Tooltip
                        variant="redesignPrimary"
                        size="lg"
                        portalled
                        content={
                          <BondTooltip
                            bond={row.tooltip}
                            rewardCycleLength={rewardCycleLength}
                            currentBurnHeight={currentBurnHeight}
                            nowMs={nowMs}
                          />
                        }
                      >
                        <Box
                          data-bond-bar="true"
                          position="absolute"
                          left={`${row.leftPercent}%`}
                          width={`${row.widthPercent}%`}
                          minW={1}
                        >
                          <Bar state={row.state} distributionsPaid={row.distributionsPaid} />
                        </Box>
                      </Tooltip>
                    </Box>
                  </Flex>
                ))}
              </Stack>
              <Flex position="absolute" inset={0} pointerEvents="none">
                <Box w={ROW_LABEL_WIDTH} flexShrink={0} pr={3} />
                <Box position="relative" flex={1} ref={plotRef}>
                  {cursor && (
                    <Box
                      position="absolute"
                      left={`${cursor.percent}%`}
                      top={0}
                      bottom={0}
                      borderLeft="1px solid"
                      borderColor="neutral.sand-400"
                      // The flag follows the pointer, so it sits above the
                      // fixed today marker when the two meet.
                      zIndex={1}
                    >
                      <Box
                        position="absolute"
                        top={1}
                        left={0}
                        transform="translateX(-50%)"
                        bg="surfaceInvert"
                        borderRadius="redesign.xs"
                        px={2}
                        py={0.5}
                      >
                        <Text
                          textStyle="text-mono-xs"
                          // Pairs with surfaceInvert, so both flip together
                          // rather than the text staying light on a light chip.
                          color="textInvert"
                          whiteSpace="nowrap"
                          suppressHydrationWarning
                        >
                          {cursor.label}
                        </Text>
                      </Box>
                    </Box>
                  )}
                  <Box
                    position="absolute"
                    left={`${todayPercent}%`}
                    top={0}
                    bottom={0}
                    borderLeft="1px dashed"
                    borderColor="redesignBorderSecondary"
                  >
                    <Box
                      position="absolute"
                      top={1}
                      left={0}
                      transform="translateX(-50%)"
                      bg="surfaceFourth"
                      border="1px solid"
                      borderColor="redesignBorderSecondary"
                      borderRadius="redesign.xs"
                      px={2}
                      py={0.5}
                    >
                      <Text textStyle="text-mono-xs" color="textSecondary" whiteSpace="nowrap">
                        today · {todayLabel}
                      </Text>
                    </Box>
                  </Box>
                </Box>
              </Flex>
            </Box>
          </Box>

          <Flex gap={5} flexWrap="wrap" pl={ROW_LABEL_WIDTH}>
            {featuredPaid !== undefined && (
              <LegendKey
                swatch={<Swatch bg={SEGMENT_PAID_BG} />}
                label={`${featuredPaid}/${DISTRIBUTIONS_PER_BOND} reward distributions completed`}
              />
            )}
            <LegendKey swatch={<Swatch bg={SEGMENT_REMAINING_BG} />} label="Term remaining" />
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
      <Flex justify="flex-end">
        <ViewAllLink href={buildUrl('/staking/bonds', network)}>View all bonds</ViewAllLink>
      </Flex>
    </Stack>
  );
}
