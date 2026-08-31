'use client';

import { formatDateShort } from '@/common/utils/date-utils';
import { Text } from '@/ui/Text';
import { Badge, Box, Flex, Stack } from '@chakra-ui/react';

import { ViewAllLink } from './ViewAllLink';
import { Bond } from './data';
import {
  BondLifecycleState,
  burnHeightToApproximateTimestamp,
  getBondFillRatio,
  getBondLifecycleState,
  getBondProgress,
  getBondSchedule,
  getDistributionCadence,
} from './projections';
import {
  formatBtc,
  formatPercent,
  getBondDisplayName,
  getBondOfferingSats,
  toBigInt,
} from './utils';

const STATE_STYLES: Record<BondLifecycleState, { label: string; palette: string }> = {
  scheduled: { label: 'Scheduled', palette: 'gray' },
  enrolling: { label: 'Enrolling', palette: 'orange' },
  active: { label: 'Active', palette: 'green' },
  maturity: { label: 'Maturity', palette: 'gray' },
  closed: { label: 'Closed', palette: 'gray' },
};

function Meter({ ratio }: { ratio: number }) {
  return (
    <Box bg="surfaceFifth" h={2} w="100%" borderRadius="redesign.xl" overflow="hidden">
      <Box bg="accent.stacks-500" h="100%" w={`${Math.min(Math.max(ratio, 0), 1) * 100}%`} />
    </Box>
  );
}

interface Milestone {
  label: string;
  height: number;
  timestamp: number;
  /** Passed milestones show a real date; future ones are projections. */
  isPast: boolean;
  isCurrent?: boolean;
}

function LifecycleRow({ milestone }: { milestone: Milestone }) {
  const { label, height, timestamp, isPast, isCurrent } = milestone;
  return (
    <Flex justify="space-between" gap={3} align="center" flexWrap="wrap">
      <Flex gap={3} align="center" minW="12rem">
        <Box
          w={2}
          h={2}
          borderRadius="full"
          flexShrink={0}
          bg={isCurrent ? 'accent.stacks-500' : isPast ? 'feedback.green-500' : 'transparent'}
          border={isPast || isCurrent ? undefined : '1px solid'}
          borderColor="redesignBorderSecondary"
        />
        <Text textStyle={isPast || isCurrent ? 'text-medium-sm' : 'text-regular-sm'}>{label}</Text>
      </Flex>
      <Flex gap={6} align="baseline">
        <Text textStyle="text-mono-xs" color={isPast ? 'accent.stacks-500' : 'textSecondary'}>
          #{height.toLocaleString()}
        </Text>
        <Text
          textStyle="text-regular-sm"
          color={isPast ? 'textPrimary' : 'accent.stacks-500'}
          minW="7rem"
          textAlign="right"
          suppressHydrationWarning
        >
          {/* Past dates are facts; future ones are projected, so they carry a ~. */}
          {isPast ? formatDateShort(timestamp) : `~${formatDateShort(timestamp)}`}
        </Text>
      </Flex>
    </Flex>
  );
}

export function CurrentBond({
  bonds,
  featuredBond,
  nextBond,
  rewardCycleLength,
  prepareCycleLength,
  firstBurnchainBlockHeight,
  currentBurnHeight,
  nowMs,
}: {
  bonds: Bond[];
  featuredBond?: Bond;
  /** The bond after the featured one, on chain or projected. */
  nextBond?: { index: number; activationHeight: number; termEndHeight: number };
  rewardCycleLength: number;
  prepareCycleLength: number;
  firstBurnchainBlockHeight: number;
  currentBurnHeight: number;
  nowMs: number;
}) {
  if (!featuredBond) return null;

  const activationHeight = featuredBond.schedule?.activation?.bitcoin_height ?? 0;
  const termEndHeight = featuredBond.schedule?.unlock?.bitcoin_height ?? 0;
  const schedule = getBondSchedule(
    activationHeight,
    termEndHeight,
    rewardCycleLength,
    prepareCycleLength
  );
  const state = getBondLifecycleState(schedule, currentBurnHeight, true);
  const progress = getBondProgress(schedule, currentBurnHeight, rewardCycleLength);
  // A bond's own distributions, counted from D0 rather than read off the
  // chain-wide grid. The two agree, because a bond activates on a grid
  // boundary, but counting from D0 is what makes "3 of 24" meaningful and
  // keeps a not-yet-started bond from showing a distribution behind it.
  const cadence = getDistributionCadence(rewardCycleLength);
  const distributionHeight = (n: number) => schedule.activationHeight + n * cadence;

  const lockedSats = toBigInt(featuredBond.balances?.locked?.btc);
  const offering = getBondOfferingSats(featuredBond);
  const fill = getBondFillRatio(lockedSats, offering.sats);

  const at = (height: number) => burnHeightToApproximateTimestamp(height, currentBurnHeight, nowMs);
  const past = (height: number) => currentBurnHeight >= height;

  const milestones: Milestone[] = [
    { label: 'Enrollment opened', height: schedule.enrollmentOpensHeight },
    { label: 'Enrollment closed', height: schedule.enrollmentClosesHeight },
    { label: 'Bond started · D0', height: schedule.activationHeight },
    // Only a bond that has been paid has a latest distribution to show.
    ...(progress.paid > 0
      ? [
          {
            label: `Latest distribution · ${progress.paid} of ${progress.total}`,
            height: distributionHeight(progress.paid),
            isCurrent: true,
          },
        ]
      : []),
    ...(progress.paid < progress.total
      ? [
          {
            label: `Next distribution · ${progress.paid + 1} of ${progress.total}`,
            height: distributionHeight(progress.paid + 1),
          },
        ]
      : []),
    { label: 'STX unlocks · L1', height: schedule.stxUnlockHeight },
    { label: 'Term ends', height: schedule.termEndHeight },
  ]
    .map(m => ({
      ...m,
      timestamp: at(m.height),
      isPast: past(m.height) && !m.isCurrent,
      isCurrent: !!m.isCurrent && past(m.height),
    }))
    // Read top to bottom in the order the bond actually lives them.
    .sort((a, b) => a.height - b.height);

  const cycleRange = `cycles ${featuredBond.schedule?.activation?.pox_cycle ?? '?'}–${
    (featuredBond.schedule?.unlock?.pox_cycle ?? 1) - 1
  }`;

  return (
    <Stack gap={3}>
      <Text textStyle="heading-md">Current bond</Text>
      <Flex
        gap={[3, 4]}
        p={[3, 4]}
        bg="surfaceSecondary"
        borderRadius="redesign.xl"
        flexDirection={{ base: 'column', lg: 'row' }}
      >
        <Stack gap={5} flex={1} p={[3, 4]}>
          <Stack gap={2}>
            <Flex gap={3} align="center" flexWrap="wrap">
              <Text textStyle="heading-lg">{getBondDisplayName(featuredBond)}</Text>
              <Badge variant="subtle" colorPalette={STATE_STYLES[state].palette}>
                {STATE_STYLES[state].label}
              </Badge>
            </Flex>
            <Text textStyle="text-regular-sm" color="textSecondary">
              Bond {featuredBond.index} · {cycleRange} ·{' '}
              {(termEndHeight - activationHeight).toLocaleString()} blocks
            </Text>
          </Stack>

          <Stack gap={2}>
            <Flex justify="space-between" gap={3}>
              <Text textStyle="text-medium-sm">
                Day {progress.dayOfTerm} of {progress.termDays}
              </Text>
              <Text textStyle="text-regular-sm" color="textSecondary">
                {(progress.elapsedRatio * 100).toFixed(1)}% elapsed
              </Text>
            </Flex>
            <Meter ratio={progress.elapsedRatio} />
            <Flex justify="space-between" gap={3}>
              <Text textStyle="text-mono-xs" color="textSecondary">
                #{activationHeight.toLocaleString()}
              </Text>
              <Text textStyle="text-mono-xs" color="textSecondary">
                #{termEndHeight.toLocaleString()}
              </Text>
            </Flex>
          </Stack>

          <Stack gap={2}>
            <Flex justify="space-between" gap={3} flexWrap="wrap">
              <Text textStyle="text-medium-sm">
                {offering.isOffering ? 'Bonded of offering' : 'Bonded of capacity'}
              </Text>
              <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
                {formatBtc(lockedSats, 1).replace(' BTC', '')} / {formatBtc(offering.sats, 0)} ·{' '}
                {formatPercent(fill, 0)}
              </Text>
            </Flex>
            <Meter ratio={fill ?? 0} />
            <Text textStyle="text-regular-xs" color="textSecondary">
              {offering.isOffering
                ? 'Offering is set by the Stacks Endowment'
                : 'Showing on-chain capacity; no offering figure is published for this bond'}
            </Text>
          </Stack>

          {nextBond && (
            <Stack gap={1} pt={2} borderTop="1px solid" borderColor="redesignBorderSecondary">
              <Flex gap={2} align="center">
                <Box w={2} h={2} borderRadius="full" bg="accent.stacks-500" />
                <Text textStyle="text-medium-sm" suppressHydrationWarning>
                  Next bond starts ~{formatDateShort(at(nextBond.activationHeight))}
                </Text>
              </Flex>
              <Text textStyle="text-regular-xs" color="textSecondary">
                Bond {nextBond.index} · term #{nextBond.activationHeight.toLocaleString()} &rarr; #
                {nextBond.termEndHeight.toLocaleString()}
              </Text>
            </Stack>
          )}
        </Stack>

        <Stack gap={4} flex={1} bg="surfaceFourth" borderRadius="redesign.lg" p={[4, 5]}>
          <Flex justify="space-between" gap={3} align="baseline" flexWrap="wrap">
            <Text textStyle="heading-xs">Lifecycle</Text>
            {/* TODO: needs a transactions page filtered to this bond. */}
            <ViewAllLink>View all bond transactions</ViewAllLink>
          </Flex>
          <Stack gap={3.5}>
            {milestones.map(milestone => (
              <LifecycleRow key={milestone.label} milestone={milestone} />
            ))}
          </Stack>
        </Stack>
      </Flex>
    </Stack>
  );
}
