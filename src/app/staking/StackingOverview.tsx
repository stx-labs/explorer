'use client';

import { Card } from '@/common/components/Card';
import { Table } from '@/common/components/table/Table';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { MICROSTACKS_IN_STACKS, abbreviateNumber } from '@/common/utils/utils';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import { Flex, Stack } from '@chakra-ui/react';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { CycleRewards, PoxCycle } from './data';
import { getCycleStackerRewardsSatsBigInt, getStackingYieldForCompletedCycle } from './projections';
import { formatBtc } from './utils';

interface CycleRow {
  cycleNumber: number;
  totalStackedStx: number;
  totalSigners: number;
  /** BTC paid to STX stackers over the cycle, in sats. */
  rewardsSats: bigint;
  apyPercent: number | undefined;
  /**
   * False for cycles that ran before pox-5. The pox-5 contract has no record of
   * them, so it reports zero, and showing that as "0%" would read as "nobody
   * earned anything" instead of "we cannot see it from here".
   */
  hasRewardData: boolean;
}

const cycleColumns: ColumnDef<CycleRow>[] = [
  {
    id: 'cycleNumber',
    header: 'Cycle',
    accessorKey: 'cycleNumber',
    enableSorting: false,
    size: 80,
    cell: info => (
      <Text textStyle="text-medium-sm">{(info.getValue() as number).toLocaleString()}</Text>
    ),
  },
  {
    id: 'totalStackedStx',
    header: 'Total stacked',
    accessorKey: 'totalStackedStx',
    enableSorting: false,
    size: 140,
    meta: { textAlign: 'right' },
    cell: info => (
      <Text textStyle="text-regular-sm" whiteSpace="nowrap">
        {abbreviateNumber(info.getValue() as number, 1)} STX
      </Text>
    ),
  },
  {
    id: 'rewardsSats',
    header: 'BTC rewards',
    accessorKey: 'rewardsSats',
    enableSorting: false,
    size: 130,
    meta: { textAlign: 'right' },
    cell: info => {
      const row = info.row.original;
      return (
        <Text
          textStyle="text-regular-sm"
          color={row.hasRewardData ? 'textPrimary' : 'textSecondary'}
          whiteSpace="nowrap"
        >
          {row.hasRewardData ? formatBtc(row.rewardsSats) : '\u2014'}
        </Text>
      );
    },
  },
  {
    id: 'apyPercent',
    header: 'Gross APY',
    accessorKey: 'apyPercent',
    enableSorting: false,
    size: 110,
    meta: { textAlign: 'right' },
    cell: info => {
      const row = info.row.original;
      return (
        <Text
          textStyle="text-regular-sm"
          color={row.hasRewardData ? 'textPrimary' : 'textSecondary'}
          whiteSpace="nowrap"
        >
          {row.hasRewardData && row.apyPercent !== undefined
            ? `${row.apyPercent.toFixed(2)}%`
            : '\u2014'}
        </Text>
      );
    },
  },
  {
    id: 'totalSigners',
    header: 'Signers',
    accessorKey: 'totalSigners',
    enableSorting: false,
    size: 100,
    meta: { textAlign: 'right' },
    cell: info => (
      <Text textStyle="text-regular-sm">{(info.getValue() as number).toLocaleString()}</Text>
    ),
  },
];

function CycleStat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card padding={5} height="100%" width="100%">
      <Stack gap={2}>
        <Text textStyle="text-medium-xs" color="textSecondary" whiteSpace="nowrap">
          {label}
        </Text>
        <Text textStyle="heading-sm" whiteSpace="nowrap">
          {value}
        </Text>
        {detail && (
          <Text textStyle="text-regular-xs" color="textSecondary">
            {detail}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export function StackingOverview({
  poxInfo,
  cycles,
  currentStakerCount,
  cycleRewards,
  pox5FirstCycleId,
}: {
  poxInfo: PoxInfo;
  cycles: PoxCycle[];
  currentStakerCount?: number;
  cycleRewards: Record<number, CycleRewards>;
  pox5FirstCycleId?: number;
}) {
  const { stxPrice, btcPrice } = useGlobalContext().tokenPrice;
  const currentCycleId = poxInfo?.current_cycle?.id;
  const currentCycleRewardsData =
    currentCycleId !== undefined ? cycleRewards[currentCycleId] : undefined;
  const currentCycleRewards = currentCycleRewardsData
    ? getCycleStackerRewardsSatsBigInt(
        currentCycleRewardsData.rewardsPerMicroStx,
        currentCycleRewardsData.stakedMicroStx
      )
    : undefined;
  const stackedStx = (poxInfo?.current_cycle?.stacked_ustx ?? 0) / MICROSTACKS_IN_STACKS;
  const blocksUntilNextCycle = poxInfo?.next_reward_cycle_in ?? 0;

  const rows = useMemo<CycleRow[]>(
    () =>
      cycles
        // Finished cycles only. The cycle that is still running holds just part
        // of its rewards, so annualising it would understate the rate, and the
        // API also returns cycles that have not started yet, which would show a
        // misleading 0 BTC and 0% against a real staked amount.
        .filter(cycle => currentCycleId === undefined || cycle.cycle_number < currentCycleId)
        .map(cycle => {
          const rewards = cycleRewards[cycle.cycle_number];
          const hasRewardData =
            pox5FirstCycleId !== undefined && cycle.cycle_number >= pox5FirstCycleId;
          const yieldForCycle = rewards
            ? getStackingYieldForCompletedCycle({
                rewardsPerMicroStx: rewards.rewardsPerMicroStx,
                rewardCycleLength: poxInfo?.reward_cycle_length ?? 0,
                btcPriceUsd: btcPrice,
                stxPriceUsd: stxPrice,
              })
            : undefined;
          return {
            cycleNumber: cycle.cycle_number,
            totalStackedStx: Number(cycle.total_stacked_amount ?? 0) / MICROSTACKS_IN_STACKS,
            totalSigners: cycle.total_signers ?? 0,
            rewardsSats: rewards
              ? getCycleStackerRewardsSatsBigInt(rewards.rewardsPerMicroStx, rewards.stakedMicroStx)
              : BigInt(0),
            apyPercent: yieldForCycle?.apyPercent,
            hasRewardData,
          };
        }),
    [cycles, currentCycleId, cycleRewards, pox5FirstCycleId, poxInfo, btcPrice, stxPrice]
  );

  return (
    <Stack gap={5}>
      <Flex gap={3} flexWrap="wrap">
        <Flex flex="1 1 220px" minW="220px">
          <CycleStat label="Current cycle" value={`${currentCycleId ?? '-'}`} />
        </Flex>
        <Flex flex="1 1 220px" minW="220px">
          <CycleStat
            label="Total stacked"
            value={`${abbreviateNumber(stackedStx, 1)} STX`}
            detail="This cycle"
          />
        </Flex>
        <Flex flex="1 1 220px" minW="220px">
          <CycleStat
            label="Next cycle"
            value={`${(currentCycleId ?? 0) + 1}`}
            detail={`in ~${blocksUntilNextCycle.toLocaleString()} blocks`}
          />
        </Flex>
        <Flex flex="1 1 220px" minW="220px">
          {/*
            What STX stackers have earned so far in the cycle that is still
            running. Deliberately not turned into a yearly rate: only part of
            the cycle's payouts have happened, so annualising it now would
            understate the return.
          */}
          <Tooltip
            variant="redesignPrimary"
            size="lg"
            content="BTC paid to STX stackers so far in this cycle. The cycle is still running, so this figure is still growing."
          >
            <CycleStat
              label="BTC rewards this cycle"
              value={currentCycleRewards === undefined ? '-' : formatBtc(currentCycleRewards)}
              detail="so far"
            />
          </Tooltip>
        </Flex>
        <Flex flex="1 1 220px" minW="220px">
          {/*
            Current-only by design. pooled_stacker_count from
            /extended/v2/pox/cycles/:c/signers is accurate for pox-4 cycles but
            reads ~0 from cycle 141 on, and the v3 staking API that has the real
            number accepts no cycle parameter. So there is no per-cycle history
            to put in the table below, only a snapshot of now.
          */}
          <Tooltip
            variant="redesignPrimary"
            size="lg"
            content="Stakers currently registered across all signer managers. Per-cycle history is not available for pox-5 cycles."
          >
            <CycleStat
              label="Stakers"
              value={currentStakerCount === undefined ? '-' : currentStakerCount.toLocaleString()}
              detail="current"
            />
          </Tooltip>
        </Flex>
      </Flex>

      <Stack gap={3}>
        <Text textStyle="heading-xs">Previous cycles</Text>
        <Table data={rows} columns={cycleColumns} />
        {/*
          Every listed cycle predates pox-5, so the rewards and APY columns are
          empty. Saying why beats leaving a column of dashes unexplained. The
          note disappears once a pox-5 cycle completes and fills a row.
        */}
        {pox5FirstCycleId !== undefined && rows.length > 0 && !rows.some(r => r.hasRewardData) && (
          <Text textStyle="text-regular-xs" color="textSecondary">
            BTC rewards and APY are recorded from cycle {pox5FirstCycleId}, when pox-5 took over.
            Earlier cycles are not tracked by the contract.
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
