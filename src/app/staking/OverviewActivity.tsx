'use client';

import { useShallowRouter } from '@/common/hooks/useShallowRouter';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';

import { StakingActivity } from './StakingActivity';
import { ActivityGroup, parseActivityGroup } from './activity-filter';
import type { StakingActivityResult } from './data';

export function OverviewActivity({
  chain,
  api,
  initialGroup,
  initialData,
  initialDataUpdatedAt,
}: {
  chain: string;
  api?: string;
  initialGroup?: ActivityGroup;
  initialData: StakingActivityResult;
  initialDataUpdatedAt: number;
}) {
  const searchParams = useSearchParams();
  const { replace } = useShallowRouter();
  const group = parseActivityGroup(searchParams?.get('activity') ?? undefined);
  const { data, isFetching, isError } = useQuery({
    queryKey: ['staking-activity-feed', chain, api, group],
    queryFn: async ({ signal }): Promise<StakingActivityResult> => {
      const params = new URLSearchParams({ chain });
      if (api !== undefined) params.set('api', api);
      if (group) params.set('activity', group);
      const response = await fetch(`/api/staking/activity?${params}`, { signal });
      if (!response.ok) throw new Error(`Activity request failed: ${response.status}`);
      return response.json();
    },
    initialData: group === initialGroup ? initialData : undefined,
    initialDataUpdatedAt,
    staleTime: THIRTY_SECONDS,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return (
    <StakingActivity
      events={data?.events ?? []}
      selectedGroup={group}
      incomplete={isError || data?.incomplete}
      filterControl={{
        isPending: isFetching,
        onChange: nextGroup => {
          const params = new URLSearchParams(searchParams?.toString() ?? '');
          if (nextGroup) params.set('activity', nextGroup);
          else params.delete('activity');
          replace(null, '', `${window.location.pathname}?${params}${window.location.hash}`);
        },
      }}
    />
  );
}
