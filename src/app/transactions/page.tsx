import { stacksAPIFetchJson } from '@/api/stacksAPIFetch';
import { TX_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { NetworkModes } from '@/common/types/network';
import { TransactionSummaryListResponse, TransactionSummaryType } from '@/common/types/tx-v3';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl, sanitizeNetworkUrlForTag } from '@/common/utils/network-utils';
import {
  TX_TYPE_FILTER_VALUES,
  parseTransactionTypeParam,
  toTypeParam,
} from '@/features/txs-list/utils';

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
  const { chain, api, ssr = 'true', transactionType } = searchParams;
  const isSSRDisabled = ssr === 'false';

  const apiUrl = getApiUrl(chain || NetworkModes.Mainnet, api);

  let initialData: TransactionSummaryListResponse | undefined;
  // The first page for the `transactionType` filter in the URL, which the client starts out with.
  const initialTypes: TransactionSummaryType[] = toTypeParam(
    parseTransactionTypeParam(transactionType) ?? [],
    TX_TYPE_FILTER_VALUES
  );

  if (!isSSRDisabled) {
    try {
      const query = new URLSearchParams({ limit: String(TX_TABLE_PAGE_SIZE) });
      initialTypes.forEach(type => query.append('type', type));
      const fetchUrl = `${apiUrl}/extended/v3/transactions?${query}`;
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
        // Custom API URLs can carry credentials or tokens in their query string.
        {
          api: api && sanitizeNetworkUrlForTag(api),
          chain,
          apiUrl: sanitizeNetworkUrlForTag(apiUrl),
        },
        'error'
      );
    }
  }

  return <Page initialData={initialData} initialTypes={initialTypes} />;
}
