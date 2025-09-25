import { FeeSection } from '@/app/_components/FeeSection';
import { MempoolSection } from '@/app/_components/MempoolSection';
import { Flex, Stack } from '@chakra-ui/react';

import { getSampleTxsFeeEstimate } from '../../common/utils/fee-utils';
import { PageTitle } from '../_components/PageTitle';
import { fetchUIMempoolStats } from '../data';
import MempoolTransactionsTable from './MempoolTransactionsTable';
import { fetchUIMempoolTransactions } from './data';

export default async function (props: { searchParams: Promise<Record<string, string>> }) {
  const searchParams = await props.searchParams;
  const chain = searchParams?.chain || 'mainnet';
  const api = searchParams?.api;
  const fromAddress = searchParams?.fromAddress;
  const toAddress = searchParams?.toAddress;
  const isSSRDisabled = searchParams?.ssr === 'false';

  const stacksAPIRequests = isSSRDisabled
    ? []
    : ([
        fetchUIMempoolStats(chain, api),
        fetchUIMempoolTransactions(chain, api, fromAddress, toAddress),
        getSampleTxsFeeEstimate(chain as 'mainnet' | 'testnet', api),
      ] as const);

  const stacksAPIResults = await Promise.all(stacksAPIRequests);

  const [mempoolStats, initialMempoolTxData, sampleTxsFeeEstimate] = isSSRDisabled
    ? [undefined, undefined, undefined]
    : stacksAPIResults;

  const initialFeeEstimates = sampleTxsFeeEstimate
    ? {
        tokenTransferFees: sampleTxsFeeEstimate.tokenTransferFees,
        contractCallFees: sampleTxsFeeEstimate.contractCallFees,
        contractDeployFees: sampleTxsFeeEstimate.contractDeployFees,
        averageFees: sampleTxsFeeEstimate.averageFees,
      }
    : undefined;

  return (
    <Stack gap={5} mt={{ base: 0, '2xl': 12 }}>
      <PageTitle>Mempool</PageTitle>
      <Flex gap={6} flexDirection={{ base: 'column', '2xl': 'row' }}>
        <Flex flex="1">
          <MempoolSection
            mempoolStats={mempoolStats}
            isSSRDisabled={isSSRDisabled}
            showHeader={false}
            chartWidth={220}
            chartHeight={220}
            chartInnerRadius={90}
            reverseOrder={true}
            maxWidth={600}
          />
        </Flex>
        <Flex flex="1">
          <FeeSection initialFeeEstimates={initialFeeEstimates} />
        </Flex>
      </Flex>
      <MempoolTransactionsTable
        initialMempoolTxData={initialMempoolTxData}
        searchParams={searchParams}
      />
    </Stack>
  );
}
