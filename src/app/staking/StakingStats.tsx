'use client';

import { OverviewCard } from '@/app/transactions/Overview';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { formatDateShort } from '@/common/utils/date-utils';
import { Button, ButtonProps } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Flex, Grid, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';

import { GlossaryTerm } from './GlossaryTerm';
import { STAKING_LINKS } from './consts';
import { Bond } from './data';
import { GLOSSARY } from './glossary';
import {
  burnHeightToApproximateTimestamp,
  getBondProgress,
  getBondSchedule,
  getDistributionCadence,
} from './projections';
import { formatBtc, formatStx, formatUsd, microStxToStx, satsToBtc, toBigInt } from './utils';

/** A figure with its unit beside it, sized as the overview cards size theirs. */
function Figure({ value, unit }: { value: string; unit?: string }) {
  return (
    <Flex gap={1.5} align="baseline">
      <Text textStyle="heading-sm" fontWeight="medium" color="textPrimary" whiteSpace="nowrap">
        {value}
      </Text>
      {unit && (
        <Text textStyle="text-regular-sm" color="textSecondary">
          {unit}
        </Text>
      )}
    </Flex>
  );
}

/**
 * A constant's value. It arrives as parts so the separator can carry its own
 * spacing rather than being crammed against the words either side of it.
 */
/** The staking site, whose form also takes expressions of interest. */
export function HowToParticipateButton(props: ButtonProps) {
  return (
    <Button
      asChild
      variant="redesignPrimary"
      size="big"
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={2}
      {...props}
    >
      <a href={STAKING_LINKS.howToParticipate} target="_blank" rel="noopener noreferrer">
        How to participate
        <Icon w={3.5} h={3.5}>
          <ArrowUpRight weight="bold" />
        </Icon>
      </a>
    </Button>
  );
}

export function StakingStats({
  featuredBond,
  rewardCycleLength,
  prepareCycleLength,
  currentBurnHeight,
  nowMs,
  rewardsByBond,
}: {
  /**
   * Every figure here describes this one bond. The section reads as a whole
   * with Current bond below it, and per-bond is the only scope where the
   * captions mean anything: several bonds run at once with their own rates,
   * distribution counts and unlock heights.
   */
  featuredBond?: Bond;
  rewardCycleLength: number;
  prepareCycleLength: number;
  currentBurnHeight: number;
  nowMs: number;
  /** Sats rewarded per bond, summed from distribution history. */
  rewardsByBond?: Record<number, bigint>;
}) {
  const { stxPrice, btcPrice } = useGlobalContext().tokenPrice;

  if (!featuredBond) return null;

  const bondedSats = toBigInt(featuredBond.balances?.locked?.btc);
  const pairedMicroStx = toBigInt(featuredBond.balances?.locked?.stx);
  const rewardedSats = rewardsByBond?.[featuredBond.index] ?? BigInt(0);
  const bondedBtc = satsToBtc(bondedSats);
  const pairedStx = microStxToStx(pairedMicroStx);

  const schedule = getBondSchedule(
    featuredBond.schedule?.activation?.bitcoin_height ?? 0,
    featuredBond.schedule?.unlock?.bitcoin_height ?? 0,
    rewardCycleLength,
    prepareCycleLength
  );
  const progress = getBondProgress(schedule, currentBurnHeight, rewardCycleLength);

  // When the next payout lands, rather than how many have gone by. A bond that
  // has taken all 24 has none left to name.
  const cadence = getDistributionCadence(rewardCycleLength);
  const nextRewardsHeight =
    progress.paid < progress.total
      ? schedule.activationHeight + (progress.paid + 1) * cadence
      : undefined;
  const nextRewards =
    nextRewardsHeight !== undefined
      ? `Next rewards ~${formatDateShort(
          burnHeightToApproximateTimestamp(nextRewardsHeight, currentBurnHeight, nowMs)
        )}`
      : undefined;

  const rate = (bps: number) => `${(bps / 100).toFixed(1)}%`;
  const usd = (amount: number, price?: number) => (price ? formatUsd(amount * price) : undefined);
  const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ') || undefined;

  return (
    <>
      {/*
        One card per figure, in the shape the transactions overview uses for
        its headline stats. Two by two on a phone, one row on anything wider.
      */}
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3}>
        <OverviewCard
          title={<GlossaryTerm entry="targetRewardRate" />}
          stat={<Figure value={rate(featuredBond.parameters?.target_rate_bps ?? 0)} />}
          caption={
            <>
              <GlossaryTerm entry="stxPairing">STX pairing</GlossaryTerm> ≥
              {rate(featuredBond.parameters?.minimum_stx_ratio ?? 0)}
            </>
          }
        />
        <OverviewCard
          title="BTC bonded"
          stat={<Figure value={formatBtc(bondedSats, 1).replace(' BTC', '')} unit="BTC" />}
          caption={join(usd(bondedBtc, btcPrice), 'total of confirmed enrollments')}
        />
        {/*
          What bonds have been rewarded, not what stakers have collected. The bonds
          endpoint's `paid_out` counts claims, so a bond generating rewards for
          months still reports zero until someone withdraws.
        */}
        <OverviewCard
          title="BTC rewarded"
          stat={<Figure value={formatBtc(rewardedSats, 4).replace(' BTC', '')} unit="BTC" />}
          caption={join(usd(satsToBtc(rewardedSats), btcPrice), nextRewards)}
        />
        <OverviewCard
          title="STX paired"
          stat={<Figure value={formatStx(pairedMicroStx).replace(' STX', '')} unit="STX" />}
          caption={join(
            usd(pairedStx, stxPrice),
            `unlocks #${schedule.termEndHeight.toLocaleString()}`
          )}
        />
      </Grid>
    </>
  );
}
