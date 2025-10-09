import {
  CompressedTxAndMempoolTxTableData,
  compressMempoolTransaction,
  compressTransaction,
} from '@/api/data-compressors';
import { fetchRecentTransactions } from '@/api/data-fetchers';
import { getTokenPrice } from '@/app/getTokenPriceInfo';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';
import { isConfirmedTx } from '@/common/utils/transactions';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import TokenIdPage from './PageClient';
import { getTokenInfo } from './page-data';
import { TokenIdPageDataProvider } from './redesign/context/TokenIdPageContext';
import { MergedTokenData } from './types';

export default async function (props: {
  params: Promise<{ tokenId: string }>;
  searchParams: Promise<{ chain: string; api: string }>;
}) {
  const searchParams = await props.searchParams;

  const { chain, api } = searchParams;
  const apiUrl = getApiUrl(chain, api);

  const params = await props.params;

  const { tokenId } = params;

  let tokenPrice = {
    stxPrice: 0,
    btcPrice: 0,
  };
  let initialAddressRecentTransactionsData:
    | GenericResponseType<CompressedTxAndMempoolTxTableData>
    | undefined;
  let tokenData: MergedTokenData | undefined;

  try {
    tokenPrice = await getTokenPrice();
    const recentAddressTransactions = await fetchRecentTransactions(apiUrl, tokenId);
    const compressedRecentAddressTransactions = {
      ...recentAddressTransactions,
      results: recentAddressTransactions.results.map(tx => {
        if (isConfirmedTx<Transaction, MempoolTransaction>(tx)) {
          return compressTransaction(tx);
        }
        return compressMempoolTransaction(tx);
      }),
    };
    initialAddressRecentTransactionsData = compressedRecentAddressTransactions;
    tokenData = await getTokenInfo(tokenId, apiUrl, !!api);
  } catch (error) {
    logError(
      error as Error,
      'Token Id page server-side fetch for initial data',
      { tokenId, tokenPrice, initialAddressRecentTransactionsData, chain, api },
      'error'
    );
  }
  return (
    <TokenIdPageDataProvider tokenId={tokenId} tokenInfo={tokenData}>
      <TokenIdPage />
    </TokenIdPageDataProvider>
  );
}
