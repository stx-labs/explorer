import { stacksAPIFetch, stacksAPIFetchJson } from '@/api/stacksAPIFetch';
import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { NUM_TEN_MINUTES_IN_DAY } from '@/common/utils/consts';
import { logError } from '@/common/utils/error-utils';
import { FT_BALANCES_PAGE_SIZE, fetchAllFtBalances } from '@/common/utils/ft-balances';

import { OperationResponse } from '@stacks/blockchain-api-client';
import {
  AddressBalanceResponse,
  AddressNonces,
  AddressTransaction,
  AddressTransactionsListResponse,
  BnsNamesOwnByAddressResponse,
  BurnchainRewardsTotal,
} from '@stacks/stacks-blockchain-api-types';

type StxBalanceResponse = OperationResponse['/extended/v2/addresses/{principal}/balances/stx'];
type FtBalancesResponse = OperationResponse['/extended/v2/addresses/{principal}/balances/ft'];

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

export async function fetchAddressBalances(
  apiUrl: string,
  principal: string
): Promise<AddressBalanceResponse> {
  const fetchOptions: RequestInit = {
    cache: 'default',
    next: {
      revalidate: ADDRESS_BALANCES_REVALIDATION_TIMEOUT_IN_SECONDS,
      tags: [getAddressBalancesTag(principal)],
    },
  };
  const encodedPrincipal = encodeURIComponent(principal);

  const [stxResponse, fungibleTokens] = await Promise.all([
    stacksAPIFetchJson<StxBalanceResponse>(
      `${apiUrl}/extended/v2/addresses/${encodedPrincipal}/balances/stx`,
      fetchOptions,
      'Failed to fetch STX balance'
    ),
    fetchAllFtBalances(
      offset =>
        stacksAPIFetchJson<FtBalancesResponse>(
          `${apiUrl}/extended/v2/addresses/${encodedPrincipal}/balances/ft?limit=${FT_BALANCES_PAGE_SIZE}&offset=${offset}`,
          fetchOptions,
          'Failed to fetch FT balances page'
        ),
      {
        onPageError: (error, offset) => {
          logError(
            error instanceof Error ? error : new Error(String(error)),
            'fetchAllFtBalances:page',
            { principal, offset },
            'warning'
          );
        },
      }
    ),
  ]);

  return {
    stx: {
      balance: stxResponse.balance,
      total_sent: stxResponse.total_sent ?? '0',
      total_received: stxResponse.total_received ?? '0',
      total_fees_sent: stxResponse.total_fees_sent ?? '0',
      total_miner_rewards_received: stxResponse.total_miner_rewards_received,
      lock_tx_id: stxResponse.lock_tx_id,
      locked: stxResponse.locked,
      lock_height: stxResponse.lock_height,
      burnchain_lock_height: stxResponse.burnchain_lock_height,
      burnchain_unlock_height: stxResponse.burnchain_unlock_height,
    },
    fungible_tokens: fungibleTokens,
    non_fungible_tokens: {},
  };
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

export type CompressedPoxInfo = {
  currentCycleId: number;
  currentCycleProgressPercentage: number;
  approximateDaysTilNextCycle: number;
};

export function compressPoxInfo(poxInfo: PoxInfo): CompressedPoxInfo {
  const {
    current_cycle: { id: currentCycleId = 0 } = ({} = {}),
    next_reward_cycle_in,
    reward_cycle_length,
  } = poxInfo;
  const currentCycleProgressPercentage =
    (reward_cycle_length - next_reward_cycle_in) / reward_cycle_length;
  const blocksTilNextCycle = next_reward_cycle_in || 0;
  const approximateDaysTilNextCycle = Math.floor(blocksTilNextCycle / NUM_TEN_MINUTES_IN_DAY);

  return {
    currentCycleId,
    currentCycleProgressPercentage,
    approximateDaysTilNextCycle,
  };
}

export async function fetchRecentTransactions(
  apiUrl: string,
  principal: string
): Promise<AddressTransactionsListResponse> {
  const data = await stacksAPIFetchJson<
    { results?: AddressTransaction[] } & Record<string, unknown>
  >(
    `${apiUrl}/extended/v2/addresses/${encodeURIComponent(principal)}/transactions?limit=${ADDRESS_RECENT_TRANSACTIONS_LIMIT}`,
    {
      cache: 'default',
      next: {
        revalidate: RECENT_TRANSACTIONS_REVALIDATION_TIMEOUT_IN_SECONDS,
        tags: [getAddressRecentTransactionsTag(principal)],
      },
    },
    'Failed to fetch recent transactions'
  );

  return {
    ...data,
    results: (data.results ?? []).map(item => item.tx),
  } as AddressTransactionsListResponse;
}

export function handleSettledResult<T>(
  result: PromiseSettledResult<T>,
  errorMessage: string
): T | undefined {
  if (result.status === 'fulfilled') {
    return result.value;
  } else {
    logError(result.reason, errorMessage, {}, 'error');
    return undefined;
  }
}
