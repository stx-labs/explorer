'use client';

import { CompressedTxAndMempoolTxTableData } from '@/app/transactions/utils';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { ReactNode, createContext, useContext } from 'react';

import { FungibleTokenHolderList } from '@stacks/stacks-blockchain-api-types';

import { MergedTokenData, RedesignMergedTokenData } from '../../types';

interface TokenIdPageDataContextType {
  stxPrice: number;
  btcPrice: number;
  initialAddressRecentTransactionsData:
    | GenericResponseType<CompressedTxAndMempoolTxTableData>
    | undefined;
  tokenId: string;
  tokenData: MergedTokenData | undefined;
  redesignTokenData: RedesignMergedTokenData | undefined;
  txBlockTime: number | undefined;
  txId: string | undefined;
  assetId: string | undefined;
  holders: FungibleTokenHolderList | undefined;
  numFunctions: number | undefined;
}

const DEFAULT_TOKEN_ID_PAGE_DATA: TokenIdPageDataContextType = {
  stxPrice: 0,
  btcPrice: 0,
  initialAddressRecentTransactionsData: undefined,
  tokenId: '',
  tokenData: undefined,
  redesignTokenData: undefined,
  txBlockTime: undefined,
  txId: undefined,
  assetId: undefined,
  holders: undefined,
  numFunctions: undefined,
};

const TokenIdPageDataContext = createContext<TokenIdPageDataContextType>(
  DEFAULT_TOKEN_ID_PAGE_DATA
);

interface TokenIdPageDataProviderProps {
  children: ReactNode;
  stxPrice: number;
  btcPrice: number;
  initialAddressRecentTransactionsData:
    | GenericResponseType<CompressedTxAndMempoolTxTableData>
    | undefined;
  tokenData: MergedTokenData | undefined;
  redesignTokenData: RedesignMergedTokenData | undefined;
  tokenId: string;
  txBlockTime: number | undefined;
  txId: string | undefined;
  assetId: string | undefined;
  holders: FungibleTokenHolderList | undefined;
  numFunctions: number | undefined;
}

export function TokenIdPageDataProvider({
  children,
  stxPrice = DEFAULT_TOKEN_ID_PAGE_DATA.stxPrice,
  btcPrice = DEFAULT_TOKEN_ID_PAGE_DATA.btcPrice,
  initialAddressRecentTransactionsData,
  tokenId,
  tokenData,
  redesignTokenData,
  txBlockTime,
  txId,
  assetId,
  holders,
  numFunctions,
}: TokenIdPageDataProviderProps) {
  const contextValue = {
    stxPrice,
    btcPrice,
    initialAddressRecentTransactionsData,
    tokenId,
    tokenData,
    redesignTokenData,
    txBlockTime,
    txId,
    assetId,
    holders,
    numFunctions,
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
