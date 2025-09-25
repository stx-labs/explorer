import { FeeSection } from '@/app/_components/FeeSection';
import { MempoolSection } from '@/app/_components/MempoolSection';
import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';
import { SampleTxsFeeEstimate, getSampleTxsFeeEstimate } from '@/common/utils/fee-utils';
import { getApiUrl } from '@/common/utils/network-utils';
import { CompressedTxTableData } from '@/common/utils/transaction-utils';
import { Flex, Stack } from '@chakra-ui/react';

import { NetworkOverview } from './_components/NetworkOverview/NetworkOverview';
import { RecentBlocksSection } from './_components/RecentBlocks/RecentBlocks';
import { StackingSection } from './_components/StackingSection/StackingSection';
import { TxsSection } from './_components/TxsSection';
import { HomePageDataProvider } from './context';
import {
  RecentBlocks,
  UIMempoolStats,
  UIStackingCycle,
  fetchCurrentStackingCycle,
  fetchRecentBlocks,
  fetchRecentUITxs,
  fetchUIMempoolStats,
} from './data';
import { CommonSearchParams } from './transactions/page';

interface HomeSearchParams extends CommonSearchParams {
  ssr?: string;
}

export default async function HomeRedesign(props: { searchParams: Promise<HomeSearchParams> }) {
  const { chain = NetworkModes.Mainnet, api, ssr = 'true' } = await props.searchParams;
  const apiUrl = getApiUrl(chain, api);
  const isSSRDisabled = ssr === 'false';

  let recentBlocks: RecentBlocks | undefined;
  let stackingCycle: UIStackingCycle | undefined;
  let initialTxTableData: CompressedTxTableData | undefined;
  let mempoolStats: UIMempoolStats | undefined;
  let feeEstimates: SampleTxsFeeEstimate | undefined;

  try {
    const stacksAPIRequests = isSSRDisabled
      ? []
      : ([
          fetchRecentBlocks(chain, api),
          fetchCurrentStackingCycle(chain, api),
          fetchRecentUITxs(chain, api),
          fetchUIMempoolStats(chain, api),
          getSampleTxsFeeEstimate(chain as 'mainnet' | 'testnet', apiUrl),
        ] as const);

    const stacksAPIResults = await Promise.all(stacksAPIRequests);

    [recentBlocks, stackingCycle, initialTxTableData, mempoolStats, feeEstimates] = isSSRDisabled
      ? ([undefined, undefined, undefined, undefined, undefined] as const)
      : stacksAPIResults;
  } catch (error) {
    logError(
      error as Error,
      'Home page server-side fetch for initial data',
      {
        apiUrl,
        chain,
        recentBlocks,
        stackingCycle,
        mempoolStats,
        feeEstimates,
        isSSRDisabled,
      },
      'error'
    );
  }

  return (
    <HomePageDataProvider
      initialRecentBlocks={recentBlocks}
      stackingCycle={stackingCycle}
      mempoolStats={mempoolStats}
      feeEstimates={feeEstimates}
      isSSRDisabled={isSSRDisabled}
    >
      <Stack gap={{ base: 16, md: 18, lg: 20, xl: 24 }}>
        <RecentBlocksSection />
        <Flex
          gap={{ base: 20, md: 20, lg: 20, xl: 2 }}
          flexDirection={{ base: 'column', xl: 'row' }}
          alignItems="stretch"
        >
          <StackingSection />
          <NetworkOverview />
        </Flex>
        <Flex
          gap={{ base: 20, md: 20, lg: 20, xl: 2 }}
          flexDirection={{ base: 'column', xl: 'row' }}
        >
          <Flex flex={1} minWidth={0}>
            <TxsSection initialTxTableData={initialTxTableData} />
          </Flex>
          <Flex gap={4} flexDirection={['column', 'column', 'column', 'column', 'column']} flex={1}>
            <MempoolSection
              mempoolStats={mempoolStats}
              isSSRDisabled={isSSRDisabled}
              showHeader={true}
            />
            <FeeSection initialFeeEstimates={feeEstimates} />
          </Flex>
        </Flex>
      </Stack>
    </HomePageDataProvider>
  );
}
