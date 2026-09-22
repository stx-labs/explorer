'use client';

import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';

import { CurrentBond } from './CurrentBond';
import { PeriodsOverview } from './PeriodsOverview';
import { StackingOverview } from './StackingOverview';
import { StakingActivity } from './StakingActivity';
import { HowToParticipateButton, StakingStats } from './StakingStats';
import { SCHEDULED_BONDS_AHEAD } from './consts';
import type {
  ActivityGroup,
  Bond,
  BondRewards,
  CycleRewards,
  EnrollmentShare,
  PoxCycle,
  StakingActivityEvent,
} from './data';
import type { DailyPrices } from './prices';
import { getFeaturedBondIndex, projectScheduledBonds } from './projections';
import type { CurrentCycleEstimate } from './reward-estimate';

export interface StakingPageData {
  bonds: Bond[];
  bondsUnavailable?: boolean;
  poxInfo?: PoxInfo;
  cycles: PoxCycle[];
  cycleRewards: Record<number, CycleRewards>;
  pox5FirstCycleId?: number;
  currentBurnHeight: number;
  nowMs: number;
  rewardCycleLength: number;
  prepareCycleLength: number;
  firstBurnchainBlockHeight: number;
  enrollments?: EnrollmentShare[];
  activity: StakingActivityEvent[];
  activityIncomplete?: boolean;
  rewarded?: BondRewards;
  selectedActivityGroup?: ActivityGroup;
  burnBlockTimes: Record<number, number>;
  prices?: DailyPrices;
  currentCycleEstimate?: CurrentCycleEstimate;
}

export function StakingPageClient({
  bonds,
  bondsUnavailable,
  poxInfo,
  cycles,
  cycleRewards,
  pox5FirstCycleId,
  currentBurnHeight,
  nowMs,
  rewardCycleLength,
  prepareCycleLength,
  firstBurnchainBlockHeight,
  enrollments,
  activity,
  activityIncomplete,
  rewarded,
  selectedActivityGroup,
  burnBlockTimes,
  prices,
  currentCycleEstimate,
}: StakingPageData) {
  const featuredIndex = getFeaturedBondIndex(bonds);
  const featuredBond = bonds.find(bond => bond.index === featuredIndex);
  const onChainNext = bonds.find(bond => bond.index === (featuredIndex ?? 0) + 1);
  const nextBond = onChainNext
    ? {
        index: onChainNext.index,
        activationHeight: onChainNext.schedule?.activation?.bitcoin_height ?? 0,
        termEndHeight: onChainNext.schedule?.unlock?.bitcoin_height ?? 0,
      }
    : featuredBond && rewardCycleLength
      ? projectScheduledBonds(
          featuredBond.index,
          featuredBond.schedule?.activation?.bitcoin_height ?? 0,
          rewardCycleLength,
          1
        )[0]
      : undefined;

  const lastOnChain = [...bonds].sort((a, b) => b.index - a.index)[0];
  const scheduledBonds =
    lastOnChain && rewardCycleLength
      ? projectScheduledBonds(
          lastOnChain.index,
          lastOnChain.schedule?.activation?.bitcoin_height ?? 0,
          rewardCycleLength,
          SCHEDULED_BONDS_AHEAD
        )
      : [];

  return (
    <Stack gap={{ base: 16, md: 18, lg: 20, xl: 24 }}>
      <Stack gap={{ base: 10, lg: 12 }}>
        <Text as="h1" textStyle="heading-md">
          Bitcoin Staking
        </Text>
        {bondsUnavailable || !poxInfo ? (
          <Text role="status" textStyle="text-regular-sm" color="textSecondary">
            Some staking data could not be loaded. Refresh the page to try again.
          </Text>
        ) : bonds.length === 0 ? (
          <Text textStyle="text-regular-sm" color="textSecondary">
            No bonds yet. Bonds appear here once they are created on-chain.
          </Text>
        ) : null}
        {poxInfo && (
          <>
            <Stack gap={4}>
              <Flex justify="space-between" align="center" gap={4} flexWrap="wrap">
                <Text as="h2" textStyle="heading-xs">
                  Current bond
                </Text>
                <HowToParticipateButton />
              </Flex>
              <StakingStats
                featuredBond={featuredBond}
                rewardCycleLength={rewardCycleLength}
                prepareCycleLength={prepareCycleLength}
                currentBurnHeight={currentBurnHeight}
                nowMs={nowMs}
                rewardsByBond={rewarded?.byBondIndex}
              />
              <CurrentBond
                featuredBond={featuredBond}
                nextBond={nextBond}
                burnBlockTimes={burnBlockTimes}
                settlements={
                  featuredIndex !== undefined && rewarded
                    ? (rewarded.settlementsByBond[featuredIndex] ?? [])
                    : undefined
                }
                enrollments={enrollments}
                rewardCycleLength={rewardCycleLength}
                prepareCycleLength={prepareCycleLength}
                currentBurnHeight={currentBurnHeight}
                nowMs={nowMs}
              />
            </Stack>
            <PeriodsOverview
              settlementsByBond={rewarded?.settlementsByBond}
              burnBlockTimes={burnBlockTimes}
              bonds={bonds}
              featuredIndex={featuredIndex}
              rewardsByBond={rewarded?.byBondIndex}
              scheduledBonds={scheduledBonds}
              rewardCycleLength={rewardCycleLength}
              prepareCycleLength={prepareCycleLength}
              firstBurnchainBlockHeight={firstBurnchainBlockHeight}
              currentBurnHeight={currentBurnHeight}
              nowMs={nowMs}
            />
          </>
        )}
        <StakingActivity
          events={activity}
          selectedGroup={selectedActivityGroup}
          incomplete={activityIncomplete}
        />
      </Stack>
      {poxInfo && (
        <StackingOverview
          currentCycleEstimate={currentCycleEstimate}
          prices={prices}
          poxInfo={poxInfo}
          cycles={cycles}
          cycleRewards={cycleRewards}
          pox5FirstCycleId={pox5FirstCycleId}
          firstBurnchainBlockHeight={firstBurnchainBlockHeight}
          currentBurnHeight={currentBurnHeight}
          nowMs={nowMs}
          burnBlockTimes={burnBlockTimes}
          lastCalculationHeightByCycle={rewarded?.lastCalculationHeightByCycle}
        />
      )}
    </Stack>
  );
}
