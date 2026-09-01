'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { Stack } from '@chakra-ui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { PageTitle } from '../../_components/PageTitle';
import { BackLink } from '../BackLink';
import { BondsTable } from '../BondsTable';
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
  const network = useGlobalContext().activeNetwork;

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
      <Stack gap={4}>
        <BackLink href={buildUrl('/staking', network)}>Staking</BackLink>
        <PageTitle>Bonds</PageTitle>
      </Stack>

      <BondsTable
        bonds={bonds}
        currentBurnHeight={currentBurnHeight}
        nowMs={nowMs}
        rewardsByBond={rewardsByBond}
        rewardCycleLength={rewardCycleLength}
        limit={pageSize}
        pagination={{
          manualPagination: true,
          pageIndex,
          pageSize,
          totalRows: total,
          onPageChange: handlePageChange,
          bordered: false,
          showGoToPage: false,
        }}
      />
    </Stack>
  );
}
