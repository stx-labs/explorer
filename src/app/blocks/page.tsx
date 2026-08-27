import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';

import { BurnBlock } from '@stacks/stacks-blockchain-api-types';

import { CommonSearchParams } from '../transactions/page';
import { BlocksTable } from './components/BlocksTable';
import { BlocksDataProvider } from './context';
import { fetchBlocksDefaultData } from './data';

interface BlocksSearchParams extends CommonSearchParams {
  ssr?: string;
}

function BlocksPageClient({
  initialBtcBlocksData,
}: {
  initialBtcBlocksData?: { btcBlocks: GenericResponseType<BurnBlock> };
}) {
  return (
    <BlocksDataProvider initialBtcBlocksData={initialBtcBlocksData}>
      <Stack gap={6} width="100%">
        <Stack gap={2}>
          <Text textStyle="heading-md" color="textPrimary">
            Recent blocks
          </Text>
          <Stack gap={1.25}>
            <BlocksTable />
          </Stack>
        </Stack>
      </Stack>
    </BlocksDataProvider>
  );
}

export default async function BlocksPage(props: { searchParams: Promise<BlocksSearchParams> }) {
  const { chain = NetworkModes.Mainnet, api, ssr = 'true' } = await props.searchParams;
  const apiUrl = getApiUrl(chain, api);
  const isSSRDisabled = ssr === 'false';

  let initialBtcBlocksData: { btcBlocks: any } | undefined;

  try {
    if (!isSSRDisabled) {
      initialBtcBlocksData = await fetchBlocksDefaultData(chain, api);
    }
  } catch (error) {
    logError(
      error as Error,
      'Blocks page server-side fetch for initial data',
      {
        apiUrl,
        chain,
        initialBtcBlocksData,
      },
      'error'
    );
  }

  return <BlocksPageClient initialBtcBlocksData={initialBtcBlocksData} />;
}
