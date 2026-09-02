'use client';

import { Stack } from '@chakra-ui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { BondsTable } from '../BondsTable';
import { SubpageHeader } from '../SubpageHeader';
import { Bond } from '../data';

export interface BondsPageData {
  bonds: Bond[];
  total: number;
  pageIndex: number;
  pageSize: number;
  rewardsByBond?: Record<number, bigint>;
  rewardCycleLength: number;
  currentBurnHeight: number;
  nowMs: number;
}

export function BondsPageClient({
  bonds,
  total,
  pageIndex,
  pageSize,
  rewardsByBond,
  rewardCycleLength,
  currentBurnHeight,
  nowMs,
}: BondsPageData) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Paging lives in the URL so a page of bonds can be linked to directly.
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
        currentBurnHeight={currentBurnHeight}
        nowMs={nowMs}
        rewardsByBond={rewardsByBond}
        rewardCycleLength={rewardCycleLength}
        limit={pageSize}
        fullPage
        pagination={{
          manualPagination: true,
          pageIndex,
          pageSize,
          totalRows: total,
          onPageChange: handlePageChange,
        }}
      />
    </Stack>
  );
}
