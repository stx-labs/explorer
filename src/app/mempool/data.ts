import { stacksAPIFetchJson } from '@/api/stacksAPIFetch';
import { TX_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { NetworkModes } from '@/common/types/network';
import { MempoolTransactionSummaryListResponse } from '@/common/types/tx-v3';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';

// The first page of the default view (every type, newest received first); the client applies the
// type filter and sort the user picks.
export async function fetchUIMempoolTransactions(
  chain: string,
  api?: string
): Promise<MempoolTransactionSummaryListResponse | undefined> {
  const apiUrl = getApiUrl(chain || NetworkModes.Mainnet, api);

  try {
    const fetchUrl = `${apiUrl}/extended/v3/mempool/transactions?limit=${TX_TABLE_PAGE_SIZE}`;

    // stacksAPIFetchJson throws on non-2xx so an error body is never cached as a summary page.
    return await stacksAPIFetchJson<MempoolTransactionSummaryListResponse>(fetchUrl, {
      cache: 'default',
      next: {
        revalidate: 10, // 10 seconds
        tags: ['mempool-transactions'],
      },
    });
  } catch (error) {
    logError(
      error as Error,
      'Mempool page server-side fetch for initial data',
      { api, chain, apiUrl },
      'error'
    );
    return undefined;
  }
}
