'use client';

import { formatDateShort } from '@/common/utils/date-utils';
import { Text } from '@/ui/Text';
import { Badge, Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowRight, ArrowUpRight } from '@phosphor-icons/react';

import { DISTRIBUTIONS_PER_BOND, STAKING_LINKS } from './consts';
import {
  BondLifecycleState,
  BondSchedule,
  burnHeightToApproximateTimestamp,
  formatTermDuration,
  formatTimeRemaining,
  getRealizedRatePercent,
} from './projections';
import { formatBtc, satsToBtc } from './utils';

/**
 * A bond's state, worded as the contract's own lifecycle rather than as the
 * three states the API reports.
 */
const STATE_LABELS: Record<BondLifecycleState, string> = {
  scheduled: 'scheduled',
  enrolling: 'enrolling',
  active: 'active',
  maturity: 'maturity',
  closed: 'closed',
};

/**
 * Badge colours, set explicitly rather than by palette.
 *
 * The tooltip sits on a dark surface, where the subtle palette variants are
 * tuned for a light one and lose their contrast.
 */
export const STATE_BADGES: Record<
  BondLifecycleState,
  { bg: string; color: string; solid?: boolean }
> = {
  scheduled: { bg: 'neutral.sand-500', color: 'neutral.sand-50' },
  // Fully coloured rather than tinted, so it needs no dot to carry the state.
  enrolling: { bg: 'accent.bitcoin-500', color: 'neutral.sand-950', solid: true },
  active: { bg: 'feedback.green-200', color: 'feedback.green-600' },
  maturity: { bg: 'neutral.sand-300', color: 'neutral.sand-950' },
  closed: { bg: 'neutral.sand-500', color: 'neutral.sand-50' },
};

/** Warmer than the page accent, which reads as red against the dark tooltip. */
const ENROLLING_ACCENT = 'accent.bitcoin-500';

export interface BondTooltipData {
  label: string;
  state: BondLifecycleState;
  schedule: BondSchedule;
  /** Absent until the Endowment publishes the bond's parameters. */
  capacitySats?: bigint;
  lockedSats: bigint;
  /**
   * Undefined when the distribution history does not reach back to this bond,
   * which is not the same as a bond that was rewarded nothing.
   */
  rewardedSats?: bigint;
  targetRateBps?: number;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" gap={6} align="baseline">
      <Text textStyle="text-regular-xs" color="neutral.sand-300">
        {label}
      </Text>
      <Text textStyle="text-medium-xs" color="neutral.sand-50" whiteSpace="nowrap">
        {value}
      </Text>
    </Flex>
  );
}

/**
 * A way in, for bonds nobody can enrol in yet.
 *
 * Only shown before a bond opens: once it is running there is nothing left to
 * register interest in, and the yield is a fact rather than an estimate.
 */
function TooltipAction({
  href,
  children,
  arrow,
}: {
  href: string;
  children: string;
  arrow: 'out' | 'next';
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Flex
        align="center"
        gap={1}
        borderBottom="1px solid"
        borderColor="neutral.sand-400"
        width="fit-content"
      >
        <Text textStyle="text-medium-xs" color="neutral.sand-50" whiteSpace="nowrap">
          {children}
        </Text>
        <Icon w={3} h={3} color="neutral.sand-50">
          {arrow === 'out' ? <ArrowUpRight weight="bold" /> : <ArrowRight weight="bold" />}
        </Icon>
      </Flex>
    </a>
  );
}

export function BondTooltip({
  bond,
  rewardCycleLength,
  currentBurnHeight,
  nowMs,
}: {
  bond: BondTooltipData;
  rewardCycleLength: number;
  currentBurnHeight: number;
  nowMs: number;
}) {
  const { label, state, schedule, capacitySats, lockedSats, rewardedSats, targetRateBps } = bond;
  const at = (height: number) =>
    formatDateShort(burnHeightToApproximateTimestamp(height, currentBurnHeight, nowMs));

  // Heights the chain has already passed are dated exactly; the rest are
  // projected from the block interval and marked as approximate.
  const date = (height: number) => `${height > currentBurnHeight ? '~' : ''}${at(height)}`;

  // The countdown names when the range above it ends. The exception is a bond
  // the contract has not created yet, whose next event is its own start. A
  // closed bond has nothing left to count down to, so it shows how long it ran.
  const termBlocks = schedule.termEndHeight - schedule.activationHeight;
  const remainingBlocks =
    state === 'scheduled'
      ? schedule.activationHeight - currentBurnHeight
      : schedule.termEndHeight - currentBurnHeight;
  const duration =
    state === 'closed'
      ? formatTermDuration(termBlocks)
      : remainingBlocks > 0
        ? `in ${formatTimeRemaining(remainingBlocks)}`
        : '';

  const rate = (bps: number) => `${(bps / 100).toFixed(1)}%`;
  const distributionsPaid = Math.min(
    Math.max(
      Math.floor(
        (currentBurnHeight - schedule.activationHeight) / (termBlocks / DISTRIBUTIONS_PER_BOND || 1)
      ),
      0
    ),
    DISTRIBUTIONS_PER_BOND
  );
  const rewarded =
    rewardedSats !== undefined
      ? `${formatBtc(rewardedSats)} · ${distributionsPaid} of ${DISTRIBUTIONS_PER_BOND}`
      : `${distributionsPaid} of ${DISTRIBUTIONS_PER_BOND}`;
  const bonded =
    capacitySats && capacitySats > BigInt(0)
      ? `${satsToBtc(lockedSats).toLocaleString(undefined, { maximumFractionDigits: 4 })} / ${formatBtc(capacitySats, 0)}`
      : formatBtc(lockedSats);
  // Only computable once the rewards a bond actually produced are known. A
  // bond outside the distribution history would otherwise realize at 0%.
  const realizedRate =
    rewardedSats !== undefined
      ? getRealizedRatePercent(rewardedSats, lockedSats, termBlocks, rewardCycleLength)
      : undefined;

  return (
    <Stack gap={2.5} minW="14rem">
      <Stack gap={1}>
        <Flex align="center" gap={2}>
          <Text textStyle="text-medium-sm" color="neutral.sand-50">
            {label}
          </Text>
          <Badge
            bg={STATE_BADGES[state].bg}
            color={STATE_BADGES[state].color}
            px={2}
            py={0.5}
            borderRadius="redesign.xl"
            whiteSpace="nowrap"
          >
            {STATE_LABELS[state]}
          </Badge>
        </Flex>
        <Text textStyle="text-regular-xs" color="neutral.sand-300" whiteSpace="nowrap">
          {date(schedule.activationHeight)} → {date(schedule.termEndHeight)}
          {duration && ` (${duration})`}
        </Text>
      </Stack>

      {state !== 'scheduled' && (
        <Stack gap={1.5}>
          {state === 'enrolling' ? (
            capacitySats !== undefined && (
              <Row label="Offering" value={formatBtc(capacitySats, 0)} />
            )
          ) : (
            <Row label="Bonded" value={bonded} />
          )}
          {state === 'closed'
            ? realizedRate !== undefined && (
                <Row label="Realized rate" value={`${realizedRate.toFixed(3)}%`} />
              )
            : state !== 'maturity' &&
              targetRateBps !== undefined && (
                <Row label="Target rate" value={rate(targetRateBps)} />
              )}
          {state !== 'enrolling' && <Row label="Rewarded" value={rewarded} />}
        </Stack>
      )}

      {state === 'scheduled' && (
        <Text textStyle="text-regular-xs" color="neutral.sand-300">
          Offering and rate publish {date(schedule.enrollmentOpensHeight)}.
        </Text>
      )}
      {state === 'enrolling' && (
        <Text textStyle="text-regular-xs" color={ENROLLING_ACCENT}>
          Enrollment closes {date(schedule.enrollmentClosesHeight)}.
        </Text>
      )}
      {state === 'maturity' && (
        <Text textStyle="text-regular-xs" color="neutral.sand-300">
          Bitcoin unlocked at #{schedule.l1UnlockHeight.toLocaleString()}.
        </Text>
      )}

      {/* A bond that has not opened yet is something to prepare for, so the
          tooltip offers the two things a reader can actually do. */}
      {(state === 'scheduled' || state === 'enrolling') && (
        <Flex gap={4} pt={2} borderTop="1px solid" borderColor="neutral.sand-500" flexWrap="wrap">
          <TooltipAction href={STAKING_LINKS.estimateYield} arrow="out">
            Estimate your yield
          </TooltipAction>
          <TooltipAction href={STAKING_LINKS.registerInterest} arrow="next">
            Register interest
          </TooltipAction>
        </Flex>
      )}
    </Stack>
  );
}
