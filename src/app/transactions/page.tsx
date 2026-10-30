import { stacksAPIFetchJson } from '@/api/stacksAPIFetch';
import { TX_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { NetworkModes } from '@/common/types/network';
import { TransactionSummaryListResponse } from '@/common/types/tx-v3';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';

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
  const { chain, api } = searchParams;

  const apiUrl = getApiUrl(chain || NetworkModes.Mainnet, api);

  let initialData: TransactionSummaryListResponse | undefined;

  // v3 `/extended/v3/transactions` only supports `limit` + `cursor` — no server-side address/date/
  // type filters — so the list is fetched unfiltered and filtered client-side by type.
  try {
    const fetchUrl = `${apiUrl}/extended/v3/transactions?limit=${TX_TABLE_PAGE_SIZE}`;
    // stacksAPIFetchJson throws on non-2xx so an error body is never cached as a summary page.
    initialData = await stacksAPIFetchJson<TransactionSummaryListResponse>(fetchUrl, {
      next: {
        revalidate: 20, // nextjs caches the response for 20s (about 2-3 blocks)
      },
    });
  } catch (error) {
    logError(
      error as Error,
      'Transaction page server-side fetch for initial data',
      { api, chain, apiUrl },
      'error'
    );
  }

  return <Page initialData={initialData} />;
}
