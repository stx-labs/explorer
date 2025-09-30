'use client';

import { CompressedTxAndMempoolTxTableData } from '@/app/transactions/utils';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { ReactNode, createContext, useContext } from 'react';

import {
  AddressTransactionsListResponse,
} from '@stacks/stacks-blockchain-api-types';

interface TokenIdPageDataContextType {
  stxPrice: number;
  btcPrice: number;
  initialAddressRecentTransactionsData?:
    | AddressTransactionsListResponse
    | GenericResponseType<CompressedTxAndMempoolTxTableData>;
  tokenId: string;
}

const DEFAULT_TOKEN_ID_PAGE_DATA: TokenIdPageDataContextType = {
  stxPrice: 0,
  btcPrice: 0,
  initialAddressRecentTransactionsData: undefined,
  tokenId: '',
};

const TokenIdPageDataContext = createContext<TokenIdPageDataContextType>(
  DEFAULT_TOKEN_ID_PAGE_DATA
);

interface TokenIdPageDataProviderProps {
  children: ReactNode;
  stxPrice?: number;
  btcPrice?: number;
  initialAddressRecentTransactionsData?:
    | AddressTransactionsListResponse
    | GenericResponseType<CompressedTxAndMempoolTxTableData>;
  tokenId: string;
}

export function TokenIdPageDataProvider({
  children,
  stxPrice = DEFAULT_TOKEN_ID_PAGE_DATA.stxPrice,
  btcPrice = DEFAULT_TOKEN_ID_PAGE_DATA.btcPrice,
  initialAddressRecentTransactionsData,
  tokenId,
}: TokenIdPageDataProviderProps) {
  const contextValue = {
    stxPrice,
    btcPrice,
    initialAddressRecentTransactionsData,
    tokenId,
  };

  return (
    <TokenIdPageDataContext.Provider value={contextValue}>
      {children}
    </TokenIdPageDataContext.Provider>
  );
}

export function useTokenIdPageData() {
  return useContext(TokenIdPageDataContext);
}
