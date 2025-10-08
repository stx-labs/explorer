import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { TX_TABLE_PAGE_SIZE } from '@/common/components/table/table-examples/consts';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';
import {
  CompressedMempoolTxTableData,
  compressMempoolTransactions,
} from '@/common/utils/transaction-utils';

export async function fetchMempoolTransactions(
  chain: string,
  api?: string,
  fromAddress?: string,
  toAddress?: string
) {
  const apiUrl = getApiUrl(chain, api);
  const params = new URLSearchParams({
    limit: `${TX_TABLE_PAGE_SIZE}`,
    offset: '0',
    ...(fromAddress && { sender_address: fromAddress }),
    ...(toAddress && { recipient_address: toAddress }),
  });

  const response = await fetch(`${apiUrl}/extended/v1/tx/mempool?${params.toString()}`, {
    cache: 'default',
    next: {
      revalidate: 10, // 10 seconds
      tags: ['mempool-transactions'],
    },
  });
  return response;
}

export async function fetchUIMempoolTransactions(
  chain: string,
  api?: string,
  fromAddress?: string,
  toAddress?: string
): Promise<GenericResponseType<CompressedMempoolTxTableData> | undefined> {
  const apiUrl = getApiUrl(chain || NetworkModes.Mainnet, api);

  try {
    const params = new URLSearchParams({
      limit: `${TX_TABLE_PAGE_SIZE}`,
      offset: '0',
      ...(fromAddress && { sender_address: fromAddress }),
      ...(toAddress && { recipient_address: toAddress }),
    });

    const fetchUrl = `${apiUrl}/extended/v1/tx/mempool?${params.toString()}`;

    const response = await stacksAPIFetch(fetchUrl, {
      cache: 'default',
      next: {
        revalidate: 10, // 10 seconds
        tags: ['mempool-transactions'],
      },
    });

    const data = await response.json();
    return {
      ...data,
      results: compressMempoolTransactions(data.results),
    };
  } catch (error) {
    logError(
      error as Error,
      'Mempool page server-side fetch for initial data',
      {
        api,
        chain,
        apiUrl,
        fromAddress,
        toAddress,
      },
      'error'
    );
    return undefined;
  }
}
