import {
  CompressedTxAndMempoolTxTableData,
  compressMempoolTransaction,
  compressTransaction,
} from '@/api/data-compressors';
import {
  fetchContractInfo,
  fetchHolders,
  fetchRecentTransactions,
  fetchTx,
} from '@/api/data-fetchers';
import { getTokenPrice } from '@/app/getTokenPriceInfo';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';

import {
  ContractInterfaceResponse,
  FungibleTokenHolderList,
  MempoolTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import TokenIdPage from './PageClient';
import { getTokenInfo } from './page-data';
import { TokenIdPageDataProvider } from './redesign/context/TokenIdPageContext';
import { MergedTokenData, RedesignMergedTokenData } from './types';

function isConfirmedTx<T extends Transaction, U extends MempoolTransaction>(tx: T | U): tx is T {
  return 'block_height' in tx && tx.block_height !== undefined;
}

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
  let redesignTokenData: RedesignMergedTokenData | undefined;
  let txId: string | undefined;
  let txBlockTime: number | undefined;
  let assetId: string | undefined;
  let holders: FungibleTokenHolderList | undefined;

  try {
    tokenPrice = await getTokenPrice();
    [tokenData, redesignTokenData] = await getTokenInfo(tokenId, apiUrl, !!api);

    const contractInfo = await fetchContractInfo(apiUrl, tokenId);
    const abi: ContractInterfaceResponse = JSON.parse(contractInfo.abi);
    const ftName = abi.fungible_tokens[0].name;
    assetId = `${tokenId}::${ftName}`;
    holders = await fetchHolders(apiUrl, assetId, 10, 0);

    txId = contractInfo.tx_id;
    const tx = await fetchTx(apiUrl, txId);
    txBlockTime = tx.block_time;

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
  } catch (error) {
    logError(
      error as Error,
      'Token Id page server-side fetch for initial data',
      { tokenId, tokenPrice, initialAddressRecentTransactionsData, chain, api },
      'error'
    );
  }

  return (
    <TokenIdPageDataProvider
      tokenId={tokenId}
      tokenData={tokenData}
      redesignTokenData={redesignTokenData}
      stxPrice={tokenPrice.stxPrice}
      btcPrice={tokenPrice.btcPrice}
      initialAddressRecentTransactionsData={initialAddressRecentTransactionsData}
      txBlockTime={txBlockTime}
      txId={txId}
      assetId={assetId}
      holders={holders}
    >
      <TokenIdPage />
    </TokenIdPageDataProvider>
  );
}
