'use client';

import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { CompressedTxAndMempoolTxTableData } from '@/common/utils/transaction-utils';
import { ReactNode, createContext, useContext } from 'react';

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
}

const DEFAULT_TOKEN_ID_PAGE_DATA: TokenIdPageDataContextType = {
  stxPrice: 0,
  btcPrice: 0,
  initialAddressRecentTransactionsData: undefined,
  tokenId: '',
  tokenData: undefined,
  txBlockTime: undefined,
  txId: undefined,
  assetId: undefined,
  holders: undefined,
};

const TokenIdPageDataContext = createContext<TokenIdPageDataContextType>(
  DEFAULT_TOKEN_ID_PAGE_DATA
);

interface TokenIdPageDataProviderProps extends TokenIdPageDataContextType {
  children: ReactNode;
}

export function TokenIdPageDataProvider({
  children,
  stxPrice = DEFAULT_TOKEN_ID_PAGE_DATA.stxPrice,
  btcPrice = DEFAULT_TOKEN_ID_PAGE_DATA.btcPrice,
  initialAddressRecentTransactionsData,
  tokenId,
  tokenData,
  txBlockTime,
  txId,
  assetId,
  holders,
}: TokenIdPageDataProviderProps) {
  const contextValue = {
    stxPrice,
    btcPrice,
    initialAddressRecentTransactionsData,
    tokenId,
    tokenData,
    txBlockTime,
    txId,
    assetId,
    holders,
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
