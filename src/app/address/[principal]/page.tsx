import { getTokenPrice } from '@/app/getTokenPriceInfo';
import { CommonSearchParams } from '@/app/transactions/page';
import {
  CompressedTxAndMempoolTxTableData,
  compressMempoolTransaction,
  compressTransaction,
} from '@/app/transactions/utils';
import { DEFAULT_MAINNET_SERVER, DEFAULT_TESTNET_SERVER } from '@/common/constants/env';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';

import {
  AddressBalanceResponse,
  AddressNonces,
  BnsNamesOwnByAddressResponse,
  BurnchainRewardsTotal,
  MempoolTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import { AddressIdPageDataProvider } from './AddressIdPageContext';
import AddressPage from './PageClient';
import {
  CompressedPoxInfo,
  compressPoxInfo,
  fetchAddressBNSNames,
  fetchAddressBalances,
  fetchAddressBurnChainRewards,
  fetchAddressLatestNonce,
  fetchPoxInfoRaw,
  fetchRecentTransactions,
} from './page-data';

function isConfirmedTx<T extends Transaction, U extends MempoolTransaction>(tx: T | U): tx is T {
  return 'block_height' in tx && tx.block_height !== undefined;
}

export default async function Page(props: {
  params: Promise<{ principal: string }>;
  searchParams: Promise<CommonSearchParams>;
}) {
  const { params } = props;
  const searchParams = await props.searchParams;
  const { principal } = await params;
  const chain = (searchParams.chain as NetworkModes) || NetworkModes.Mainnet;
  const api =
    searchParams.api || chain === NetworkModes.Mainnet
      ? DEFAULT_MAINNET_SERVER
      : DEFAULT_TESTNET_SERVER;
  const apiUrl = getApiUrl(chain, api);
  let tokenPrice = {
    stxPrice: 0,
    btcPrice: 0,
  };
  let initialAddressBalancesData: AddressBalanceResponse | undefined;
  let initialAddressLatestNonceData: AddressNonces | undefined;
  let initialAddressBNSNamesData: BnsNamesOwnByAddressResponse | undefined;
  let initialBurnChainRewardsData: BurnchainRewardsTotal | undefined;
  let initialPoxInfoData: CompressedPoxInfo | undefined;
  let initialAddressRecentTransactionsData:
    | GenericResponseType<CompressedTxAndMempoolTxTableData>
    | undefined;
  try {
    tokenPrice = await getTokenPrice();
    initialAddressBalancesData = await fetchAddressBalances(apiUrl, principal);
    initialAddressLatestNonceData = await fetchAddressLatestNonce(apiUrl, principal);
    initialAddressBNSNamesData = await fetchAddressBNSNames(apiUrl, principal);
    initialBurnChainRewardsData = await fetchAddressBurnChainRewards(apiUrl, principal);
    initialPoxInfoData = compressPoxInfo(await fetchPoxInfoRaw(apiUrl));
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
