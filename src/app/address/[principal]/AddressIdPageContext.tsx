'use client';

import { CompressedPoxInfo } from '@/app/address/[principal]/page-data';
import { GenericResponseType } from '@/common/hooks/useInfiniteQueryResult';
import { CompressedTxAndMempoolTxTableData } from '@/common/utils/transaction-utils';
import { ReactNode, createContext, useContext, useMemo } from 'react';

import {
  AddressBalanceResponse,
  AddressNonces,
  AddressTransactionsListResponse,
  BnsNamesOwnByAddressResponse,
  BurnchainRewardsTotal,
} from '@stacks/stacks-blockchain-api-types';

interface AddressIdPageDataContextType {
  stxPrice: number;
  btcPrice: number;
  initialAddressBalancesData?: AddressBalanceResponse;
  initialAddressLatestNonceData?: AddressNonces;
  initialAddressBNSNamesData?: BnsNamesOwnByAddressResponse;
  initialBurnChainRewardsData?: BurnchainRewardsTotal;
  initialAddressRecentTransactionsData?:
    | AddressTransactionsListResponse
    | GenericResponseType<CompressedTxAndMempoolTxTableData>;
  initialPoxInfoData?: CompressedPoxInfo;
  principal: string;
}

const DEFAULT_ADDRESS_ID_PAGE_DATA: AddressIdPageDataContextType = {
  stxPrice: 0,
  btcPrice: 0,
  initialAddressBalancesData: undefined,
  initialAddressLatestNonceData: undefined,
  initialAddressBNSNamesData: undefined,
  initialBurnChainRewardsData: undefined,
  initialAddressRecentTransactionsData: undefined,
  initialPoxInfoData: undefined,
  principal: '',
};

const AddressIdPageDataContext = createContext<AddressIdPageDataContextType>(
  DEFAULT_ADDRESS_ID_PAGE_DATA
);

interface AddressIdPageDataProviderProps extends AddressIdPageDataContextType {
  children: ReactNode;
}

export function AddressIdPageDataProvider({
  children,
  stxPrice = DEFAULT_ADDRESS_ID_PAGE_DATA.stxPrice,
  btcPrice = DEFAULT_ADDRESS_ID_PAGE_DATA.btcPrice,
  initialAddressBalancesData,
  initialAddressLatestNonceData,
  initialAddressBNSNamesData,
  initialBurnChainRewardsData,
  initialPoxInfoData,
  initialAddressRecentTransactionsData,
  principal,
}: AddressIdPageDataProviderProps) {
  const contextValue = useMemo(
    () => ({
      stxPrice,
      btcPrice,
      initialAddressBalancesData,
      initialAddressLatestNonceData,
      initialAddressBNSNamesData,
      initialBurnChainRewardsData,
      initialPoxInfoData,
      initialAddressRecentTransactionsData,
      principal,
    }),
    [
      stxPrice,
      btcPrice,
      initialAddressBalancesData,
      initialAddressLatestNonceData,
      initialAddressBNSNamesData,
      initialBurnChainRewardsData,
      initialPoxInfoData,
      initialAddressRecentTransactionsData,
      principal,
    ]
  );

  return (
    <AddressIdPageDataContext.Provider value={contextValue}>
      {children}
    </AddressIdPageDataContext.Provider>
  );
}

export function useAddressIdPageData() {
  const context = useContext(AddressIdPageDataContext);
  if (context === undefined) {
    throw new Error('useAddressIdPageData must be used within a AddressIdPageDataProvider');
  }
  return context;
}
