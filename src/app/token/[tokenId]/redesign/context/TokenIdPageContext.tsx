'use client';

import { useContractById } from '@/common/queries/useContractById';
import { useFtMetadata } from '@/common/queries/useFtMetadata';
import { useHolders, useTokenSupply } from '@/common/queries/useHolders';
import { FtHolderListResponse } from '@/common/types/tokens-v3';
import { PrincipalTransactionSummaryListResponse } from '@/common/types/tx-v3';
import { ReactNode, createContext, useContext, useMemo } from 'react';

import { MergedTokenData } from '../../types';

interface TokenIdPageDataContextType {
  stxPrice: number;
  btcPrice: number;
  initialAddressRecentTransactionsData: PrincipalTransactionSummaryListResponse | undefined;
  tokenId: string;
  tokenData: MergedTokenData | undefined;
  txBlockTime: number | undefined;
  txId: string | undefined;
  assetId: string | undefined;
  holders: FtHolderListResponse | undefined;
  // On-chain total supply in the token's base units, as a string-quoted integer.
  supply: string | undefined;
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
  supply: ssrSupply,
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

  const needsSupplyFetch = !ssrSupply;

  const { data: ftMetadata, isLoading: isLoadingFtMetadata } = useFtMetadata(tokenId, {
    enabled: needsMetadataFetch,
  });

  const { data: clientHoldersData } = useHolders(clientAssetId || '', 1, undefined, {
    enabled: !ssrHolders && !!clientAssetId,
  });

  const { data: clientSupply, isLoading: isLoadingSupply } = useTokenSupply(clientAssetId || '', {
    enabled: needsSupplyFetch && !!clientAssetId,
  });

  const supply = ssrSupply ?? clientSupply;

  const clientNumFunctions = useMemo(() => {
    if (ssrNumFunctions !== undefined) return ssrNumFunctions;
    return contractInfo?.abi?.functions?.length;
  }, [ssrNumFunctions, contractInfo]);

  const tokenData = useMemo((): MergedTokenData | undefined => {
    const decimals = ssrTokenData?.decimals ?? ftMetadata?.decimals;

    const totalSupply = ssrTokenData?.totalSupply ?? (supply ? parseFloat(supply) : undefined);

    return {
      ...ssrTokenData,
      name: ssrTokenData?.name ?? ftMetadata?.metadata?.name ?? ftMetadata?.name,
      symbol: ssrTokenData?.symbol ?? ftMetadata?.symbol,
      imageUri: ssrTokenData?.imageUri ?? ftMetadata?.image_uri,
      decimals,
      totalSupply,
    };
  }, [ssrTokenData, ftMetadata, supply]);

  const isLoadingTokenData =
    (needsMetadataFetch && isLoadingFtMetadata) ||
    (!ssrAssetId && isLoadingContract) ||
    (typeof ssrTokenData?.totalSupply !== 'number' &&
      needsSupplyFetch &&
      !!clientAssetId &&
      isLoadingSupply);

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
    supply,
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
