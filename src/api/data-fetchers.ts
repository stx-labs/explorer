import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { LUNAR_CRUSH_API_KEY } from '@/common/constants/env';
import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { LunarCrushCoinRedesign } from '@/common/types/lunarCrush';
import { logError } from '@/common/utils/error-utils';
import { validateAssettId } from '@/common/utils/utils';

import {
  AddressBalanceResponse,
  AddressNonces,
  AddressTransactionsListResponse,
  BnsNamesOwnByAddressResponse,
  BurnchainRewardsTotal,
  FungibleTokenHolderList,
  MempoolTransaction,
  SmartContract,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';
import type { operations } from '@stacks/token-metadata-api-client/lib/generated/schema';

type FtMetadataResponse =
  operations['getFtMetadata']['responses']['200']['content']['application/json'];

export const getAddressBalancesTag = (principal: string) => `address-balances-${principal}`;
export const getAddressLatestNonceTag = (principal: string) => `address-latest-nonce-${principal}`;
export const getAddressBNSNamesTag = (principal: string) => `address-bns-names-${principal}`;
export const getAddressBurnChainRewardsTag = (principal: string) =>
  `address-burn-chain-rewards-${principal}`;
export const getPoxInfoTag = () => `pox-info`;
export const getAddressRecentTransactionsTag = (principal: string) =>
  `address-recent-transactions-${principal}`;

const ADDRESS_BALANCES_REVALIDATION_TIMEOUT_IN_SECONDS = 3;
const POX_INFO_REVALIDATION_TIMEOUT_IN_SECONDS = 3;
const RECENT_TRANSACTIONS_REVALIDATION_TIMEOUT_IN_SECONDS = 3;
const ADDRESS_RECENT_TRANSACTIONS_LIMIT = 3;
const ADDRESS_LATEST_NONCE_REVALIDATION_TIMEOUT_IN_SECONDS = 3;
const ADDRESS_BNS_NAMES_REVALIDATION_TIMEOUT_IN_SECONDS = 10;
const ADDRESS_BURNCHAIN_REWARDS_REVALIDATION_TIMEOUT_IN_SECONDS = 10;

const CONFIRMED_TX_REVALIDATION_TIMEOUT_IN_SECONDS = 3; // 3 seconds
const CONFIRMED_CONTRACT_REVALIDATION_TIMEOUT_IN_SECONDS = 3; // 3 seconds

export const getTxTag = (txId: string) => `tx-id-${txId}`;
export const getContractTag = (contractId: string) => `contract-id-${contractId}`;

export async function fetchAddressBalances(
  apiUrl: string,
  principal: string
): Promise<AddressBalanceResponse> {
  const response = await stacksAPIFetch(`${apiUrl}/extended/v1/address/${principal}/balances`, {
    cache: 'default',
    next: {
      revalidate: ADDRESS_BALANCES_REVALIDATION_TIMEOUT_IN_SECONDS,
      tags: [getAddressBalancesTag(principal)],
    },
  });

  const balanceResponse: AddressBalanceResponse = await response.json();
  return balanceResponse;
}

export async function fetchAddressLatestNonce(
  apiUrl: string,
  principal: string
): Promise<AddressNonces> {
  const response = await stacksAPIFetch(`${apiUrl}/extended/v1/address/${principal}/nonces`, {
    cache: 'default',
    next: {
      revalidate: ADDRESS_LATEST_NONCE_REVALIDATION_TIMEOUT_IN_SECONDS,
      tags: [getAddressLatestNonceTag(principal)],
    },
  });

  const nonceResponse: AddressNonces = await response.json();
  return nonceResponse;
}

export async function fetchAddressBNSNames(
  apiUrl: string,
  principal: string
): Promise<BnsNamesOwnByAddressResponse> {
  const response = await stacksAPIFetch(`${apiUrl}/v1/addresses/stacks/${principal}`, {
    cache: 'default',
    next: {
      revalidate: ADDRESS_BNS_NAMES_REVALIDATION_TIMEOUT_IN_SECONDS,
      tags: [getAddressBNSNamesTag(principal)],
    },
  });

  const bnsNamesResponse: BnsNamesOwnByAddressResponse = await response.json();
  return bnsNamesResponse;
}

export async function fetchAddressBurnChainRewards(
  apiUrl: string,
  principal: string
): Promise<BurnchainRewardsTotal> {
  const response = await stacksAPIFetch(
    `${apiUrl}/extended/v1/burnchain/rewards/${principal}/total`,
    {
      cache: 'default',
      next: {
        revalidate: ADDRESS_BURNCHAIN_REWARDS_REVALIDATION_TIMEOUT_IN_SECONDS,
        tags: [getAddressBurnChainRewardsTag(principal)],
      },
    }
  );

  const burnChainRewardsResponse: BurnchainRewardsTotal = await response.json();
  return burnChainRewardsResponse;
}

export async function fetchPoxInfoRaw(apiUrl: string): Promise<PoxInfo> {
  const response = await stacksAPIFetch(`${apiUrl}/v2/pox`, {
    cache: 'default',
    next: {
      revalidate: POX_INFO_REVALIDATION_TIMEOUT_IN_SECONDS,
      tags: [getPoxInfoTag()],
    },
  });

  const poxInfoResponse: PoxInfo = await response.json();
  return poxInfoResponse;
}

export async function fetchRecentTransactions(
  apiUrl: string,
  principal: string
): Promise<AddressTransactionsListResponse> {
  const response = await stacksAPIFetch(
    `${apiUrl}/extended/v1/address/${principal}/transactions?limit=${ADDRESS_RECENT_TRANSACTIONS_LIMIT}`,
    {
      cache: 'default',
      next: {
        revalidate: RECENT_TRANSACTIONS_REVALIDATION_TIMEOUT_IN_SECONDS,
        tags: [getAddressRecentTransactionsTag(principal)],
      },
    }
  );

  const recentTransactionsResponse: AddressTransactionsListResponse = await response.json();
  return recentTransactionsResponse;
}

export async function fetchTokenMetadata(
  apiUrl: string,
  tokenId: string
): Promise<FtMetadataResponse> {
  const response = await stacksAPIFetch(`${apiUrl}/metadata/v1/ft/${tokenId}`);
  const tokenMetadata: FtMetadataResponse = await response.json();
  return tokenMetadata;
}

export async function fetchTokenHolders(
  apiUrl: string,
  tokenId: string
): Promise<FtMetadataResponse> {
  const response = await stacksAPIFetch(`${apiUrl}/metadata/v1/ft/${tokenId}`);
  const tokenMetadata: FtMetadataResponse = await response.json();
  return tokenMetadata;
}

export async function fetchTokenDataFromLunarCrush(
  tokenId: string
): Promise<LunarCrushCoinRedesign | undefined> {
  try {
    const response: LunarCrushCoinRedesign = await (
      await fetch(`https://lunarcrush.com/api4/public/coins/${tokenId}/v1`, {
        cache: 'default',
        next: { revalidate: 60 * 10 }, // Revalidate every 10 minutes
        headers: {
          Authorization: `Bearer ${LUNAR_CRUSH_API_KEY}`,
        },
      })
    ).json();
    if (!response) {
      throw new Error(`Lunar Crush returned empty response for token ${tokenId}`);
    }
    if (response.error) {
      throw new Error(`Lunar Crush API error for token ${tokenId}: ${response.error}`);
    }
    return response;
  } catch (error) {
    const errorType =
      !error || (error instanceof Error && error.message.includes('empty response'))
        ? 'empty_response'
        : error instanceof Error && error.message.includes('API error')
          ? 'api_error'
          : 'fetch_error';
    logError(
      error instanceof Error ? error : new Error(`Lunar Crush fetch failed for token ${tokenId}`),
      'getLunarCrushTokenData',
      { tokenId },
      'warning',
      undefined,
      {
        integration: 'lunarcrush',
        'lunarcrush.token_id': tokenId,
        'lunarcrush.error_type': errorType,
      }
    );
    return undefined;
  }
}

export async function fetchContractInfo(
  apiUrl: string,
  contractId: string
): Promise<SmartContract> {
  const response = await stacksAPIFetch(`${apiUrl}/extended/v1/contract/${contractId}`, {
    cache: 'default',
    next: {
      revalidate: CONFIRMED_CONTRACT_REVALIDATION_TIMEOUT_IN_SECONDS,
      tags: [getContractTag(contractId)],
    },
  });
  const contractInfo: SmartContract = await response.json();
  return contractInfo;
}

export async function fetchTx(
  apiUrl: string,
  txId: string
): Promise<Transaction | MempoolTransaction> {
  const response = await stacksAPIFetch(`${apiUrl}/extended/v1/tx/${txId}`, {
    cache: 'default',
    next: {
      revalidate: CONFIRMED_TX_REVALIDATION_TIMEOUT_IN_SECONDS,
      tags: [getTxTag(txId)],
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch transaction: ${response.status} ${response.statusText}`);
  }
  const tx: Transaction | MempoolTransaction = await response.json();
  return tx;
}

export async function fetchHolders(
  apiUrl: string,
  assetId: string,
  limit?: number,
  offset?: number
): Promise<FungibleTokenHolderList | undefined> {
  if (!validateAssettId(assetId)) {
    return undefined;
  }

  const params = new URLSearchParams();

  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }

  if (offset !== undefined) {
    params.append('offset', offset.toString());
  }

  const queryString = params.toString();
  const url = queryString
    ? `${apiUrl}/extended/v1/tokens/ft/${assetId}/holders?${queryString}`
    : `${apiUrl}/extended/v1/tokens/ft/${assetId}/holders`;

  const response = await stacksAPIFetch(url);
  const holderList: FungibleTokenHolderList = await response.json();
  return holderList;
}
