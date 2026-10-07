'use client';

import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';

import { BondsTable } from './BondsTable';
import { CurrentBond } from './CurrentBond';
import { PeriodsOverview } from './PeriodsOverview';
import { StackingOverview } from './StackingOverview';
import { HowToParticipateButton, StakingStats } from './StakingStats';
import type { Bond, BondRewards, CycleRewards, EnrollmentShare, PoxCycle } from './data';
import type { DailyPrices } from './prices';
import { getBondProjections } from './projections';
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
  rewarded?: BondRewards;
  lastCalculationHeightByCycle?: Record<number, number>;
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
  rewarded,
  lastCalculationHeightByCycle,
  burnBlockTimes,
  prices,
  currentCycleEstimate,
  section,
}: StakingPageData & { section: 'bonds' | 'stacking' }) {
  const { featuredIndex, featuredBond, nextBond, scheduledBonds } = getBondProjections(
    bonds,
    rewardCycleLength,
    currentBurnHeight
  );
  if (section === 'stacking')
    return poxInfo ? (
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
        lastCalculationHeightByCycle={lastCalculationHeightByCycle}
      />
    ) : null;
  return (
    <Stack gap={{ base: 10, lg: 12 }}>
      {bondsUnavailable || !poxInfo ? (
        <Text role="status" textStyle="text-regular-sm" color="textSecondary">
          Some staking data could not be loaded. Refresh the page to try again.
        </Text>
      ) : bonds.length === 0 ? (
        <Text textStyle="text-regular-sm" color="textSecondary">
          No bonds yet. Bonds appear here once they are created on-chain.
        </Text>
      ) : null}
      {!poxInfo && !bondsUnavailable && bonds.length > 0 && (
        <Stack gap={4}>
          <Text as="h2" textStyle="heading-xs">
            Bonds
          </Text>
          <BondsTable
            bonds={bonds}
            currentBurnHeight={undefined}
            nowMs={nowMs}
            rewardsByBond={rewarded?.byBondIndex}
            settlementsByBond={rewarded?.settlementsByBond}
            burnBlockTimes={burnBlockTimes}
          />
        </Stack>
      )}
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
                  ? rewarded.settlementsByBond[featuredIndex]
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
    </Stack>
  );
}
