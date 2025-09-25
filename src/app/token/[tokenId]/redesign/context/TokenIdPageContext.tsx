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
  redesignTokenData: MergedTokenData | undefined;
  txBlockTime: number | undefined;
  txId: string | undefined;
  assetId: string | undefined;
  holders: FungibleTokenHolderList | undefined;
}

const TokenIdPageDataContext = createContext<TokenIdPageDataContextType | undefined>(undefined);

interface TokenIdPageDataProviderProps extends TokenIdPageDataContextType {
  children: ReactNode;
}

export function TokenIdPageDataProvider({
  children,
  stxPrice,
  btcPrice,
  initialAddressRecentTransactionsData,
  tokenId,
  redesignTokenData,
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
    redesignTokenData,
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
