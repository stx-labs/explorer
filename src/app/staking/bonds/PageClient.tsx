'use client';

import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useOptimistic, useTransition } from 'react';

import { BondsTable } from '../BondsTable';
import { SubpageHeader } from '../SubpageHeader';
import type { Bond, BondRewards } from '../data';
import { bondPageHref } from './pagination';

export interface BondsPageData {
  bonds: Bond[];
  unavailable?: boolean;
  total: number;
  pageIndex: number;
  pageSize: number;
  rewardsByBond?: Record<number, bigint>;
  settlementsByBond?: BondRewards['settlementsByBond'];
  burnBlockTimes: Record<number, number>;
  currentBurnHeight: number | undefined;
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
  const [isPending, startTransition] = useTransition();
  const [optimisticPage, setOptimisticPage] = useOptimistic(pageIndex);

  const handlePageChange = useCallback(
    (page: { pageIndex: number }) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      startTransition(() => {
        setOptimisticPage(page.pageIndex);
        router.push(bondPageHref(params, page.pageIndex), { scroll: true });
      });
    },
    [router, searchParams, setOptimisticPage]
  );

  return (
    <Stack gap={6}>
      <SubpageHeader title="Bonds" />

      <Text
        role="status"
        aria-live="polite"
        textStyle="text-regular-xs"
        color="textSecondary"
        minH={4}
      >
        {isPending ? 'Loading bonds…' : ''}
      </Text>
      {!unavailable && currentBurnHeight === undefined && (
        <Text textStyle="text-regular-sm" color="textSecondary">
          Some bond details are unavailable. Refresh the page to try again.
        </Text>
      )}
      <BondsTable
        isPending={isPending}
        bonds={bonds}
        unavailable={unavailable}
        currentBurnHeight={currentBurnHeight}
        nowMs={nowMs}
        rewardsByBond={rewardsByBond}
        settlementsByBond={settlementsByBond}
        burnBlockTimes={burnBlockTimes}
        fullPage
        serverPagination={{
          pageIndex: optimisticPage,
          pageSize,
          totalRows: total,
          onPageChange: handlePageChange,
        }}
      />
    </Stack>
  );
}
