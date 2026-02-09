'use client';

import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { useContractById } from '@/common/queries/useContractById';
import { useFtMetadata } from '@/common/queries/useFtMetadata';
import { useHolders } from '@/common/queries/useHolders';
import { CompressedTxAndMempoolTxTableData } from '@/common/utils/transaction-utils';
import { ReactNode, createContext, useContext, useMemo } from 'react';

import { FungibleTokenHolderList } from '@stacks/stacks-blockchain-api-types';

import { MergedTokenData } from '../../types';

interface TokenIdPageDataContextType {
  stxPrice: number;
  btcPrice: number;
  initialAddressRecentTransactionsData:
    | GenericResponseType<CompressedTxAndMempoolTxTableData>
    | undefined;
  tokenId: string;
  tokenData: MergedTokenData | undefined;
  txBlockTime: number | undefined;
  txId: string | undefined;
  assetId: string | undefined;
  holders: FungibleTokenHolderList | undefined;
  numFunctions: number | undefined;
  isLoadingTokenData: boolean;
}

const TokenIdPageDataContext = createContext<TokenIdPageDataContextType | undefined>(undefined);

interface TokenIdPageDataProviderProps
  extends Omit<TokenIdPageDataContextType, 'isLoadingTokenData'> {
  children: ReactNode;
}

export function TokenIdPageDataProvider({
  children,
  stxPrice,
  btcPrice,
  initialAddressRecentTransactionsData,
  tokenId,
  tokenData: ssrTokenData,
  txBlockTime,
  txId,
  assetId: ssrAssetId,
  holders: ssrHolders,
  numFunctions: ssrNumFunctions,
}: TokenIdPageDataProviderProps) {
  const { data: contractInfo, isLoading: isLoadingContract } = useContractById(tokenId, {
    enabled: !ssrAssetId,
  });

  const clientAssetId = useMemo(() => {
    if (ssrAssetId) return ssrAssetId;
    if (!contractInfo?.abi) return undefined;
    const ftName = contractInfo.abi.fungible_tokens?.[0]?.name;
    return ftName ? `${tokenId}::${ftName}` : undefined;
  }, [ssrAssetId, contractInfo, tokenId]);

  const needsMetadataFetch = !ssrTokenData || typeof ssrTokenData.decimals !== 'number';

  const needsTotalSupplyFetch =
    typeof ssrTokenData?.totalSupply !== 'number' && !ssrHolders?.total_supply;

  const { data: ftMetadata, isLoading: isLoadingFtMetadata } = useFtMetadata(tokenId, {
    enabled: needsMetadataFetch,
  });

  const { data: clientHoldersData, isLoading: isLoadingHolders } = useHolders(
    clientAssetId || '',
    1,
    0,
    {
      enabled: needsTotalSupplyFetch && !!clientAssetId,
    }
  );

  const clientNumFunctions = useMemo(() => {
    if (ssrNumFunctions !== undefined) return ssrNumFunctions;
    return contractInfo?.abi?.functions?.length;
  }, [ssrNumFunctions, contractInfo]);

  const tokenData = useMemo((): MergedTokenData | undefined => {
    const decimals = ssrTokenData?.decimals ?? ftMetadata?.decimals;

    const totalSupplyRaw =
      ssrTokenData?.totalSupply ?? ssrHolders?.total_supply ?? clientHoldersData?.total_supply;
    const totalSupply =
      typeof totalSupplyRaw === 'string' ? parseFloat(totalSupplyRaw) : totalSupplyRaw;

    return {
      ...ssrTokenData,
      name: ssrTokenData?.name ?? ftMetadata?.name ?? ftMetadata?.metadata?.name,
      symbol: ssrTokenData?.symbol ?? ftMetadata?.symbol,
      imageUri: ssrTokenData?.imageUri ?? ftMetadata?.image_uri,
      decimals,
      totalSupply,
    };
  }, [ssrTokenData, ftMetadata, ssrHolders, clientHoldersData]);

  const isLoadingTokenData =
    (needsMetadataFetch && isLoadingFtMetadata) ||
    (!ssrAssetId && isLoadingContract) ||
    (needsTotalSupplyFetch && !!clientAssetId && isLoadingHolders);

  const holders = ssrHolders || clientHoldersData;

  const contextValue = {
    stxPrice,
    btcPrice,
    initialAddressRecentTransactionsData,
    tokenId,
    tokenData,
    txBlockTime,
    txId,
    assetId: clientAssetId,
    holders,
    numFunctions: clientNumFunctions,
    isLoadingTokenData,
  };

  return (
    <TokenIdPageDataContext.Provider value={contextValue}>
      {children}
    </TokenIdPageDataContext.Provider>
  );
}

export function useTokenIdPageData() {
  const context = useContext(TokenIdPageDataContext);
  if (!context) {
    throw new Error('useTokenIdPageData must be used within a TokenIdPageDataProvider');
  }
  return context;
}
