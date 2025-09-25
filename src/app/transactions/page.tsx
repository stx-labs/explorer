import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { TX_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { fetchBnsAddress } from '@/common/queries/bns-queries';
import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';
import { CompressedTxTableData, compressTransactions } from '@/common/utils/transaction-utils';
import { hasBnsExtension } from '@/common/utils/utils';
import 'react-datepicker/dist/react-datepicker.css';

import Page from './PageClient';

export interface CommonSearchParams {
  chain?: string;
  api?: string;
  ssr?: string;
}

export interface TxPageSearchParams extends CommonSearchParams {
  startTime?: string;
  endTime?: string;
  fromAddress?: string;
  toAddress?: string;
  transactionType?: string;
}

export interface TxPageFilters {
  startTime?: string;
  endTime?: string;
  fromAddress?: string;
  toAddress?: string;
  transactionType?: string[];
}

export default async function (props: { searchParams: Promise<TxPageSearchParams> }) {
  const searchParams = await props.searchParams;
  const { startTime, endTime, chain, api, fromAddress, toAddress, transactionType } = searchParams;

  const apiUrl = getApiUrl(chain || NetworkModes.Mainnet, api);

  let initialTxTableData: GenericResponseType<CompressedTxTableData> | undefined;

  try {
    let bnsAddress;
    if (apiUrl && hasBnsExtension(fromAddress)) {
      bnsAddress = await fetchBnsAddress(apiUrl, fromAddress!);
    }
    if (apiUrl && hasBnsExtension(toAddress)) {
      bnsAddress = await fetchBnsAddress(apiUrl, toAddress!);
    }

    const params = new URLSearchParams({
      limit: `${TX_TABLE_PAGE_SIZE}`,
      offset: '0',
      ...(startTime && { start_time: startTime }),
      ...(endTime && { end_time: endTime }),
      ...(fromAddress && { from_address: bnsAddress || fromAddress }),
      ...(toAddress && { to_address: bnsAddress || toAddress }),
      ...(transactionType && { type: transactionType }),
    });
    const fetchUrl = `${apiUrl}/extended/v1/tx/?${params.toString()}`;

    const response = await stacksAPIFetch(fetchUrl, {
      next: {
        revalidate: 20, // nextjs caches the response for 20s (about 2-3 blocks)
      },
    });

    const data = await response.json();
    const compressedData = {
      ...data,
      results: compressTransactions(data.results),
    };

    initialTxTableData = compressedData;
  } catch (error) {
    logError(
      error as Error,
      'Transaction page server-side fetch for initial data',
      {
        api,
        chain,
        apiUrl,
        fromAddress,
        toAddress,
        startTime,
        endTime,
        transactionType,
        initialTxTableData,
      },
      'error'
    );
  }

  return (
    <Page
      filters={{
        fromAddress: fromAddress || '',
        toAddress: toAddress || '',
        startTime: startTime || '',
        endTime: endTime || '',
        transactionType: transactionType ? transactionType.split(',') : [],
      }}
      initialTxTableData={initialTxTableData}
    />
  );
}
