import { logError } from '@/common/utils/error-utils';
import PageClient from './PageClient';
import { getTokenInfo } from './getTokenInfo';
import { isConfirmedTx } from '@/common/utils/transactions';
import { compressMempoolTransaction } from '@/app/transactions/utils';

export default async function (props: {
  params: Promise<{ tokenId: string }>;
  searchParams: Promise<{ chain: string; api: string }>;
}) {
  const searchParams = await props.searchParams;

  const { chain, api } = searchParams;

  const params = await props.params;

  const { tokenId } = params;

  let tokenPrice = {
    stxPrice: 0,
    btcPrice: 0,
  };
  let initialAddressRecentTransactionsData:
    | GenericResponseType<CompressedTxAndMempoolTxTableData>
    | undefined;

  try {
    tokenPrice = await getTokenPrice();
    const recentAddressTransactions = await fetchRecentTransactions(apiUrl, principal);
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
  } catch (error) {
    logError(
      error as Error,
      'Address Id page server-side fetch for initial data',
      { principal, tokenPrice, initialAddressBalancesData, chain, api },
      'error'
    );
  }
  const tokenInfo = await getTokenInfo(tokenId, chain, api);
  return <PageClient tokenId={tokenId} tokenInfo={tokenInfo} />;
}
