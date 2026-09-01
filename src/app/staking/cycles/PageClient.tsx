'use client';

import { Table } from '@/common/components/table/Table';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { Text } from '@/ui/Text';
import { Flex, Stack } from '@chakra-ui/react';
import { PaginationState } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { PageTitle } from '../../_components/PageTitle';
import { BackLink } from '../BackLink';
import { CycleRow, cycleColumns, toCycleRow } from '../cycleColumns';
import { CycleRewards, PoxCycle } from '../data';
import { DailyPrices } from '../prices';
import { burnHeightToApproximateTimestamp } from '../projections';

export interface CyclesPageData {
  cycles: PoxCycle[];
  cycleRewards: Record<number, CycleRewards>;
  total: number;
  pageIndex: number;
  pageSize: number;
  currentCycleId?: number;
  pox5FirstCycleId?: number;
  rewardCycleLength: number;
  firstBurnchainBlockHeight: number;
  currentBurnHeight: number;
  nowMs: number;
  /** Daily price history, so each cycle is priced at the time it ended. */
  prices?: DailyPrices;
  /** Real cycle end times, where the chain has been asked for them. */
  cycleEndTimes?: Record<number, number>;
}

export function CyclesPageClient({
  cycles,
  cycleRewards,
  total,
  pageIndex,
  pageSize,
  currentCycleId,
  pox5FirstCycleId,
  rewardCycleLength,
  firstBurnchainBlockHeight,
  currentBurnHeight,
  nowMs,
  prices,
  cycleEndTimes,
}: CyclesPageData) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const network = useGlobalContext().activeNetwork;
  const { stxPrice, btcPrice } = useGlobalContext().tokenPrice;

  const cycleStartHeight = useCallback(
    (cycleNumber: number) => firstBurnchainBlockHeight + cycleNumber * rewardCycleLength,
    [firstBurnchainBlockHeight, rewardCycleLength]
  );
  const at = useCallback(
    (height: number) => burnHeightToApproximateTimestamp(height, currentBurnHeight, nowMs),
    [currentBurnHeight, nowMs]
  );

  const rows = useMemo<CycleRow[]>(
    () =>
      cycles
        // Finished cycles only, matching the section on the staking page.
        .filter(cycle => currentCycleId === undefined || cycle.cycle_number < currentCycleId)
        .map(cycle =>
          toCycleRow({
            cycle,
            rewards: cycleRewards[cycle.cycle_number],
            pox5FirstCycleId,
            rewardCycleLength,
            cycleStartHeight,
            at,
            btcPrice,
            stxPrice,
            prices,
            cycleEndTimes,
          })
        ),
    [
      cycles,
      currentCycleId,
      cycleRewards,
      pox5FirstCycleId,
      rewardCycleLength,
      cycleStartHeight,
      at,
      btcPrice,
      stxPrice,
      prices,
      cycleEndTimes,
    ]
  );

  // Paging lives in the URL so a page of history can be linked to directly.
  const handlePageChange = useCallback(
    (page: PaginationState) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (page.pageIndex > 0) {
        params.set('page', String(page.pageIndex + 1));
      } else {
        params.delete('page');
      }
      const query = params.toString();
      router.push(query ? `?${query}` : '?', { scroll: true });
    },
    [router, searchParams]
  );

  return (
    <Stack gap={6}>
      <Stack gap={4}>
        <BackLink href={buildUrl('/staking', network)}>Staking</BackLink>
        <PageTitle>Stacking cycles</PageTitle>
      </Stack>

      <Stack gap={3}>
        <Table
          data={rows}
          columns={cycleColumns}
          pagination={{
            manualPagination: true,
            pageIndex,
            pageSize,
            totalRows: total,
            onPageChange: handlePageChange,
            // The table has no bordered container here, so the controls would
            // otherwise render as a floating outlined box.
            bordered: false,
            showGoToPage: false,
          }}
        />
        <Flex justify="flex-start">
          <Text textStyle="text-regular-xs" color="textSecondary">
            Signer count, not stacker count. Rewards and APY start at the first pox-5 cycle; earlier
            cycles have no reward record on chain.
          </Text>
        </Flex>
      </Stack>
    </Stack>
  );
}
