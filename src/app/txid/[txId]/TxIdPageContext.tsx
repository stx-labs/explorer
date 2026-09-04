'use client';

import { ReactNode, createContext, useContext } from 'react';

import {
  MempoolTransaction,
  SmartContract,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import { TxIdPageFilters } from './page';

interface TxIdPageDataContextType {
  stxPrice: number;
  initialTxData?: Transaction | MempoolTransaction;
  /** Called contract, fetched server-side for failed contract calls so Tier 0 renders on first paint. */
  initialContractData?: SmartContract;
  txId: string;
  filters: TxIdPageFilters;
  numFunctions?: number;
}

const DEFAULT_TX_ID_PAGE_DATA: TxIdPageDataContextType = {
  stxPrice: 0,
  initialTxData: undefined,
  txId: '',
  filters: {
    fromAddress: '',
    toAddress: '',
    startTime: '',
    endTime: '',
    transactionType: [],
  },
};

const TxIdPageDataContext = createContext<TxIdPageDataContextType>(DEFAULT_TX_ID_PAGE_DATA);

interface TxIdPageDataProviderProps {
  children: ReactNode;
  stxPrice?: number;
  initialTxData?: Transaction | MempoolTransaction;
  initialContractData?: SmartContract;
  txId: string;
  filters: TxIdPageFilters;
  numFunctions?: number;
}

export function TxIdPageDataProvider({
  children,
  stxPrice = DEFAULT_TX_ID_PAGE_DATA.stxPrice,
  initialTxData,
  initialContractData,
  txId,
  filters,
  numFunctions,
}: TxIdPageDataProviderProps) {
  const contextValue = {
    stxPrice,
    initialTxData,
    initialContractData,
    txId,
    filters,
    numFunctions,
  };

  return (
    <TxIdPageDataContext.Provider value={contextValue}>{children}</TxIdPageDataContext.Provider>
  );
}

export function useTxIdPageData() {
  return useContext(TxIdPageDataContext);
}
