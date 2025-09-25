import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { NUM_TEN_MINUTES_IN_DAY } from '@/common/utils/consts';

import {
  AddressBalanceResponse,
  AddressNonces,
  AddressTransactionsListResponse,
  BnsNamesOwnByAddressResponse,
  BurnchainRewardsTotal,
} from '@stacks/stacks-blockchain-api-types';

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
