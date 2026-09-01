'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { formatDateShort } from '@/common/utils/date-utils';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';

import { GlossaryTerm } from './GlossaryTerm';
import { BOND_TERM_CYCLES, DISTRIBUTIONS_PER_BOND, RESERVE_RATIO_PERCENT } from './consts';
import { Bond } from './data';
import { GLOSSARY } from './glossary';
import {
  burnHeightToApproximateTimestamp,
  getBondProgress,
  getBondSchedule,
  getDistributionCadence,
} from './projections';
import { formatBtc, formatStx, formatUsd, microStxToStx, satsToBtc, toBigInt } from './utils';

function Stat({
  label,
  value,
  unit,
  caption,
}: {
  label: React.ReactNode;
  value: string;
  unit?: string;
  caption?: React.ReactNode;
}) {
  return (
    // The label sits at the top of the panel and the figure at the bottom, so a
    // row of stats reads as two aligned bands rather than four floating blocks.
    <Flex
      direction="column"
      justify="space-between"
      gap={8}
      flex="1 1 9rem"
      minW="8rem"
      minH="7rem"
      height="100%"
    >
      <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
        {label}
      </Text>
      <Stack gap={1.5}>
        <Flex gap={1.5} align="baseline">
          <Text textStyle="heading-md" fontWeight="medium" whiteSpace="nowrap">
            {value}
          </Text>
          {unit && (
            <Text textStyle="text-regular-sm" color="textSecondary">
              {unit}
            </Text>
          )}
        </Flex>
        {caption && (
          // Two lines are reserved so a caption that wraps at narrow widths does
          // not lift its figure out of line with the stats beside it.
          <Text textStyle="text-regular-xs" color="textSecondary" minH="2lh">
            {caption}
          </Text>
        )}
      </Stack>
    </Flex>
  );
}

/**
 * A protocol constant: a term you can hover for a definition, and its value.
 *
 * The value arrives as parts so the separator can carry its own spacing rather
 * than being crammed against the words either side of it.
 */
function ConstantRow({ term, parts }: { term: keyof typeof GLOSSARY; parts: string[] }) {
  return (
    <Flex justify="space-between" gap={4} align="baseline">
      <Text textStyle="text-regular-sm" color="textSecondary">
        <GlossaryTerm entry={term} />
      </Text>
      <Flex gap={2} align="baseline">
        {parts.map((part, index) => (
          <Flex key={part} gap={2} align="baseline">
            {index > 0 && (
              <Text textStyle="text-regular-sm" color="textSecondary">
                ·
              </Text>
            )}
            <Text textStyle="text-medium-sm" whiteSpace="nowrap">
              {part}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
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
    <Flex gap={3} flexDirection={{ base: 'column', lg: 'row' }} align="stretch">
      <Box
        bg="surfacePrimary"
        borderRadius="redesign.xl"
        p={[4, 6]}
        flex={{ base: '1 1 auto', lg: '3 1 0' }}
        minW={0}
        display="flex"
      >
        <Flex gap={6} flexWrap="wrap" width="100%" align="stretch" alignContent="stretch">
          <Stat
            label={<GlossaryTerm entry="targetRewardRate" />}
            value={rate(featuredBond.parameters?.target_rate_bps ?? 0)}
            caption={
              <>
                <GlossaryTerm entry="stxPairing">STX pairing</GlossaryTerm> ≥
                {rate(featuredBond.parameters?.minimum_stx_ratio ?? 0)}
              </>
            }
          />
          <Stat
            label="BTC bonded"
            value={formatBtc(bondedSats, 1).replace(' BTC', '')}
            unit="BTC"
            caption={join(usd(bondedBtc, btcPrice), 'total of confirmed enrollments')}
          />
          {/*
            What bonds have been rewarded, not what stakers have collected. The bonds
            endpoint's `paid_out` counts claims, so a bond generating rewards for
            months still reports zero until someone withdraws.
          */}
          <Stat
            label="BTC rewarded"
            value={formatBtc(rewardedSats, 4).replace(' BTC', '')}
            unit="BTC"
            caption={join(usd(satsToBtc(rewardedSats), btcPrice), nextRewards)}
          />
          <Stat
            label="STX paired"
            value={formatStx(pairedMicroStx).replace(' STX', '')}
            unit="STX"
            caption={join(
              usd(pairedStx, stxPrice),
              `unlocks #${schedule.stxUnlockHeight.toLocaleString()}`
            )}
          />
        </Flex>
      </Box>

      {/* Protocol constants, fixed in the contract rather than read per bond. */}
      <Box
        bg="surfaceFourth"
        border="1px solid"
        borderColor="redesignBorderSecondary"
        borderRadius="redesign.xl"
        p={[4, 6]}
        flex={{ base: '1 1 auto', lg: '1 1 0' }}
        // Below this the constant rows collapse onto two lines and the panel
        // stops reading as a list of pairs.
        minW={{ base: 0, lg: '25rem' }}
      >
        <Stack gap={4} justify="space-between" height="100%">
          <Stack gap={2.5}>
            <ConstantRow
              term="bondTerm"
              parts={[
                `${BOND_TERM_CYCLES} cycles`,
                `${(BOND_TERM_CYCLES * rewardCycleLength).toLocaleString()} blocks`,
              ]}
            />
            <ConstantRow
              term="rewardDistribution"
              parts={[
                `${getDistributionCadence(rewardCycleLength).toLocaleString()} blocks`,
                `${DISTRIBUTIONS_PER_BOND} / term`,
              ]}
            />
            <ConstantRow term="reserve" parts={[`${RESERVE_RATIO_PERCENT}%`]} />
            {
              <ConstantRow
                term="onChainCapacity"
                parts={[formatBtc(toBigInt(featuredBond.parameters?.btc_capacity), 0)]}
              />
            }
          </Stack>
          {/* TODO: no destination exists yet; see STAKING_LINKS.howToParticipate. */}
          <Button
            variant="redesignPrimary"
            size="big"
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={2}
          >
            How to participate
            <Icon w={3.5} h={3.5}>
              <ArrowUpRight weight="bold" />
            </Icon>
          </Button>
        </Stack>
      </Box>
    </Flex>
  );
}
