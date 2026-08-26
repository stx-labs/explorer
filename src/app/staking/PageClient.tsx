'use client';

import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';

import { PageTitle } from '../_components/PageTitle';
import { BondContextStrip } from './BondContextStrip';
import { BondsTable } from './BondsTable';
import { PeriodsOverview } from './PeriodsOverview';
import { StackingOverview } from './StackingOverview';
import { StakingActivity } from './StakingActivity';
import { StakingStats } from './StakingStats';
import { BONDS_TABLE_LIMIT } from './consts';
import { Bond, CycleRewards, PoxCycle, StakingActivityTx } from './data';
import { DistributionSchedule } from './projections';

export interface StakingPageData {
  bonds: Bond[];
  /** Bonds on chain, which can exceed the number fetched. */
  bondsTotal: number;
  poxInfo?: PoxInfo;
  cycles: PoxCycle[];
  distribution?: DistributionSchedule;
  currentStakerCount?: number;
  cycleRewards: Record<number, CycleRewards>;
  pox5FirstCycleId?: number;
  currentBurnHeight: number;
  /** Passed in from the server so the client renders the same dates. */
  nowMs: number;
  activity: StakingActivityTx[];
  activityActions: string[];
  selectedAction?: string;
  chain: string;
}

export function StakingPageClient({
  bonds,
  bondsTotal,
  poxInfo,
  cycles,
  distribution,
  currentStakerCount,
  cycleRewards,
  pox5FirstCycleId,
  currentBurnHeight,
  nowMs,
  activity,
  activityActions,
  selectedAction,
  chain,
}: StakingPageData) {
  return (
    <Stack gap={12}>
      <PageTitle>Staking</PageTitle>

      <Stack gap={5}>
        <Text textStyle="heading-md">Bitcoin Staking</Text>
        <BondContextStrip bonds={bonds} currentBurnHeight={currentBurnHeight} nowMs={nowMs} />
        {distribution && <StakingStats bonds={bonds} distribution={distribution} />}
        <Stack gap={3}>
          <Flex align="baseline" gap={2} flexWrap="wrap">
            <Text textStyle="heading-xs">Bonds</Text>
            {bondsTotal > BONDS_TABLE_LIMIT && (
              <Text textStyle="text-regular-xs" color="textSecondary">
                Most recent {Math.min(BONDS_TABLE_LIMIT, bonds.length)} of {bondsTotal}
              </Text>
            )}
          </Flex>
          <BondsTable bonds={bonds} currentBurnHeight={currentBurnHeight} nowMs={nowMs} />
        </Stack>
        <PeriodsOverview
          bonds={bonds}
          bondsTotal={bondsTotal}
          currentBurnHeight={currentBurnHeight}
          nowMs={nowMs}
        />
        <StakingActivity
          transactions={activity}
          availableActions={activityActions}
          selectedAction={selectedAction}
        />
      </Stack>

      {poxInfo && (
        <Stack gap={5}>
          <Text textStyle="heading-md">Stacking</Text>
          <StackingOverview
            poxInfo={poxInfo}
            cycles={cycles}
            currentStakerCount={currentStakerCount}
            cycleRewards={cycleRewards}
            pox5FirstCycleId={pox5FirstCycleId}
          />
        </Stack>
      )}
    </Stack>
  );
}
