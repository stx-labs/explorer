'use client';

import { ProgressBar } from '@/common/components/ProgressBar';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { formatDateShort } from '@/common/utils/date-utils';
import { ButtonLink } from '@/ui/ButtonLink';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowRight } from '@phosphor-icons/react';

import { BondStateBadge } from './BondStateBadge';
import type { BondStateTone } from './BondStateBadge';
import { GlossaryTerm } from './GlossaryTerm';
import { GENESIS_BOND_INDEX } from './consts';
import type { Bond, EnrollmentShare } from './data';
import {
  BondLifecycleState,
  burnHeightToApproximateTimestamp,
  getBondLifecycleState,
  getBondProgress,
  getBondSchedule,
  getDistributionCadence,
} from './projections';
import { bondLabel, formatBtc, formatDateWithYear, toBigInt } from './utils';

const BAR_HEIGHT = 2;

const PULSE_MS = 2400;

const STATE_LABELS: Record<BondLifecycleState, string> = {
  scheduled: 'Scheduled',
  enrolling: 'Enrolling',
  active: 'Active',
  maturity: 'Maturity',
  closed: 'Closed',
};

const STATE_TONES: Record<BondLifecycleState, BondStateTone> = {
  scheduled: 'pending',
  enrolling: 'enrolling',
  active: 'active',
  maturity: 'maturity',
  closed: 'closed',
};

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

interface Milestone {
  id: string;
  label: React.ReactNode;
  height: number;
  timestamp: number;
  isPast: boolean;
  isCurrent?: boolean;
}

function LifecycleRow({ milestone, live }: { milestone: Milestone; live: boolean }) {
  const { label, height, timestamp, isPast, isCurrent } = milestone;
  const reached = isPast || isCurrent;
  return (
    <Flex justify="space-between" gap={3} align="center" flexWrap="wrap">
      <Flex gap={3} align="center" minW="12rem">
        <Box
          position="relative"
          isolation="isolate"
          w={2}
          h={2}
          borderRadius="full"
          flexShrink={0}
          bg={isCurrent ? 'accent.stacks-500' : isPast ? 'feedback.green-500' : 'transparent'}
          border={reached ? undefined : '1px solid'}
          borderColor="redesignBorderSecondary"
          _before={
            isCurrent && live
              ? {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  zIndex: -1,
                  borderRadius: 'full',
                  bg: 'accent.stacks-500',
                  opacity: 0.45,
                  animation: `lifecycle-pulse ${PULSE_MS}ms cubic-bezier(0, 0, 0.2, 1) infinite`,
                }
              : undefined
          }
          _motionReduce={{ _before: { animation: 'none' } }}
        />
        <Text textStyle={reached ? 'text-medium-sm' : 'text-regular-sm'}>{label}</Text>
      </Flex>
      <Flex gap={6} align="baseline">
        <Text textStyle="text-mono-xs" color={reached ? 'accent.stacks-500' : 'textSecondary'}>
          #{height.toLocaleString()}
        </Text>
        <Text
          textStyle="text-regular-sm"
          color={reached ? 'textPrimary' : 'textSecondary'}
          minW="7rem"
          textAlign="right"
          suppressHydrationWarning
        >
          {reached ? formatDateShort(timestamp) : `~${formatDateShort(timestamp)}`}
        </Text>
      </Flex>
    </Flex>
  );
}

export function CurrentBond({
  featuredBond,
  nextBond,
  enrollments,
  rewardCycleLength,
  prepareCycleLength,
  currentBurnHeight,
  nowMs,
}: {
  featuredBond?: Bond;
  nextBond?: { index: number; activationHeight: number; termEndHeight: number };
  enrollments: EnrollmentShare[];
  rewardCycleLength: number;
  prepareCycleLength: number;
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
  const hasStarted = currentBurnHeight >= schedule.activationHeight;
  const progress = getBondProgress(schedule, currentBurnHeight, rewardCycleLength);
  const cadence = getDistributionCadence(rewardCycleLength);
  const distributionHeight = (n: number) => schedule.activationHeight + n * cadence;

  const enrolledSats = enrollments.reduce(
    (total, enrollment) => total + toBigInt(enrollment.btc),
    BigInt(0)
  );

  const at = (height: number) => burnHeightToApproximateTimestamp(height, currentBurnHeight, nowMs);
  const past = (height: number) => currentBurnHeight >= height;

  const milestones: Milestone[] = [
    { id: 'enrollment-opened', label: 'Enrollment opened', height: schedule.enrollmentOpensHeight },
    {
      id: 'enrollment-closed',
      label: 'Enrollment closed',
      height: schedule.enrollmentClosesHeight,
    },
    { id: 'bond-started', label: 'Bond started · Day 0', height: schedule.activationHeight },
    ...(progress.paid > 0
      ? [
          {
            id: 'latest-distribution',
            label: (
              <>
                <GlossaryTerm entry="rewardDistribution">Latest distribution</GlossaryTerm> ·{' '}
                {progress.paid} of {progress.total}
              </>
            ),
            height: distributionHeight(progress.paid),
            isCurrent: true,
          },
        ]
      : []),
    ...(progress.paid < progress.total
      ? [
          {
            id: 'next-distribution',
            label: `Next distribution · ${progress.paid + 1} of ${progress.total}`,
            height: distributionHeight(progress.paid + 1),
          },
        ]
      : []),
    { id: 'l1-unlock', label: 'Bitcoin unlocks · L1', height: schedule.l1UnlockHeight },
    { id: 'term-ends', label: 'Term ends', height: schedule.termEndHeight },
  ]
    .map(m => ({
      ...m,
      timestamp: at(m.height),
      isPast: past(m.height) && !m.isCurrent,
      isCurrent: !!m.isCurrent && past(m.height),
    }))
    .sort((a, b) => a.height - b.height);

  const name = bondLabel(featuredBond.index);
  const cycleRange = `cycles ${featuredBond.schedule?.activation?.pox_cycle ?? '?'}–${
    (featuredBond.schedule?.unlock?.pox_cycle ?? 1) - 1
  }`;

  return (
    <Stack gap={4}>
      <Flex
        gap={[3, 4]}
        p={[3, 4]}
        bg="surfacePrimary"
        borderRadius="redesign.md"
        flexDirection={{ base: 'column', lg: 'row' }}
      >
        <Stack gap={5} flex={1} p={[3, 4]}>
          <Stack gap={2}>
            <Flex gap={3} align="center" flexWrap="wrap">
              <Text textStyle="heading-lg">{name}</Text>
              <BondStateBadge tone={STATE_TONES[state]} label={STATE_LABELS[state]} />
            </Flex>
            <Text textStyle="text-regular-sm" color="textSecondary">
              {featuredBond.index === GENESIS_BOND_INDEX && `Bond ${featuredBond.index} · `}
              <GlossaryTerm entry="bondTerm">{cycleRange}</GlossaryTerm> ·{' '}
              {(termEndHeight - activationHeight).toLocaleString()} blocks
            </Text>
          </Stack>

          <Stack gap={2}>
            <Flex justify="space-between" gap={3}>
              <Text textStyle="text-medium-sm">
                {hasStarted
                  ? `Day ${progress.dayOfTerm} of ${progress.termDays}`
                  : 'Not yet started'}
              </Text>
              <Text textStyle="text-regular-sm" color="textSecondary">
                {(progress.elapsedRatio * 100).toFixed(1)}% elapsed
              </Text>
            </Flex>
            <ProgressBar percentage={Math.min(Math.max(progress.elapsedRatio, 0), 1) * 100} />
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

        <Stack gap={4} flex={1} bg="surfaceTertiary" borderRadius="redesign.sm" p={[4, 5]}>
          <Flex justify="space-between" gap={3} align="baseline" flexWrap="wrap">
            <Text textStyle="heading-xs">Lifecycle</Text>
            <ButtonLink
              href={buildUrl(`/staking/activity?bond=${featuredBond.index}`, network)}
              buttonLinkSize="big"
            >
              View all bond transactions
            </ButtonLink>
          </Flex>
          <Stack gap={0}>
            {milestones.map((milestone, index) => (
              <Box
                key={milestone.id}
                py={2.5}
                borderTop={index > 0 ? '1px solid' : undefined}
                borderColor="redesignBorderSecondary"
              >
                <LifecycleRow milestone={milestone} live={state === 'active'} />
              </Box>
            ))}
          </Stack>
        </Stack>
      </Flex>
    </Stack>
  );
}
