import {
  fetchContractInfo,
  fetchHolders,
  fetchRecentTransactions,
  fetchTx,
} from '@/api/data-fetchers';
import { handleSettledResult } from '@/app/address/[principal]/page-data';
import { getTokenPrice } from '@/app/getTokenPriceInfo';
import { CommonSearchParams } from '@/app/transactions/page';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';
import {
  CompressedTxAndMempoolTxTableData,
  compressMempoolTransaction,
  compressTransaction,
} from '@/common/utils/transaction-utils';

import {
  ContractInterfaceResponse,
  FungibleTokenHolderList,
  MempoolTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import TokenIdPage from './PageClient';
import { getTokenInfo } from './getTokenInfo';
import { getTokenDataRedesign } from './page-data';
import { TokenIdPageDataProvider } from './redesign/context/TokenIdPageContext';
import { MergedTokenData } from './types';

function isConfirmedTx<T extends Transaction, U extends MempoolTransaction>(tx: T | U): tx is T {
  return 'block_height' in tx && tx.block_height !== undefined;
}

export default async function (props: {
  params: Promise<{ tokenId: string }>;
  searchParams: Promise<CommonSearchParams & { redesign?: string }>;
}) {
  const searchParams = await props.searchParams;

  const { chain, api } = searchParams;
  const apiUrl = getApiUrl(chain || NetworkModes.Mainnet, api);

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
  let redesignTokenData: MergedTokenData | undefined;
  let txId: string | undefined;
  let txBlockTime: number | undefined;
  let assetId: string | undefined;
  let holders: FungibleTokenHolderList | undefined;
  let circulatingSupply: string | undefined;

  const tokenInfo = await getTokenInfo(tokenId, chain || NetworkModes.Mainnet, api);

  const isRedesign = searchParams.redesign === 'true';
  const isSSRDisabled = searchParams?.ssr === 'false';

  if (isRedesign && !isSSRDisabled) {
    try {
      const [tokenPriceResult, tokenDataResult, contractInfoResult, recentTransactionsResult] =
        await Promise.allSettled([
          getTokenPrice(),
          getTokenDataRedesign(tokenId, apiUrl, !!api),
          fetchContractInfo(apiUrl, tokenId),
          fetchRecentTransactions(apiUrl, tokenId),
        ]);

      tokenPrice = handleSettledResult(tokenPriceResult, 'Failed to fetch token price') || {
        stxPrice: 0,
        btcPrice: 0,
      };

      tokenData = handleSettledResult(tokenDataResult, 'Failed to fetch token data');

      const recentAddressTransactions = handleSettledResult(
        recentTransactionsResult,
        'Failed to fetch recent transactions'
      );
      const contractInfo = handleSettledResult(contractInfoResult, 'Failed to fetch contract info');

      txId = contractInfo?.tx_id;
      const abi: ContractInterfaceResponse = contractInfo
        ? JSON.parse(contractInfo?.abi)
        : undefined;
      const ftName = abi ? abi.fungible_tokens[0].name : undefined;
      assetId = ftName ? `${tokenId}::${ftName}` : undefined;

      const [txResult, holdersResult] = await Promise.allSettled([
        // dependent queries
        fetchTx(apiUrl, txId || ''),
        fetchHolders(apiUrl, assetId || '', 10, 0),
      ]);

      const tx = handleSettledResult(txResult, 'Failed to fetch transaction');
      holders = handleSettledResult(holdersResult, 'Failed to fetch holders');

      txBlockTime = tx?.block_time;

      const compressedRecentAddressTransactions = recentAddressTransactions
        ? {
            ...recentAddressTransactions,
            results: recentAddressTransactions?.results.map(tx => {
              if (isConfirmedTx<Transaction, MempoolTransaction>(tx)) {
                return compressTransaction(tx);
              }
              return compressMempoolTransaction(tx);
            }),
          }
        : undefined;
      initialAddressRecentTransactionsData = compressedRecentAddressTransactions;
    } catch (error) {
      logError(
        error as Error,
        'Token Id page server-side fetch for initial data',
        { tokenId, tokenPrice, initialAddressRecentTransactionsData, chain, api },
        'error'
      );
    }
  }

  return (
    <TokenIdPageDataProvider
      tokenId={tokenId}
      redesignTokenData={redesignTokenData}
      stxPrice={tokenPrice.stxPrice}
      btcPrice={tokenPrice.btcPrice}
      initialAddressRecentTransactionsData={initialAddressRecentTransactionsData}
      txBlockTime={txBlockTime}
      txId={txId}
      assetId={assetId}
      holders={holders}
    >
      <TokenIdPage tokenId={tokenId} tokenInfo={tokenInfo} />
    </TokenIdPageDataProvider>
  );
}
