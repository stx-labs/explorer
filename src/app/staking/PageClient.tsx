'use client';

import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';

import { CurrentBond } from './CurrentBond';
import { PeriodsOverview } from './PeriodsOverview';
import { StackingOverview } from './StackingOverview';
import { StakingActivity } from './StakingActivity';
import { StakingStats } from './StakingStats';
import { SCHEDULED_BONDS_AHEAD, SHOW_SCHEDULED_BONDS } from './consts';
import { Bond, CycleRewards, PoxCycle, StakingActivityEvent } from './data';
import { getFeaturedBondIndex, projectScheduledBonds } from './projections';

export interface StakingPageData {
  bonds: Bond[];
  /** Bonds on chain, which can exceed the number fetched. */
  bondsTotal: number;
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
  activity: StakingActivityEvent[];
  selectedActivityGroup?: string;
  chain: string;
}

export function StakingPageClient({
  bonds,
  bondsTotal,
  poxInfo,
  cycles,
  cycleRewards,
  pox5FirstCycleId,
  currentBurnHeight,
  nowMs,
  rewardCycleLength,
  prepareCycleLength,
  firstBurnchainBlockHeight,
  activity,
  selectedActivityGroup,
  chain,
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

  return (
    <Stack gap={12}>
      <Stack gap={5}>
        <Text textStyle="heading-md">Bitcoin Staking</Text>
        <StakingStats
          bonds={bonds}
          featuredBond={featuredBond}
          rewardCycleLength={rewardCycleLength}
          prepareCycleLength={prepareCycleLength}
          currentBurnHeight={currentBurnHeight}
        />
        <PeriodsOverview
          bonds={bonds}
          bondsTotal={bondsTotal}
          featuredIndex={featuredIndex}
          scheduledBonds={scheduledBonds}
          rewardCycleLength={rewardCycleLength}
          currentBurnHeight={currentBurnHeight}
          nowMs={nowMs}
        />
        <CurrentBond
          bonds={bonds}
          featuredBond={featuredBond}
          nextBond={nextBond}
          rewardCycleLength={rewardCycleLength}
          prepareCycleLength={prepareCycleLength}
          firstBurnchainBlockHeight={firstBurnchainBlockHeight}
          currentBurnHeight={currentBurnHeight}
          nowMs={nowMs}
        />
        <StakingActivity events={activity} selectedGroup={selectedActivityGroup} />
      </Stack>

      {poxInfo && (
        <Stack gap={5}>
          <StackingOverview
            poxInfo={poxInfo}
            cycles={cycles}
            cycleRewards={cycleRewards}
            pox5FirstCycleId={pox5FirstCycleId}
            firstBurnchainBlockHeight={firstBurnchainBlockHeight}
            currentBurnHeight={currentBurnHeight}
            nowMs={nowMs}
          />
        </Stack>
      )}
    </Stack>
  );
}
