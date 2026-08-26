'use client';

import { formatDateShort } from '@/common/utils/date-utils';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Box, Flex, Stack } from '@chakra-ui/react';

import { STAKING_APP_URL } from './consts';
import { Bond } from './data';
import {
  bpsToPercent,
  burnHeightToApproximateTimestamp,
  formatTermDuration,
  formatTimeRemaining,
  getBondFillRatio,
  getFeaturedBondIndex,
} from './projections';
import { formatBtc, formatPercent, getBondDisplayName, toBigInt } from './utils';

/** A labelled value inside one of the card's panels. */
function PanelStat({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={1} flex="1 1 45%" minW="8rem">
      <Text textStyle="text-regular-sm" color="textSecondary" whiteSpace="nowrap">
        {label}
      </Text>
      <Text textStyle="heading-sm" whiteSpace="nowrap">
        {value}
      </Text>
    </Stack>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={4} bg="surfacePrimary" borderRadius="redesign.lg" p={[4, 5]} flex={1}>
      <Text textStyle="text-regular-sm" color="textSecondary">
        {title}
      </Text>
      <Flex gap={4} flexWrap="wrap">
        {children}
      </Flex>
    </Stack>
  );
}

/**
 * The bond someone landing on the page could act on, shown as a hero card.
 *
 * Mirrors the staking app's "Upcoming Bonds" card so the two properties read
 * the same way, minus the parts that need a connected wallet: the app shows
 * "Your seat" and an Enroll button, which the Explorer cannot know or do. That
 * space carries capacity instead, which the Explorer does know.
 *
 * Renders nothing when no bond exists on chain; the bonds table already says so.
 */
export function BondContextStrip({
  bonds,
  currentBurnHeight,
  nowMs,
}: {
  bonds: Bond[];
  currentBurnHeight: number;
  nowMs: number;
}) {
  const featuredIndex = getFeaturedBondIndex(bonds);
  const bond = bonds.find(b => b.index === featuredIndex);
  if (!bond) return null;

  const activationHeight = bond.schedule?.activation?.bitcoin_height ?? 0;
  const unlockHeight = bond.schedule?.unlock?.bitcoin_height ?? 0;
  const activationMs = burnHeightToApproximateTimestamp(activationHeight, currentBurnHeight, nowMs);
  const unlockMs = burnHeightToApproximateTimestamp(unlockHeight, currentBurnHeight, nowMs);
  const term = formatTermDuration(unlockHeight - activationHeight);

  const capacitySats = toBigInt(bond.parameters?.btc_capacity);
  const lockedSats = toBigInt(bond.balances?.locked?.btc);
  const isEnrolling = bond.status === 'upcoming';
  const blocksUntilStart = activationHeight - currentBurnHeight;
  const timeUntilStart = blocksUntilStart > 0 ? formatTimeRemaining(blocksUntilStart) : '';
  const appUrl = STAKING_APP_URL;

  return (
    <Stack gap={3}>
      <Text textStyle="heading-xs">{isEnrolling ? 'Upcoming bond' : 'Current bond'}</Text>
      <Flex
        gap={[3, 4]}
        p={[3, 4]}
        borderRadius="redesign.xl"
        border="1px solid"
        borderColor={isEnrolling ? 'accent.bitcoin-500' : 'redesignBorderSecondary'}
        boxShadow={isEnrolling ? '0px 0px 0px 4px rgba(255, 133, 18, 0.15)' : undefined}
        flexDirection={{ base: 'column', lg: 'row' }}
      >
        {/* Identity and, when the bond has not started, what to do about it. */}
        <Stack
          gap={6}
          bg="surfacePrimary"
          borderRadius="redesign.lg"
          p={[4, 5]}
          flex={1}
          justify="space-between"
        >
          <Stack gap={1}>
            <Text textStyle="text-mono-sm" color="textPrimary">
              {activationHeight.toLocaleString()} &rarr; {unlockHeight.toLocaleString()}
            </Text>
            <Text textStyle="text-regular-xs" color="textSecondary" suppressHydrationWarning>
              ~{formatDateShort(activationMs)} &mdash; ~{formatDateShort(unlockMs)}
              {term && ` · ${term}`}
            </Text>
            <Text textStyle="heading-lg" mt={2}>
              {getBondDisplayName(bond)}
            </Text>
          </Stack>

          {isEnrolling && (
            <Stack gap={3} bg="surfaceFourth" borderRadius="redesign.md" p={[3, 4]}>
              <Flex justify="space-between" gap={3} flexWrap="wrap" align="baseline">
                <Text textStyle="text-medium-sm">Enrollment open</Text>
                <Text
                  textStyle="text-regular-sm"
                  color="textSecondary"
                  suppressHydrationWarning
                  whiteSpace="nowrap"
                >
                  ~{formatDateShort(activationMs)}
                  {timeUntilStart && ` · ${timeUntilStart} left`}
                </Text>
              </Flex>
              {appUrl && (
                <Button
                  asChild
                  variant="redesignPrimary"
                  size="big"
                  width="100%"
                  // asChild hands these styles to the anchor, which is not a
                  // flex container by default, so centring has to be explicit.
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  aria-label="Get started with Bitcoin Staking"
                >
                  <a href={appUrl} target="_blank" rel="noopener noreferrer">
                    Get started
                  </a>
                </Button>
              )}
            </Stack>
          )}
        </Stack>

        {/* The app puts "Your seat" here. Without a wallet we show capacity. */}
        <Stack gap={[3, 4]} flex={1}>
          <Panel title="Capacity">
            <PanelStat label="Total" value={formatBtc(capacitySats, 2)} />
            <PanelStat
              label="Filled"
              value={formatPercent(getBondFillRatio(lockedSats, capacitySats))}
            />
          </Panel>
          <Panel title="Period parameters">
            <PanelStat
              label="Target APY"
              value={`${bpsToPercent(bond.parameters?.target_rate_bps ?? 0).toFixed(2)}%`}
            />
            <PanelStat
              label="STX collateral ratio"
              value={`${bpsToPercent(bond.parameters?.minimum_stx_ratio ?? 0).toFixed(2)}%`}
            />
          </Panel>
        </Stack>
      </Flex>
    </Stack>
  );
}
