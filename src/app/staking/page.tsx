import { getAllowedStakingApiUrl } from '@/api/server-api-origin';
import { NetworkModes } from '@/common/types/network';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';
import { Suspense } from 'react';

import { ActivitySection } from './ActivitySection';
import { StakingPageClient } from './PageClient';
import { StakingLoading } from './StakingLoading';
import { UnsupportedStakingNetwork } from './UnsupportedStakingNetwork';
import { parseActivityGroup } from './data';
import { loadStakingOverview } from './overview-data';

async function OverviewSection({
  data,
  section,
}: {
  data: ReturnType<typeof loadStakingOverview>;
  section: 'bonds' | 'stacking';
}) {
  return <StakingPageClient {...await data} section={section} />;
}

export default async function StakingPage({
  searchParams,
}: {
  searchParams: Promise<{ chain?: string; api?: string; activity?: string }>;
}) {
  const { chain = NetworkModes.Mainnet, api, activity } = await searchParams;
  const allowedApi = getAllowedStakingApiUrl(chain, api);
  if (!allowedApi) return <UnsupportedStakingNetwork />;
  const group = parseActivityGroup(activity);
  // Shared by both overview sections; activity filters are not inputs to this loader.
  const data = loadStakingOverview(chain, allowedApi);
  return (
    <Stack gap={{ base: 16, md: 18, lg: 20, xl: 24 }}>
      <Stack gap={{ base: 10, lg: 12 }}>
        <Text as="h1" textStyle="heading-md" color="textPrimary">
          Bitcoin Staking
        </Text>
        <Suspense fallback={<StakingLoading label="Loading bonds…" />}>
          <OverviewSection data={data} section="bonds" />
        </Suspense>
        <Suspense
          key={`${chain}:${api ?? ''}:${group ?? 'all'}`}
          fallback={<StakingLoading label="Loading activity…" />}
        >
          <ActivitySection chain={chain} api={allowedApi} group={group} />
        </Suspense>
      </Stack>
      <Suspense fallback={<StakingLoading label="Loading STX staking…" />}>
        <OverviewSection data={data} section="stacking" />
      </Suspense>
    </Stack>
  );
}
