import {
  fetchContractInfo,
  fetchFtSupply,
  fetchHolders,
  fetchRecentTransactions,
  fetchTx,
} from '@/api/data-fetchers';
import { handleSettledResult } from '@/app/address/[principal]/page-data';
import { getTokenPrice } from '@/app/getTokenPriceInfo';
import { CommonSearchParams } from '@/app/transactions/page';
import { NetworkModes } from '@/common/types/network';
import { FtHolderListResponse } from '@/common/types/tokens-v3';
import { PrincipalTransactionSummaryListResponse } from '@/common/types/tx-v3';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';
import { getTxBlockTime, isConfirmedTxDetails } from '@/common/utils/tx-details-utils';
import { isAddressForNetworkMode, validateStacksContractId } from '@/common/utils/utils';

import { ContractInterfaceResponse } from '@stacks/stacks-blockchain-api-types';

import TokenIdPageRedesign from './PageClient';
import { getTokenDataFromLunarCrush, getTokenDataFromStacksApi, mergeTokenData } from './page-data';
import { TokenIdPageDataProvider } from './redesign/context/TokenIdPageContext';
import { MergedTokenData } from './types';

export default async function (props: {
  params: Promise<{ tokenId: string }>;
  searchParams: Promise<CommonSearchParams & { redesign?: string }>;
}) {
  const searchParams = await props.searchParams;

  const { chain, api } = searchParams;
  const apiUrl = getApiUrl(chain || NetworkModes.Mainnet, api);
  const networkMode = api
    ? undefined
    : chain === NetworkModes.Testnet
      ? NetworkModes.Testnet
      : NetworkModes.Mainnet;

  const params = await props.params;

  const { tokenId } = params;

  if (!validateStacksContractId(tokenId)) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  if (networkMode && !isAddressForNetworkMode(tokenId.split('.')[0], networkMode)) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  let tokenPrice = {
    stxPrice: 0,
    btcPrice: 0,
  };
  let initialAddressRecentTransactionsData: PrincipalTransactionSummaryListResponse | undefined;
  let tokenData: MergedTokenData | undefined;
  let txId: string | undefined;
  let txBlockTime: number | undefined;
  let assetId: string | undefined;
  let holders: FtHolderListResponse | undefined;
  let supply: string | undefined;
  let numFunctions: number | undefined;

  const isSSRDisabled = searchParams?.ssr === 'false';

  if (!isSSRDisabled) {
    try {
      const [
        tokenPriceResult,
        tokenDataFromStacksApiResult,
        tokenDataFromLunarCrushResult,
        contractInfoResult,
        recentTransactionsResult,
      ] = await Promise.allSettled([
        getTokenPrice(),
        getTokenDataFromStacksApi(tokenId, apiUrl),
        networkMode === NetworkModes.Mainnet
          ? getTokenDataFromLunarCrush(tokenId)
          : Promise.resolve(undefined),
        fetchContractInfo(apiUrl, tokenId),
        fetchRecentTransactions(apiUrl, tokenId),
      ]);

      tokenPrice = handleSettledResult(tokenPriceResult, 'Failed to fetch token price') || {
        stxPrice: 0,
        btcPrice: 0,
      };

      const tokenDataFromStacksApi = handleSettledResult(
        tokenDataFromStacksApiResult,
        'Failed to fetch token data from Stacks API'
      );
      const tokenDataFromLunarCrush = handleSettledResult(
        tokenDataFromLunarCrushResult,
        'Failed to fetch token data from LunarCrush'
      );

      const recentAddressTransactions = handleSettledResult(
        recentTransactionsResult,
        'Failed to fetch recent transactions'
      );
      const contractInfo = handleSettledResult(contractInfoResult, 'Failed to fetch contract info');

      txId = contractInfo?.tx_id;
      const abi: ContractInterfaceResponse | null = contractInfo?.abi
        ? JSON.parse(contractInfo.abi)
        : null;
      const ftName = abi?.fungible_tokens?.[0]?.name;
      assetId = ftName ? `${tokenId}::${ftName}` : undefined;
      numFunctions = abi?.functions?.length;

      const [txResult, holdersResult, supplyResult] = await Promise.allSettled([
        // dependent queries
        fetchTx(apiUrl, txId || ''),
        fetchHolders(apiUrl, assetId || '', 10),
        fetchFtSupply(apiUrl, assetId || ''),
      ]);

      const tx = handleSettledResult(txResult, 'Failed to fetch transaction');
      holders = handleSettledResult(holdersResult, 'Failed to fetch holders');
      supply = handleSettledResult(supplyResult, 'Failed to fetch token supply')?.total;

      tokenData = mergeTokenData(
        tokenDataFromStacksApi,
        tokenDataFromLunarCrush,
        supply,
        tokenId,
        networkMode
      );

      txBlockTime = tx && isConfirmedTxDetails(tx) ? getTxBlockTime(tx) : undefined;

      initialAddressRecentTransactionsData = recentAddressTransactions;
    } catch (error) {
      logError(
        error as Error,
        'Token Id page server-side fetch for initial data',
        { tokenId, tokenPrice, initialAddressRecentTransactionsData, chain, api, networkMode },
        'error'
      );
    }
  }

  return (
    <TokenIdPageDataProvider
      tokenId={tokenId}
      tokenData={tokenData}
      stxPrice={tokenPrice.stxPrice}
      btcPrice={tokenPrice.btcPrice}
      initialAddressRecentTransactionsData={initialAddressRecentTransactionsData}
      txBlockTime={txBlockTime}
      txId={txId}
      assetId={assetId}
      holders={holders}
      supply={supply}
      numFunctions={numFunctions}
    >
      <TokenIdPageRedesign />
    </TokenIdPageDataProvider>
  );
}
