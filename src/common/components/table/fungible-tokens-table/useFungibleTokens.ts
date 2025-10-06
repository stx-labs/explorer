import { NftBalanceWithAssetId } from '@/app/address/[principal]/redesign/NFTTable';
import { SBTC_ASSET_ID } from '@/app/token/[tokenId]/consts';
import { THIRTY_SECONDS } from '@/common/queries/query-stale-time';
import { useAccountBalance } from '@/common/queries/useAccountBalance';
import { useFungibleTokensMetadata } from '@/common/queries/useFtMetadata';
import { isRiskyToken } from '@/common/utils/fungible-token-utils';
import { getAssetNameParts } from '@/common/utils/utils';
import { FtMetadataResponse } from '@hirosystems/token-metadata-api-client';
// TOOD: This type is horribly out of date
import { UseQueryOptions } from '@tanstack/react-query';
import { useMemo } from 'react';

import { FtBalance, NftBalance } from '@stacks/stacks-blockchain-api-types';

type FtBalanceWithAssetId = FtBalance & { asset_identifier: string };

type FungibleTokenWithMetadata = FtMetadataResponse & FtBalanceWithAssetId;

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

export function paginateBalances<T extends FtBalanceWithAssetId | NftBalanceWithAssetId>(
  balances: T[],
  limit: number,
  offset: number
) {
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

function filterBalancesBySearchTerm(
  balances: FtBalanceWithAssetId[],
  searchTerm: string
): FtBalanceWithAssetId[] {
  if (!searchTerm) return balances;

  return balances.filter(balance =>
    balance.asset_identifier?.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

function filterBalancesBySuspiciousTokens(
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

function filterBalancesByZeroBalanceTokens(
  balances: FtBalanceWithAssetId[],
  hideZeroBalanceTokens: boolean
): FtBalanceWithAssetId[] {
  if (!hideZeroBalanceTokens) return balances;

  return balances.filter(balance => {
    return parseFloat(balance.balance || '0') > 0;
  });
}

function filterBalances(
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

function putSBTCFirst(balances: FtBalanceWithAssetId[]): FtBalanceWithAssetId[] {
  const sbtc = balances.find(balance => balance.asset_identifier === SBTC_ASSET_ID);
  if (sbtc) {
    balances = balances.filter(balance => balance.asset_identifier !== SBTC_ASSET_ID);
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
  hideZeroBalanceTokens?: boolean | undefined,
  options?: Omit<UseQueryOptions<FtMetadataResponse, Error>, 'queryKey' | 'queryFn'>
) {
  let {
    data: balances,
    isFetching: isFetchingBalances,
    isLoading: isLoadingBalances,
  } = useAccountBalance(principal, {
    staleTime: THIRTY_SECONDS,
    gcTime: THIRTY_SECONDS,
    ...options,
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
    return putSBTCFirst(filteredBalancesArray);
  }, [filteredBalancesArray]);

  const paginatedBalances = useMemo(() => {
    return paginateBalances(balancesWithSBTCFirst, limit, offset);
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
  } = useFungibleTokensMetadata(tokenIds, options);

  // the final data object, containing both balance and metadata
  const ftBalanceAndMetadata: FungibleTokenWithMetadata[] = useMemo(() => {
    const result: FungibleTokenWithMetadata[] = [];
    paginatedBalances.forEach(balance => {
      const assetId = balance.asset_identifier;
      const metadata = ftMetadata.find(
        ft => ft && 'asset_identifier' in ft && ft.asset_identifier === assetId // There are instances where ftMetadata is missing
      );
      if (balance && metadata) {
        result.push({
          ...balance,
          ...metadata,
        });
      }
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
