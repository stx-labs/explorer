'use client';

import { OverviewCard } from '@/common/components/OverviewCard';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { formatDateShort } from '@/common/utils/date-utils';
import { Button } from '@/ui/Button';
import type { ButtonProps } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Flex, Grid, Icon } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';

import { GlossaryTerm } from './GlossaryTerm';
import { STAKING_LINKS } from './consts';
import type { Bond } from './data';
import {
  burnHeightToApproximateTimestamp,
  getBondProgress,
  getBondSchedule,
  getDistributionCadence,
} from './projections';
import {
  formatBtc,
  formatRatePercent,
  formatStx,
  formatUsd,
  microStxToStx,
  satsToBtc,
  toBigInt,
} from './utils';

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
  featuredBond?: Bond;
  rewardCycleLength: number;
  prepareCycleLength: number;
  currentBurnHeight: number;
  nowMs: number;
  rewardsByBond?: Record<number, bigint>;
}) {
  const { stxPrice, btcPrice } = useGlobalContext().tokenPrice;

  if (!featuredBond) return null;

  const bondedSats = toBigInt(featuredBond.balances?.locked?.btc);
  const pairedMicroStx = toBigInt(featuredBond.balances?.locked?.stx);
  const rewardedSats = rewardsByBond ? (rewardsByBond[featuredBond.index] ?? BigInt(0)) : undefined;
  const bondedBtc = satsToBtc(bondedSats);
  const pairedStx = microStxToStx(pairedMicroStx);

  const schedule = getBondSchedule(
    featuredBond.schedule?.activation?.bitcoin_height ?? 0,
    featuredBond.schedule?.unlock?.bitcoin_height ?? 0,
    rewardCycleLength,
    prepareCycleLength
  );
  const progress = getBondProgress(schedule, currentBurnHeight, rewardCycleLength);

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

  const usd = (amount: number, price?: number) => (price ? formatUsd(amount * price) : undefined);
  const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ') || undefined;

  return (
    <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3}>
      <OverviewCard
        title={<GlossaryTerm entry="targetRewardRate" />}
        stat={<Figure value={formatRatePercent(featuredBond.parameters?.target_rate_bps ?? 0)} />}
        caption={
          <>
            <GlossaryTerm entry="stxPairing">STX pairing</GlossaryTerm> ≥
            {formatRatePercent(featuredBond.parameters?.minimum_stx_ratio ?? 0)}
          </>
        }
      />
      <OverviewCard
        title="BTC bonded"
        stat={<Figure value={formatBtc(bondedSats, 1).replace(' BTC', '')} unit="BTC" />}
        caption={join(usd(bondedBtc, btcPrice), 'total of confirmed enrollments')}
      />
      <OverviewCard
        title="BTC rewarded"
        stat={
          <Figure
            value={
              rewardedSats === undefined ? '—' : formatBtc(rewardedSats, 4).replace(' BTC', '')
            }
            unit={rewardedSats === undefined ? undefined : 'BTC'}
          />
        }
        caption={join(
          rewardedSats === undefined
            ? 'Reward history unavailable'
            : usd(satsToBtc(rewardedSats), btcPrice),
          nextRewards
        )}
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
  );
}
