'use client';

import { Card } from '@/common/components/Card';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { formatDateShort } from '@/common/utils/date-utils';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Flex, Stack } from '@chakra-ui/react';
import { ReactNode } from 'react';

import { Bond } from './data';
import { DistributionSchedule } from './projections';
import {
  aggregateBondTotals,
  formatBtc,
  formatStx,
  formatUsd,
  microStxToStx,
  satsToBtc,
} from './utils';

function Stat({
  label,
  value,
  detail,
  caption,
}: {
  label: string;
  value: string;
  detail?: ReactNode;
  /**
   * Says what the number actually measures. These cards mix a snapshot of what
   * is locked right now with a running total paid out since bonds began, and
   * without this they look like the same kind of measurement.
   */
  caption?: string;
}) {
  return (
    <Card padding={5} height="100%" width="100%">
      <Stack gap={2}>
        <Text textStyle="text-medium-xs" color="textSecondary" whiteSpace="nowrap">
          {label}
        </Text>
        <Text textStyle="heading-sm" whiteSpace="nowrap">
          {value}
        </Text>
        {typeof detail === 'string' ? (
          <Text textStyle="text-regular-xs" color="textSecondary">
            {detail}
          </Text>
        ) : (
          detail
        )}
        {caption && (
          <Text textStyle="text-regular-xs" color="textTertiary">
            {caption}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export function StakingStats({
  bonds,
  distribution,
}: {
  bonds: Bond[];
  distribution: DistributionSchedule;
}) {
  const { stxPrice, btcPrice } = useGlobalContext().tokenPrice;
  const totals = aggregateBondTotals(bonds);

  const bondedBtc = satsToBtc(totals.lockedSats);
  const lockedStx = microStxToStx(totals.lockedMicroStx);

  // Target and pairing rates are bond parameters, not global constants, so they
  // are only meaningful as a headline when every bond agrees. Show a range
  // otherwise rather than silently picking one bond's value.
  const targetRates = Array.from(new Set(bonds.map(b => b.parameters?.target_rate_bps ?? 0)));
  const pairingRates = Array.from(new Set(bonds.map(b => b.parameters?.minimum_stx_ratio ?? 0)));
  const formatRateSet = (rates: number[]) => {
    if (rates.length === 0) return '-';
    const sorted = [...rates].sort((a, b) => a - b);
    const asPercent = (bps: number) => `${(bps / 100).toFixed(2)}%`;
    return sorted.length === 1
      ? asPercent(sorted[0])
      : `${asPercent(sorted[0])} - ${asPercent(sorted[sorted.length - 1])}`;
  };

  return (
    <Flex gap={3} flexWrap="wrap">
      <Flex flex="1 1 220px" minW="220px">
        <Stat
          label="Total BTC bonded"
          value={formatBtc(totals.lockedSats)}
          detail={btcPrice ? formatUsd(bondedBtc * btcPrice) : undefined}
          caption="Currently locked"
        />
      </Flex>
      <Flex flex="1 1 220px" minW="220px">
        <Stat
          label="Total STX locked"
          value={formatStx(totals.lockedMicroStx)}
          detail={stxPrice ? formatUsd(lockedStx * stxPrice) : undefined}
          caption="Currently locked"
        />
      </Flex>
      <Flex flex="1 1 220px" minW="220px">
        <Stat
          label="Total BTC paid out"
          /*
           * Rewards accrue per distribution but only move on a claim, so this
           * counts what has actually been transferred out. A bond can have
           * earned rewards that nobody has claimed, which reads as zero here.
           */
          value={formatBtc(totals.paidOutSats)}
          detail={btcPrice ? formatUsd(satsToBtc(totals.paidOutSats) * btcPrice) : undefined}
          caption="Claimed to date, across all bonds"
        />
      </Flex>
      <Flex flex="1 1 220px" minW="220px">
        <Stat
          label="Target reward rate"
          value={formatRateSet(targetRates)}
          detail={`STX pairing ${formatRateSet(pairingRates)}`}
        />
      </Flex>
      <Flex flex="1 1 220px" minW="220px">
        {/*
          Distributions land on a global grid anchored to the chain's first
          burnchain block, so this is a page-level stat rather than a per-bond
          column. See projections.getDistributionSchedule.
        */}
        <Tooltip
          variant="redesignPrimary"
          size="lg"
          content={`Projected at 10 minutes per block. ${distribution.blocksUntilNext.toLocaleString()} blocks remaining.`}
        >
          <Stat
            label="Next reward distribution"
            value={`#${distribution.nextHeight.toLocaleString()}`}
            detail={`~ ${formatDateShort(distribution.nextApproximateTimestamp)}`}
            caption={`Latest #${distribution.latestHeight.toLocaleString()} · ~${formatDateShort(distribution.latestApproximateTimestamp)}`}
          />
        </Tooltip>
      </Flex>
    </Flex>
  );
}
