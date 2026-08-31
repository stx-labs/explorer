'use client';

import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Box, Flex, Stack } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

import { BondsTable } from './BondsTable';
import { DISTRIBUTIONS_PER_BOND, TIMELINE_BOND_LIMIT } from './consts';
import { Bond } from './data';
import {
  BondTimelineState,
  burnHeightToApproximateTimestamp,
  getBarPosition,
  getBondTimelineState,
  getDistributionCadence,
  getTimelineBounds,
  getTimelineTicks,
} from './projections';
import { formatBtc, getBondDisplayName, toBigInt } from './utils';

const ROW_LABEL_WIDTH = 20;

/**
 * A bond's term drawn as its 24 reward distributions.
 *
 * Fab's prototype colours bars by whether the bond is yours, which needs a
 * connected wallet. Here each bar is divided into the distributions it will
 * receive, so the fill shows how much of the term has actually paid out rather
 * than just how much time has passed.
 */
const STATE_LABELS: Record<BondTimelineState, string> = {
  active: 'Active',
  complete: 'Complete',
  upcoming: 'Scheduled',
};

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
  bondsTotal,
  featuredIndex,
  scheduledBonds = [],
  rewardCycleLength,
  currentBurnHeight,
  nowMs,
}: {
  bonds: Bond[];
  bondsTotal: number;
  /** Keeps the top row the same bond the Current bond section features. */
  featuredIndex?: number;
  /** Bonds the cadence guarantees but the chain has not created yet. */
  scheduledBonds?: { index: number; activationHeight: number; termEndHeight: number }[];
  rewardCycleLength: number;
  currentBurnHeight: number;
  nowMs: number;
}) {
  const [view, setView] = useState<'timeline' | 'table'>('timeline');
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
    const from = featuredPosition >= 0 ? featuredPosition : Math.max(fallback, 0);
    const onChain = byIndex.slice(from, from + TIMELINE_BOND_LIMIT);

    const bars = [
      ...onChain.map(bond => {
        const activationHeight = bond.schedule?.activation?.bitcoin_height ?? 0;
        const unlockHeight = bond.schedule?.unlock?.bitcoin_height ?? 0;
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
        };
      }),
      // Bonds the contract will create on its fixed cadence. Their timing is
      // arithmetic; their parameters are not knowable until the Endowment sets
      // them, so they carry no balances and read as not started.
      ...scheduledBonds
        .slice(0, Math.max(TIMELINE_BOND_LIMIT - onChain.length, 0))
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
  }, [bonds, featuredIndex, scheduledBonds, rewardCycleLength, currentBurnHeight, nowMs]);

  if (rows.length === 0) return null;

  const todayLabel = new Date(nowMs).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const statesShown = new Set(rows.map(row => row.state));
  // The legend's count describes the bond the page leads with.
  const featuredPaid = rows.find(row => row.state !== 'upcoming')?.distributionsPaid;
  const hiddenCount = bondsTotal - rows.length;

  return (
    <Stack gap={3}>
      <Flex align="center" gap={4} flexWrap="wrap" justify="space-between">
        <Flex align="baseline" gap={2} flexWrap="wrap">
          <Text textStyle="heading-xs">Period overview</Text>
          {hiddenCount > 0 && (
            <Text textStyle="text-regular-xs" color="textSecondary">
              Current bond and the next {rows.length - 1} · {bondsTotal} in total
            </Text>
          )}
        </Flex>
        <Flex gap={2} align="center">
          <Text textStyle="text-regular-sm" color="textSecondary">
            View by
          </Text>
          {(['timeline', 'table'] as const).map(option => (
            <Button
              key={option}
              type="button"
              variant={view === option ? 'redesignPrimary' : 'unstyled'}
              size="big"
              px={3}
              py={1.5}
              height="auto"
              borderRadius="redesign.md"
              color={view === option ? undefined : 'textSecondary'}
              _hover={view === option ? undefined : { color: 'textPrimary' }}
              onClick={() => setView(option)}
              aria-pressed={view === option}
            >
              {option === 'timeline' ? 'Timeline' : 'Table'}
            </Button>
          ))}
        </Flex>
      </Flex>
      {view === 'table' ? (
        <BondsTable bonds={bonds} currentBurnHeight={currentBurnHeight} nowMs={nowMs} />
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
            <Box position="relative" pt={9}>
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
                        content={`${row.label} · ${STATE_LABELS[row.state]} · #${row.activationHeight.toLocaleString()} to #${row.unlockHeight.toLocaleString()}${
                          row.state === 'upcoming'
                            ? ''
                            : ` · ${row.distributionsPaid}/${DISTRIBUTIONS_PER_BOND} paid · ${formatBtc(row.lockedSats)} bonded`
                        }`}
                      >
                        <Box
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
                <Box position="relative" flex={1}>
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
    </Stack>
  );
}
