import { NetworkModes } from '@/common/types/network';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';
import { Suspense } from 'react';

import { ActivitySection } from './ActivitySection';
import { StakingPageClient } from './PageClient';
import { StakingLoading } from './StakingLoading';
import { UnsupportedStakingNetwork } from './UnsupportedStakingNetwork';
import { parseActivityGroup } from './activity-filter';
import { loadStakingOverview } from './overview-data';
import { getStakingPageApiUrl } from './page-network';

async function OverviewSection({
  data,
  section,
}: {
  data: ReturnType<typeof loadStakingOverview>['bonds'];
  section: 'bonds' | 'stacking';
}) {
  return <StakingPageClient {...await data} section={section} />;
}

export default async function StakingPage({
  searchParams,
}: {
  searchParams: Promise<{ chain?: string; api?: string; activity?: string }>;
}) {
  const params = await searchParams;
  const { chain = NetworkModes.Mainnet, api, activity } = params;
  const allowedApi = getStakingPageApiUrl('/staking', params);
  if (!allowedApi) return <UnsupportedStakingNetwork />;
  const group = parseActivityGroup(activity);
  // Start independent section loaders; activity filters do not reload the overview.
  const data = loadStakingOverview(chain, allowedApi);
  return (
    <Stack gap={{ base: 16, md: 18, lg: 20, xl: 24 }}>
      <Stack gap={{ base: 10, lg: 12 }}>
        <Text as="h1" textStyle="heading-md" color="textPrimary">
          Bitcoin Staking
        </Text>
        <Suspense fallback={<StakingLoading label="Loading bonds…" />}>
          <OverviewSection data={data.bonds} section="bonds" />
        </Suspense>
        <Suspense
          key={`${chain}:${api ?? ''}:${group ?? 'all'}`}
          fallback={<StakingLoading label="Loading activity…" />}
        >
          <ActivitySection chain={chain} api={allowedApi} group={group} />
        </Suspense>
      </Stack>
      <Suspense fallback={<StakingLoading label="Loading STX staking…" />}>
        <OverviewSection data={data.stacking} section="stacking" />
      </Suspense>
    </Stack>
  );
}
