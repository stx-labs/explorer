'use client';

import { Stack } from '@chakra-ui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { BondsTable } from '../BondsTable';
import { SubpageHeader } from '../SubpageHeader';
import { Bond, BondRewards } from '../data';

export interface BondsPageData {
  bonds: Bond[];
  unavailable?: boolean;
  total: number;
  pageIndex: number;
  pageSize: number;
  rewardsByBond?: Record<number, bigint>;
  settlementsByBond?: BondRewards['settlementsByBond'];
  burnBlockTimes: Record<number, number>;
  currentBurnHeight: number;
  nowMs: number;
}

export function BondsPageClient({
  bonds,
  unavailable,
  total,
  pageIndex,
  pageSize,
  rewardsByBond,
  settlementsByBond,
  burnBlockTimes,
  currentBurnHeight,
  nowMs,
}: BondsPageData) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = useCallback(
    (page: { pageIndex: number }) => {
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
      <SubpageHeader title="Bonds" />

      <BondsTable
        bonds={bonds}
        unavailable={unavailable}
        currentBurnHeight={currentBurnHeight}
        nowMs={nowMs}
        rewardsByBond={rewardsByBond}
        settlementsByBond={settlementsByBond}
        burnBlockTimes={burnBlockTimes}
        fullPage
        serverPagination={{
          pageIndex,
          pageSize,
          totalRows: total,
          onPageChange: handlePageChange,
        }}
      />
    </Stack>
  );
}
