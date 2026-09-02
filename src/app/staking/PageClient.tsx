'use client';

import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';

import { CurrentBond } from './CurrentBond';
import { PeriodsOverview } from './PeriodsOverview';
import { StackingOverview } from './StackingOverview';
import { StakingActivity } from './StakingActivity';
import { HowToParticipateButton, StakingStats } from './StakingStats';
import { SCHEDULED_BONDS_AHEAD, SHOW_SCHEDULED_BONDS } from './consts';
import {
  Bond,
  BondRewards,
  CycleRewards,
  EnrollmentShare,
  PoxCycle,
  StakingActivityEvent,
} from './data';
import { DailyPrices } from './prices';
import { getFeaturedBondIndex, projectScheduledBonds } from './projections';

export interface StakingPageData {
  bonds: Bond[];
  poxInfo?: PoxInfo;
  cycles: PoxCycle[];
  cycleRewards: Record<number, CycleRewards>;
  pox5FirstCycleId?: number;
  currentBurnHeight: number;
  /** Passed in from the server so the client renders the same dates. */
  nowMs: number;
  rewardCycleLength: number;
  prepareCycleLength: number;
  firstBurnchainBlockHeight: number;
  enrollments: EnrollmentShare[];
  activity: StakingActivityEvent[];
  /** BTC rewarded by bonds to date, which differs from what has been claimed. */
  rewarded?: BondRewards;
  selectedActivityGroup?: string;
  chain: string;
  /** Bitcoin taken in by the running cycle so far, measured from payouts. */
  currentCycleAccruedSats?: string;
  /** Daily price history, so settled cycles are priced at the time they ended. */
  prices?: DailyPrices;
  /** Real cycle end times, where the chain has been asked for them. */
  cycleEndTimes?: Record<number, number>;
}

export function StakingPageClient({
  bonds,
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
  rewarded,
  selectedActivityGroup,
  chain,
  currentCycleAccruedSats,
  prices,
  cycleEndTimes,
}: StakingPageData) {
  // The bond to feature, and the one after it. The next bond may not exist on
  // chain yet, in which case its term comes from the contract's fixed cadence.
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

  // Bonds the cadence guarantees beyond the last one on chain, so the timeline
  // reads forward rather than stopping at whatever exists today.
  const lastOnChain = [...bonds].sort((a, b) => b.index - a.index)[0];
  const scheduledBonds =
    SHOW_SCHEDULED_BONDS && lastOnChain && rewardCycleLength
      ? projectScheduledBonds(
          lastOnChain.index,
          lastOnChain.schedule?.activation?.bitcoin_height ?? 0,
          rewardCycleLength,
          SCHEDULED_BONDS_AHEAD
        )
      : [];

  // The same rhythm as the home page: a large gap between sections, and a
  // small one between a section's heading and its content.
  return (
    <Stack gap={{ base: 16, md: 18, lg: 20, xl: 24 }}>
      {/* One top-level heading over the bond sections, which are its
          subheadings: the current bond, where it sits among the others, and
          what has happened to them. */}
      <Stack gap={{ base: 10, lg: 12 }}>
        <Text textStyle="heading-md">Bitcoin Staking</Text>
        <Stack gap={4}>
          <Flex justify="space-between" align="center" gap={4} flexWrap="wrap">
            <Text textStyle="heading-xs">Current bond</Text>
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
            bonds={bonds}
            featuredBond={featuredBond}
            nextBond={nextBond}
            enrollments={enrollments}
            rewardCycleLength={rewardCycleLength}
            prepareCycleLength={prepareCycleLength}
            firstBurnchainBlockHeight={firstBurnchainBlockHeight}
            currentBurnHeight={currentBurnHeight}
            nowMs={nowMs}
          />
        </Stack>
        <PeriodsOverview
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
        <StakingActivity events={activity} selectedGroup={selectedActivityGroup} />
      </Stack>
      {poxInfo && (
        <StackingOverview
          poxInfo={poxInfo}
          cycles={cycles}
          cycleRewards={cycleRewards}
          pox5FirstCycleId={pox5FirstCycleId}
          firstBurnchainBlockHeight={firstBurnchainBlockHeight}
          currentBurnHeight={currentBurnHeight}
          nowMs={nowMs}
          currentCycleAccruedSats={currentCycleAccruedSats}
          bondRewardsByCycle={rewarded?.byCycle}
          prices={prices}
          cycleEndTimes={cycleEndTimes}
        />
      )}
    </Stack>
  );
}
