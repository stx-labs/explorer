'use client';

import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Box, Flex, Stack } from '@chakra-ui/react';
import { useMemo } from 'react';

import { TIMELINE_BOND_LIMIT } from './consts';
import { Bond } from './data';
import {
  BondTimelineState,
  burnHeightToApproximateTimestamp,
  getBarPosition,
  getBondTimelineState,
  getTimelineBounds,
  getTimelineTicks,
} from './projections';
import { formatBtc, getBondDisplayName, toBigInt } from './utils';

const ROW_LABEL_WIDTH = 20;

/**
 * Fab's prototype colours these bars by whether the bond is yours. The Explorer
 * has no connected wallet, so we colour by what the bond is doing instead:
 * running now, already finished, or not started yet.
 */
const BAR_STYLES: Record<BondTimelineState, { bg: string; label: string }> = {
  active: { bg: 'accent.bitcoin-500', label: 'Active' },
  complete: { bg: 'neutral.sand-400', label: 'Complete' },
  upcoming: { bg: 'transparent', label: 'Not started yet' },
};

/** Diagonal stripes, used for bonds that have not started. */
const HATCH_FILL =
  'repeating-linear-gradient(45deg, transparent, transparent 3px, var(--stacks-colors-neutral-sand-400) 3px, var(--stacks-colors-neutral-sand-400) 5px)';

function Bar({ state }: { state: BondTimelineState }) {
  const isUpcoming = state === 'upcoming';
  return (
    <Box
      h={7}
      w="100%"
      borderRadius="redesign.xs"
      bg={isUpcoming ? undefined : BAR_STYLES[state].bg}
      backgroundImage={isUpcoming ? HATCH_FILL : undefined}
      border={isUpcoming ? '1px solid' : undefined}
      borderColor={isUpcoming ? 'redesignBorderSecondary' : undefined}
    />
  );
}

function LegendKey({ state }: { state: BondTimelineState }) {
  const isUpcoming = state === 'upcoming';
  return (
    <Flex align="center" gap={1.5}>
      <Box
        w={3}
        h={3}
        borderRadius="redesign.xs"
        bg={isUpcoming ? undefined : BAR_STYLES[state].bg}
        backgroundImage={isUpcoming ? HATCH_FILL : undefined}
        border={isUpcoming ? '1px solid' : undefined}
        borderColor={isUpcoming ? 'redesignBorderSecondary' : undefined}
      />
      <Text textStyle="text-regular-xs" color="textSecondary" whiteSpace="nowrap">
        {BAR_STYLES[state].label}
      </Text>
    </Flex>
  );
}

export function PeriodsOverview({
  bonds,
  bondsTotal,
  currentBurnHeight,
  nowMs,
}: {
  bonds: Bond[];
  bondsTotal: number;
  currentBurnHeight: number;
  nowMs: number;
}) {
  const { rows, bounds, ticks, todayPercent } = useMemo(() => {
    // Newest bond at the top, reading down into older ones. A long chain of
    // finished bonds adds height without telling anyone anything, so only the
    // most recent are kept.
    const ordered = [...bonds].sort((a, b) => b.index - a.index).slice(0, TIMELINE_BOND_LIMIT);

    const bars = ordered.map(bond => {
      const activationHeight = bond.schedule?.activation?.bitcoin_height ?? 0;
      const unlockHeight = bond.schedule?.unlock?.bitcoin_height ?? 0;
      return {
        index: bond.index,
        label: getBondDisplayName(bond),
        lockedSats: toBigInt(bond.balances?.locked?.btc),
        startMs: burnHeightToApproximateTimestamp(activationHeight, currentBurnHeight, nowMs),
        endMs: burnHeightToApproximateTimestamp(unlockHeight, currentBurnHeight, nowMs),
        state: getBondTimelineState(activationHeight, unlockHeight, currentBurnHeight),
        activationHeight,
        unlockHeight,
      };
    });

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
  }, [bonds, currentBurnHeight, nowMs]);

  if (rows.length === 0) return null;

  const todayLabel = new Date(nowMs).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const statesShown = new Set(rows.map(row => row.state));
  const hiddenCount = bondsTotal - rows.length;

  return (
    <Stack gap={3}>
      <Flex align="baseline" gap={2} flexWrap="wrap">
        <Text textStyle="heading-xs">Periods overview</Text>
        {hiddenCount > 0 && (
          <Text textStyle="text-regular-xs" color="textSecondary">
            Most recent {rows.length} of {bondsTotal} bonds
          </Text>
        )}
      </Flex>
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
                      content={`${row.label} · ${BAR_STYLES[row.state].label} · #${row.activationHeight.toLocaleString()} to #${row.unlockHeight.toLocaleString()}${
                        row.state === 'upcoming' ? '' : ` · ${formatBtc(row.lockedSats)} bonded`
                      }`}
                    >
                      <Box
                        position="absolute"
                        left={`${row.leftPercent}%`}
                        width={`${row.widthPercent}%`}
                        minW={1}
                      >
                        <Bar state={row.state} />
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

        <Flex gap={4} flexWrap="wrap" pl={ROW_LABEL_WIDTH}>
          {(['active', 'complete', 'upcoming'] as BondTimelineState[])
            .filter(state => statesShown.has(state))
            .map(state => (
              <LegendKey key={state} state={state} />
            ))}
          <Flex align="center" gap={1.5}>
            <Box w={3} borderTop="1px dashed" borderColor="redesignBorderSecondary" />
            <Text textStyle="text-regular-xs" color="textSecondary">
              Today
            </Text>
          </Flex>
        </Flex>
      </Stack>
    </Stack>
  );
}
