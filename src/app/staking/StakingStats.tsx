'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight } from '@phosphor-icons/react';

import { GlossaryTerm } from './GlossaryTerm';
import { BOND_TERM_CYCLES, DISTRIBUTIONS_PER_BOND, RESERVE_RATIO_PERCENT } from './consts';
import { Bond } from './data';
import { GLOSSARY } from './glossary';
import { getBondProgress, getBondSchedule, getDistributionCadence } from './projections';
import {
  aggregateBondTotals,
  formatBtc,
  formatStx,
  formatUsd,
  microStxToStx,
  satsToBtc,
  toBigInt,
} from './utils';

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
    <Stack gap={2} flex="1 1 9rem" minW="8rem">
      <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
        {label}
      </Text>
      <Flex gap={1.5} align="baseline">
        <Text textStyle="heading-md" whiteSpace="nowrap">
          {value}
        </Text>
        {unit && (
          <Text textStyle="text-regular-sm" color="textSecondary">
            {unit}
          </Text>
        )}
      </Flex>
      {caption && (
        <Text textStyle="text-regular-xs" color="textSecondary" whiteSpace="nowrap">
          {caption}
        </Text>
      )}
    </Stack>
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
  bonds,
  featuredBond,
  rewardCycleLength,
  prepareCycleLength,
  currentBurnHeight,
}: {
  bonds: Bond[];
  /** The bond whose per-bond figures the captions describe. */
  featuredBond?: Bond;
  rewardCycleLength: number;
  prepareCycleLength: number;
  currentBurnHeight: number;
}) {
  const { stxPrice, btcPrice } = useGlobalContext().tokenPrice;
  const totals = aggregateBondTotals(bonds);

  const bondedBtc = satsToBtc(totals.lockedSats);
  const lockedStx = microStxToStx(totals.lockedMicroStx);

  const rates = Array.from(new Set(bonds.map(b => b.parameters?.target_rate_bps ?? 0)));
  const pairing = Array.from(new Set(bonds.map(b => b.parameters?.minimum_stx_ratio ?? 0)));
  const rateLabel = (values: number[]) => {
    if (values.length === 0) return '-';
    const sorted = [...values].sort((a, b) => a - b);
    const pct = (bps: number) => `${(bps / 100).toFixed(1)}%`;
    return sorted.length === 1
      ? pct(sorted[0])
      : `${pct(sorted[0])} - ${pct(sorted[sorted.length - 1])}`;
  };

  // Disbursement progress and the STX unlock height describe one bond, so they
  // follow the featured bond rather than the aggregate.
  let distributions: string | undefined;
  let stxUnlock: string | undefined;
  if (featuredBond) {
    const schedule = getBondSchedule(
      featuredBond.schedule?.activation?.bitcoin_height ?? 0,
      featuredBond.schedule?.unlock?.bitcoin_height ?? 0,
      rewardCycleLength,
      prepareCycleLength
    );
    const progress = getBondProgress(schedule, currentBurnHeight, rewardCycleLength);
    distributions = `${progress.paid}/${progress.total} distributions`;
    stxUnlock = `unlocks #${schedule.stxUnlockHeight.toLocaleString()}`;
  }

  const usd = (amount: number, price?: number) => (price ? formatUsd(amount * price) : undefined);
  const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ') || undefined;

  return (
    <Flex gap={3} flexDirection={{ base: 'column', lg: 'row' }} align="stretch">
      <Box
        bg="surfaceSecondary"
        borderRadius="redesign.xl"
        p={[4, 6]}
        flex={{ base: '1 1 auto', lg: '3 1 0' }}
        minW={0}
      >
        <Flex gap={6} flexWrap="wrap">
          <Stat
            label={<GlossaryTerm entry="targetRewardRate" />}
            value={rateLabel(rates)}
            caption={
              // With no bonds there is no pairing rate to qualify, and "≥-"
              // reads as a broken value rather than an absent one.
              pairing.length > 0 ? (
                <>
                  <GlossaryTerm entry="stxPairing">STX pairing</GlossaryTerm> ≥{rateLabel(pairing)}
                </>
              ) : undefined
            }
          />
          <Stat
            label="BTC bonded"
            value={formatBtc(totals.lockedSats, 1).replace(' BTC', '')}
            unit="BTC"
            caption={usd(bondedBtc, btcPrice)}
          />
          <Stat
            label="BTC paid out"
            value={formatBtc(totals.paidOutSats, 4).replace(' BTC', '')}
            unit="BTC"
            caption={join(usd(satsToBtc(totals.paidOutSats), btcPrice), distributions)}
          />
          <Stat
            label="STX paired"
            value={formatStx(totals.lockedMicroStx).replace(' STX', '')}
            unit="STX"
            caption={join(usd(lockedStx, stxPrice), stxUnlock)}
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
        minW={0}
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
            {featuredBond && (
              <ConstantRow
                term="onChainCapacity"
                parts={[formatBtc(toBigInt(featuredBond.parameters?.btc_capacity), 0)]}
              />
            )}
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
