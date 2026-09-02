'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { formatDateShort } from '@/common/utils/date-utils';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Badge, Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';

import { STATE_BADGES } from './BondTooltip';
import { ViewAllLink } from './ViewAllLink';
import { Bond, EnrollmentShare } from './data';
import {
  BondLifecycleState,
  burnHeightToApproximateTimestamp,
  getBondFillRatio,
  getBondLifecycleState,
  getBondProgress,
  getBondSchedule,
  getDistributionCadence,
} from './projections';
import { formatBtc, formatDateWithYear, getBondDisplayName, toBigInt } from './utils';

/** Term progress and the enrollment breakdown read as one pair of bars. */
const BAR_HEIGHT = 2.5;

const STATE_LABELS: Record<BondLifecycleState, string> = {
  scheduled: 'Scheduled',
  enrolling: 'Enrolling',
  active: 'Active',
  maturity: 'Maturity',
  closed: 'Closed',
};

/**
 * One segment per confirmed enrollment, sized by its share of the total.
 *
 * Shades alternate so neighbouring enrollments stay distinguishable without
 * implying any ranking between them.
 */
function EnrollmentBar({
  enrollments,
  totalSats,
}: {
  enrollments: EnrollmentShare[];
  totalSats: bigint;
}) {
  if (totalSats <= BigInt(0) || enrollments.length === 0) {
    return <Box bg="surfaceFifth" h={BAR_HEIGHT} w="100%" borderRadius="redesign.xl" />;
  }
  return (
    <Flex h={BAR_HEIGHT} w="100%" borderRadius="redesign.xl" overflow="hidden" gap="1px">
      {enrollments.map((enrollment, index) => {
        const sats = toBigInt(enrollment.btc);
        const share = Number(sats) / Number(totalSats);
        return (
          <Tooltip
            key={index}
            variant="redesignPrimary"
            size="lg"
            portalled
            // The breakdown is about proportions, not participants, so a
            // segment names its size rather than whose it is.
            content={`${formatBtc(sats)} · ${(share * 100).toFixed(1)}% of confirmed`}
          >
            <Box
              flexBasis={`${share * 100}%`}
              flexShrink={0}
              bg={index % 2 === 0 ? 'accent.stacks-400' : 'accent.stacks-200'}
            />
          </Tooltip>
        );
      })}
    </Flex>
  );
}

function Meter({ ratio }: { ratio: number }) {
  return (
    <Box bg="surfaceFifth" h={BAR_HEIGHT} w="100%" borderRadius="redesign.xl" overflow="hidden">
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
  enrollments,
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
  /** Confirmed enrollments in the featured bond, one segment each. */
  enrollments: EnrollmentShare[];
  rewardCycleLength: number;
  prepareCycleLength: number;
  firstBurnchainBlockHeight: number;
  currentBurnHeight: number;
  nowMs: number;
}) {
  const network = useGlobalContext().activeNetwork;
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
  // A bond's own distributions, counted from Day 0 rather than read off the
  // chain-wide grid. The two agree, because a bond activates on a grid
  // boundary, but counting from Day 0 is what makes "3 of 24" meaningful and
  // keeps a not-yet-started bond from showing a distribution behind it.
  const cadence = getDistributionCadence(rewardCycleLength);
  const distributionHeight = (n: number) => schedule.activationHeight + n * cadence;

  // The total is the sum of what has actually been confirmed on chain, not a
  // capacity the bond was sized against.
  const enrolledSats = enrollments.reduce(
    (total, enrollment) => total + toBigInt(enrollment.btc),
    BigInt(0)
  );

  const at = (height: number) => burnHeightToApproximateTimestamp(height, currentBurnHeight, nowMs);
  const past = (height: number) => currentBurnHeight >= height;

  const milestones: Milestone[] = [
    { label: 'Enrollment opened', height: schedule.enrollmentOpensHeight },
    { label: 'Enrollment closed', height: schedule.enrollmentClosesHeight },
    { label: 'Bond started · Day 0', height: schedule.activationHeight },
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
    { label: 'Bitcoin unlocks · L1', height: schedule.l1UnlockHeight },
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

  const name = getBondDisplayName(featuredBond);
  const cycleRange = `cycles ${featuredBond.schedule?.activation?.pox_cycle ?? '?'}–${
    (featuredBond.schedule?.unlock?.pox_cycle ?? 1) - 1
  }`;

  return (
    <Stack gap={3}>
      <Text textStyle="heading-md">Current bond</Text>
      <Flex
        gap={[3, 4]}
        p={[3, 4]}
        bg="surfacePrimary"
        borderRadius="redesign.xl"
        flexDirection={{ base: 'column', lg: 'row' }}
      >
        <Stack gap={5} flex={1} p={[3, 4]}>
          <Stack gap={2}>
            <Flex gap={3} align="center" flexWrap="wrap">
              <Text textStyle="heading-lg">{name}</Text>
              <Badge
                bg={STATE_BADGES[state].bg}
                color={STATE_BADGES[state].color}
                gap={1.5}
                px={2.5}
                py={1}
                borderRadius="redesign.xl"
              >
                {/* The dot carries the state's colour where the badge is a
                    tint. On a solid badge it reads as a hole. */}
                {!STATE_BADGES[state].solid && (
                  <Box w={1.5} h={1.5} borderRadius="full" bg="currentColor" />
                )}
                {STATE_LABELS[state]}
              </Badge>
            </Flex>
            <Text textStyle="text-regular-sm" color="textSecondary">
              {/* A bond that goes by name still needs its index stated
                  somewhere; one titled "Bond 2" already carries it. */}
              {name !== `Bond ${featuredBond.index}` && `Bond ${featuredBond.index} · `}
              {cycleRange} · {(termEndHeight - activationHeight).toLocaleString()} blocks
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

          {/*
            A breakdown rather than a gauge. The bar always fills; its segments
            are the confirmed enrollments in proportion to each other. There is
            deliberately no denominator, so the page never publishes the
            Endowment's allocation figure.
          */}
          <Stack gap={2}>
            <Flex justify="space-between" gap={3} flexWrap="wrap" align="baseline">
              <Text textStyle="text-medium-sm">Confirmed bond enrollments</Text>
              <Text textStyle="text-medium-sm" whiteSpace="nowrap">
                {formatBtc(enrolledSats)}
              </Text>
            </Flex>
            <EnrollmentBar enrollments={enrollments} totalSats={enrolledSats} />
            <Text textStyle="text-regular-xs" color="textSecondary">
              Confirmed on-chain enrollments within this bond. Bond parameters are set by the Stacks
              Endowment.
            </Text>
          </Stack>

          {nextBond && (
            <Stack gap={1} pt={2} borderTop="1px solid" borderColor="redesignBorderSecondary">
              <Flex gap={2} align="center">
                <Box w={2} h={2} borderRadius="full" bg="accent.stacks-500" />
                <Text textStyle="text-medium-sm" suppressHydrationWarning>
                  Next bond starts ~{formatDateWithYear(at(nextBond.activationHeight))}
                </Text>
              </Flex>
              <Flex gap={1.5} align="center" flexWrap="wrap">
                <Text textStyle="text-regular-xs" color="textSecondary">
                  Bond {nextBond.index} · term #{nextBond.activationHeight.toLocaleString()}
                </Text>
                {/* Drawn rather than a character, which renders long and thin. */}
                <Icon w={3} h={3} color="textSecondary">
                  <ArrowRight weight="bold" />
                </Icon>
                <Text textStyle="text-regular-xs" color="textSecondary">
                  #{nextBond.termEndHeight.toLocaleString()}
                </Text>
              </Flex>
            </Stack>
          )}
        </Stack>

        <Stack gap={4} flex={1} bg="surfaceTertiary" borderRadius="redesign.lg" p={[4, 5]}>
          <Flex justify="space-between" gap={3} align="baseline" flexWrap="wrap">
            <Text textStyle="heading-xs">Lifecycle</Text>
            <ViewAllLink href={buildUrl(`/staking/activity?bond=${featuredBond.index}`, network)}>
              View all bond transactions
            </ViewAllLink>
          </Flex>
          <Stack gap={0}>
            {milestones.map((milestone, index) => (
              <Box
                key={milestone.label}
                py={2.5}
                borderTop={index > 0 ? '1px solid' : undefined}
                borderColor="redesignBorderSecondary"
              >
                <LifecycleRow milestone={milestone} />
              </Box>
            ))}
          </Stack>
        </Stack>
      </Flex>
    </Stack>
  );
}
