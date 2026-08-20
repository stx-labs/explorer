import { getSbtcAssetId } from '@/app/token/[tokenId]/consts';
import { useSbtcNetworkMode } from '@/common/hooks/useSbtcNetworkMode';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { useAccountBalance } from '@/common/queries/useAccountBalance';
import { useFungibleTokensMetadata } from '@/common/queries/useFtMetadata';
import { NetworkModes } from '@/common/types/network';
import { isRiskyToken } from '@/common/utils/fungible-token-utils';
import { getAssetNameParts } from '@/common/utils/utils';
import { useMemo } from 'react';

import { FtBalance, NftBalance } from '@stacks/stacks-blockchain-api-types';
import type { operations } from '@stacks/token-metadata-api-client/lib/generated/schema';

type FtMetadataResponse =
  operations['getFtMetadata']['responses']['200']['content']['application/json'];

type FtBalanceWithAssetId = FtBalance & { asset_identifier: string };
type NftBalanceWithAssetId = NftBalance & { asset_identifier: string };

type FungibleTokenWithMetadata = FtMetadataResponse & FtBalanceWithAssetId;

const EMPTY_METADATA: FtMetadataResponse = {
  name: undefined,
  symbol: undefined,
  decimals: undefined,
  total_supply: undefined,
  token_uri: undefined,
  description: undefined,
  image_uri: undefined,
  image_canonical_uri: undefined,
  tx_id: '',
  sender_address: '',
  asset_identifier: '',
  metadata: undefined,
};

export function removeUndefinedFromBalances<T extends FtBalance | NftBalance>(
  balances: Record<string, T | undefined>
): Record<string, T> {
  const newBalances: Record<string, T> = {};
  Object.entries(balances).forEach(([key, value]) => {
    if (value) {
      newBalances[key] = value;
    }
  });
  return newBalances;
}

export function convertBalancesToArrayWithAssetId<T extends FtBalance | NftBalance>(
  balances: Record<string, T>
): (T & { asset_identifier: string })[] {
  return Object.entries(balances).map(([assetId, balance]) => {
    return {
      ...balance,
      asset_identifier: assetId,
    };
  });
}

export function paginate<T>(balances: T[], limit: number, offset: number) {
  return balances.slice(offset, offset + limit);
}

export function removeZeroBalanceData<T extends FtBalance | NftBalance>(
  balances: Record<string, T>
): Record<string, T> {
  const filtered: Record<string, T> = {};
  Object.entries(balances).forEach(([assetId, balance]) => {
    const balanceOrCount = 'balance' in balance ? balance.balance : balance.count;
    if (parseFloat(balanceOrCount || '0') > 0) {
      filtered[assetId] = balance;
    }
  });
  return filtered;
}

export function filterBalancesBySearchTerm(
  balances: FtBalanceWithAssetId[],
  searchTerm: string
): FtBalanceWithAssetId[] {
  if (!searchTerm) return balances;

  return balances.filter(balance =>
    balance.asset_identifier?.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

export function filterBalancesBySuspiciousTokens(
  balances: FtBalanceWithAssetId[],
  hideSuspiciousTokens: boolean
): FtBalanceWithAssetId[] {
  if (!hideSuspiciousTokens) return balances;

  return balances.filter(balance => {
    const { address, contract } = getAssetNameParts(balance.asset_identifier);
    const tokenId = `${address}.${contract}`;
    return !isRiskyToken(tokenId);
  });
}

export function filterBalancesByZeroBalanceTokens(
  balances: FtBalanceWithAssetId[],
  hideZeroBalanceTokens: boolean
): FtBalanceWithAssetId[] {
  if (!hideZeroBalanceTokens) return balances;

  return balances.filter(balance => {
    return parseFloat(balance.balance || '0') > 0;
  });
}

export function filterBalances(
  balances: FtBalanceWithAssetId[],
  searchTerm: string,
  hideSuspiciousTokens: boolean,
  hideZeroBalanceTokens: boolean
): FtBalanceWithAssetId[] {
  const filteredBySearchTerm = filterBalancesBySearchTerm(balances, searchTerm);
  const filteredBySuspiciousTokens = filterBalancesBySuspiciousTokens(
    filteredBySearchTerm,
    hideSuspiciousTokens
  );
  const filteredByZeroBalanceTokens = filterBalancesByZeroBalanceTokens(
    filteredBySuspiciousTokens,
    hideZeroBalanceTokens
  );
  return filteredByZeroBalanceTokens;
}

export function putSBTCFirst(
  balances: FtBalanceWithAssetId[],
  networkMode: NetworkModes | undefined
): FtBalanceWithAssetId[] {
  const sbtcAssetId = getSbtcAssetId(networkMode);
  if (!sbtcAssetId) {
    return balances;
  }
  const sbtc = balances.find(balance => balance.asset_identifier === sbtcAssetId);
  if (sbtc) {
    balances = balances.filter(balance => balance.asset_identifier !== sbtcAssetId);
    balances.unshift(sbtc);
  }
  return balances;
}

// 1. Fetch the balances
// 2. Process the balances
// 3. Fetch the metadata
// 4. Merge balances and metadata
// 5. Return the result
export function useFungibleTokensTableData(
  principal: string,
  limit: number,
  offset: number,
  searchTerm?: string | undefined,
  hideSuspiciousTokens?: boolean | undefined,
  hideZeroBalanceTokens?: boolean | undefined
) {
  const networkMode = useSbtcNetworkMode();
  let {
    data: balances,
    isFetching: isFetchingBalances,
    isLoading: isLoadingBalances,
  } = useAccountBalance(principal, {
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
  });

  const positiveDefinedBalancesArray = useMemo(() => {
    return convertBalancesToArrayWithAssetId(
      removeUndefinedFromBalances<FtBalance>(balances?.fungible_tokens || {})
    );
  }, [balances?.fungible_tokens]);

  const filteredBalancesArray = useMemo(() => {
    return filterBalances(
      positiveDefinedBalancesArray,
      searchTerm || '',
      hideSuspiciousTokens || false,
      hideZeroBalanceTokens || false
    );
  }, [positiveDefinedBalancesArray, searchTerm, hideSuspiciousTokens, hideZeroBalanceTokens]);

  const balancesWithSBTCFirst = useMemo(() => {
    return putSBTCFirst(filteredBalancesArray, networkMode);
  }, [filteredBalancesArray, networkMode]);

  const paginatedBalances = useMemo(() => {
    return paginate(balancesWithSBTCFirst, limit, offset);
  }, [balancesWithSBTCFirst, limit, offset]);

  // extract token ids from the processed balances
  const tokenIds = useMemo(
    () =>
      paginatedBalances.map(ftBalance => {
        const { address, contract } = getAssetNameParts(ftBalance.asset_identifier);
        return `${address}.${contract}`;
      }),
    [paginatedBalances]
  );

  // fetch metadata using the token ids
  const {
    ftMetadata,
    isLoading: isLoadingMetadata,
    isFetching: isFetchingMetadata,
  } = useFungibleTokensMetadata(tokenIds);

  // the final data object, containing both balance and metadata
  const ftBalanceAndMetadata: FungibleTokenWithMetadata[] = useMemo(() => {
    const result: FungibleTokenWithMetadata[] = [];
    paginatedBalances.forEach((balance, index) => {
      const metadata = ftMetadata[index];
      result.push({
        ...EMPTY_METADATA,
        ...balance,
        ...(metadata ?? {}),
        asset_identifier: balance.asset_identifier,
      });
    });
    return result;
  }, [paginatedBalances, ftMetadata]);

  const total = useMemo(() => {
    const isFiltered = searchTerm || hideSuspiciousTokens;
    const totalBalances = Object.keys(balances?.fungible_tokens || {}).length;
    const filteredBalances = Object.keys(filteredBalancesArray).length;
    return isFiltered ? filteredBalances : totalBalances;
  }, [balances?.fungible_tokens, filteredBalancesArray, hideSuspiciousTokens, searchTerm]);

  return {
    data: ftBalanceAndMetadata,
    isLoading: isLoadingBalances || isLoadingMetadata,
    isFetching: isFetchingBalances || isFetchingMetadata,
    total,
  };
}
