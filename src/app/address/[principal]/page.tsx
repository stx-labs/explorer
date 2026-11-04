import { getTokenPrice } from '@/app/getTokenPriceInfo';
import { CommonSearchParams } from '@/app/transactions/page';
import { NetworkModes } from '@/common/types/network';
import { PrincipalTransactionSummaryListResponse } from '@/common/types/tx-v3';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';

import {
  AddressBalanceResponse,
  BnsNamesOwnByAddressResponse,
  BurnchainRewardsTotal,
} from '@stacks/stacks-blockchain-api-types';

import { AddressIdPageDataProvider } from './AddressIdPageContext';
import AddressPage from './PageClient';
import {
  CompressedPoxInfo,
  PrincipalNonces,
  compressPoxInfo,
  fetchAddressBNSNames,
  fetchAddressBalances,
  fetchAddressBurnChainRewards,
  fetchAddressLatestNonce,
  fetchPoxInfoRaw,
  fetchRecentTransactions,
  handleSettledResult,
} from './page-data';

export default async function Page(props: {
  params: Promise<{ principal: string }>;
  searchParams: Promise<CommonSearchParams>;
}) {
  const { params } = props;
  const searchParams = await props.searchParams;
  const { principal } = await params;
  const isSSRDisabled = searchParams?.ssr === 'false';
  const chain = (searchParams.chain as NetworkModes) || NetworkModes.Mainnet;
  const api = searchParams.api;
  const apiUrl = getApiUrl(chain, api);
  let tokenPrice = {
    stxPrice: 0,
    btcPrice: 0,
  };
  let initialAddressBalancesData: AddressBalanceResponse | undefined;
  let initialAddressLatestNonceData: PrincipalNonces | undefined;
  let initialAddressBNSNamesData: BnsNamesOwnByAddressResponse | undefined;
  let initialBurnChainRewardsData: BurnchainRewardsTotal | undefined;
  let initialPoxInfoData: CompressedPoxInfo | undefined;
  let initialAddressRecentTransactionsData: PrincipalTransactionSummaryListResponse | undefined;

  if (!isSSRDisabled) {
    try {
      const [
        tokenPriceResult,
        addressBalancesResult,
        addressLatestNonceResult,
        addressBNSNamesResult,
        burnChainRewardsResult,
        poxInfoResult,
        recentTransactionsResult,
      ] = await Promise.allSettled([
        getTokenPrice(),
        fetchAddressBalances(apiUrl, principal),
        fetchAddressLatestNonce(apiUrl, principal),
        fetchAddressBNSNames(apiUrl, principal),
        fetchAddressBurnChainRewards(apiUrl, principal),
        fetchPoxInfoRaw(apiUrl),
        fetchRecentTransactions(apiUrl, principal),
      ]);

      tokenPrice = handleSettledResult(tokenPriceResult, 'Failed to fetch token price') || {
        stxPrice: 0,
        btcPrice: 0,
      };
      initialAddressBalancesData = handleSettledResult(
        addressBalancesResult,
        'Failed to fetch address balances'
      );
      initialAddressLatestNonceData = handleSettledResult(
        addressLatestNonceResult,
        'Failed to fetch address latest nonce'
      );
      initialAddressBNSNamesData = handleSettledResult(
        addressBNSNamesResult,
        'Failed to fetch address BNS names'
      );
      initialBurnChainRewardsData = handleSettledResult(
        burnChainRewardsResult,
        'Failed to fetch burn chain rewards'
      );
      const handledPoxInfoResult = handleSettledResult(poxInfoResult, 'Failed to fetch Pox info');
      initialPoxInfoData = handledPoxInfoResult ? compressPoxInfo(handledPoxInfoResult) : undefined;
      initialAddressRecentTransactionsData = handleSettledResult(
        recentTransactionsResult,
        'Failed to fetch recent transactions'
      );
    } catch (error) {
      logError(
        error as Error,
        'Address Id page server-side fetch for initial data',
        { principal, tokenPrice, initialAddressBalancesData, chain, api },
        'error'
      );
    }
  }

  return (
    <AddressIdPageDataProvider
      stxPrice={tokenPrice.stxPrice}
      btcPrice={tokenPrice.btcPrice}
      initialAddressBalancesData={initialAddressBalancesData}
      initialAddressLatestNonceData={initialAddressLatestNonceData}
      initialAddressBNSNamesData={initialAddressBNSNamesData}
      initialBurnChainRewardsData={initialBurnChainRewardsData}
      initialPoxInfoData={initialPoxInfoData}
      initialAddressRecentTransactionsData={initialAddressRecentTransactionsData}
      principal={principal}
    >
      <AddressPage principal={principal} />
    </AddressIdPageDataProvider>
  );
}
