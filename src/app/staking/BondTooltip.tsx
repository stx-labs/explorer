'use client';

import { Text } from '@/ui/Text';
import { Badge, Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowRight, ArrowUpRight } from '@phosphor-icons/react';

import { DISTRIBUTIONS_PER_BOND, STAKING_LINKS } from './consts';
import {
  BondLifecycleState,
  BondSchedule,
  formatTermDuration,
  formatTimeRemaining,
} from './projections';
import type { RealizedBondRate } from './reward-metrics';
import { formatBtc, formatBurnDate, formatRatePercent, formatSbtc } from './utils';

const STATE_LABELS: Record<BondLifecycleState, string> = {
  scheduled: 'scheduled',
  enrolling: 'enrolling',
  awaitingActivation: 'enrollment closed',
  active: 'active',
  maturity: 'maturity',
  closed: 'closed',
};

const STATE_BADGES: Record<BondLifecycleState, { bg: string; color: string }> = {
  scheduled: { bg: 'neutral.sand-500', color: 'neutral.sand-50' },
  enrolling: { bg: 'accent.bitcoin-500', color: 'neutral.sand-950' },
  awaitingActivation: { bg: 'neutral.sand-500', color: 'neutral.sand-50' },
  active: { bg: 'feedback.green-200', color: 'feedback.green-600' },
  maturity: { bg: 'neutral.sand-300', color: 'neutral.sand-950' },
  closed: { bg: 'neutral.sand-500', color: 'neutral.sand-50' },
};

const ENROLLING_ACCENT = 'accent.bitcoin-500';

export const hasBondActions = (state: BondLifecycleState) =>
  state === 'scheduled' || state === 'enrolling';

export function bondSummary(bond: BondTooltipData, currentBurnHeight: number, nowMs: number) {
  const date = (height: number) =>
    formatBurnDate(height, currentBurnHeight, nowMs, bond.burnBlockTimes);
  return `${bond.label} · ${STATE_LABELS[bond.state]} · ${date(bond.schedule.activationHeight)} → ${date(bond.schedule.termEndHeight)}`;
}

export interface BondTooltipData {
  label: string;
  state: BondLifecycleState;
  schedule: BondSchedule;
  capacitySats?: bigint;
  lockedSats?: bigint;
  rewardedSats?: bigint;
  targetRateBps?: number;
  realizedRate?: RealizedBondRate;
  burnBlockTimes?: Record<number, number>;
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
  elapsedDistributions,
  currentBurnHeight,
  nowMs,
}: {
  bond: BondTooltipData;
  elapsedDistributions: number;
  currentBurnHeight: number;
  nowMs: number;
}) {
  const { label, state, schedule, capacitySats, lockedSats, rewardedSats, targetRateBps } = bond;
  const date = (height: number) =>
    formatBurnDate(height, currentBurnHeight, nowMs, bond.burnBlockTimes);

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

  const rewarded = rewardedSats === undefined ? 'Unavailable' : formatSbtc(rewardedSats);
  const bonded = lockedSats === undefined ? 'N/A' : formatBtc(lockedSats);

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
              <Row label="Capacity" value={formatBtc(capacitySats, 0)} />
            )
          ) : (
            <Row label="Bonded" value={bonded} />
          )}
          {targetRateBps !== undefined && (
            <Row label="Protocol Yield Target" value={formatRatePercent(targetRateBps)} />
          )}
          {state !== 'enrolling' && <Row label="Rewards credited" value={rewarded} />}
          {state === 'closed' && (
            <>
              <Row
                label="Realized rate"
                value={
                  bond.realizedRate?.percent === undefined
                    ? 'Unavailable'
                    : `${bond.realizedRate.percent.toFixed(2)}%`
                }
              />
              <Text textStyle="text-regular-xs" color="neutral.sand-300">
                {bond.realizedRate?.note ??
                  'Complete reward and eligible-principal history is not yet available.'}
              </Text>
            </>
          )}
          {state !== 'enrolling' && (
            <>
              <Row
                label="Scheduled intervals elapsed"
                value={`${elapsedDistributions} of ${DISTRIBUTIONS_PER_BOND}`}
              />
              <Text textStyle="text-regular-xs" color="neutral.sand-300">
                Credits are contract allocations. Onward payment is separate.
              </Text>
            </>
          )}
        </Stack>
      )}

      {state === 'scheduled' && (
        <Text textStyle="text-regular-xs" color="neutral.sand-300">
          Earliest setup window: {date(schedule.enrollmentOpensHeight)}. Terms appear after on-chain
          setup.
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

      {hasBondActions(state) && (
        <Flex gap={4} pt={1} flexWrap="wrap">
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
