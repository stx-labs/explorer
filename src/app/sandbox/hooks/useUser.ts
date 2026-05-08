'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { connect, disconnect, getLocalStorage, isConnected } from '@stacks/connect';
import { AddressTransaction, MempoolTransaction } from '@stacks/stacks-blockchain-api-types';

import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { useInfiniteQueryResult } from '../../../common/hooks/useInfiniteQueryResult';
import { useAccountBalance } from '../../../common/queries/useAccountBalance';
import { useAddressConfirmedTxsWithTransfersInfinite } from '../../../common/queries/useAddressConfirmedTxsWithTransfersInfinite';
import { useAddressMempoolTxsInfinite } from '../../../common/queries/useAddressMempoolTxsInfinite';
import { useAppDispatch, useAppSelector } from '../../../common/state/hooks';
import { disconnect as disconnectAction, selectUserData, setUserData } from '../sandbox-slice';

const NETWORK_URL_KEY = 'stacks-wallet-network-url';

export type UserData = {
  stxAddress: string;
  publicKey: string;
  networkUrl: string;
};

// @stacks/connect types
interface AddressEntry {
  symbol?: string;
  address: string;
  publicKey: string;
}

interface GetAddressesResult {
  addresses: AddressEntry[];
}

interface xVerseWalletAddressEntry {
  address: string;
  publicKey: string;
  purpose: string;
  addressType: string;
  walletType: string;
}

interface xVerseWalletGetAddressesResult {
  id: string;
  walletType: string;
  addresses: xVerseWalletAddressEntry[];
  network: {
    bitcoin: {
      name: string;
    };
    stacks: {
      name: string;
    };
  };
}

export function useUser() {
  const dispatch = useAppDispatch();
  const userData = useAppSelector(selectUserData);
  const [isLoading, setIsLoading] = useState(false);
  const { activeNetwork } = useGlobalContext();

  useEffect(() => {
    if (isConnected()) {
      const localStorageData = getLocalStorage();
      if (localStorageData?.addresses) {
        if (localStorageData.addresses.stx && localStorageData.addresses.stx.length > 0) {
          const stxAddr = localStorageData.addresses.stx[0];

          const storedNetworkUrl = localStorage.getItem(NETWORK_URL_KEY);
          if (storedNetworkUrl && storedNetworkUrl !== activeNetwork.url) {
            console.log('Stored network URL does not match current network, disconnecting wallet');
            disconnect();
            dispatch(disconnectAction());
            return;
          }

          dispatch(
            setUserData({
              userData: {
                stxAddress: stxAddr.address,
                publicKey: '',
                networkUrl: activeNetwork.url,
              },
            })
          );
        }
      }
    }
  }, [dispatch, activeNetwork.url]);

  // refetch address data
  // TODO: Why are we doing this?
  const stxAddress = userData?.stxAddress;

  const confirmedTxsResponse = useAddressConfirmedTxsWithTransfersInfinite(stxAddress);
  const mempoolTxsResponse = useAddressMempoolTxsInfinite(stxAddress);
  const { data: balance } = useAccountBalance(stxAddress);

  const transactionsWithTransfers =
    useInfiniteQueryResult<AddressTransaction>(confirmedTxsResponse);
  const txs = useMemo(
    () => transactionsWithTransfers.map(tx => tx.tx),
    [transactionsWithTransfers]
  );
  const mempoolTransactions = useInfiniteQueryResult<MempoolTransaction>(mempoolTxsResponse);

  const connectWallet = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response: GetAddressesResult | xVerseWalletGetAddressesResult = await connect();
      console.log('Wallet connection finished');
      console.log('Response:', response);

      if (response?.addresses && response.addresses.length > 0) {
        const stxAddr = response.addresses.find(
          (addr: AddressEntry | xVerseWalletAddressEntry) =>
            ('symbol' in addr && addr.symbol === 'STX') ||
            ('addressType' in addr && addr.addressType === 'stacks')
        );
        if (stxAddr) {
          console.log('Setting user data with STX address:', stxAddr);
          localStorage.setItem(NETWORK_URL_KEY, activeNetwork.url);
          dispatch(
            setUserData({
              userData: {
                stxAddress: stxAddr.address,
                publicKey: stxAddr.publicKey,
                networkUrl: activeNetwork.url,
              },
            })
          );
        }
        throw new Error('No STX address found in response');
      } else {
        console.log('No addresses in response');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, dispatch, activeNetwork.url]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    localStorage.removeItem(NETWORK_URL_KEY);
    dispatch(disconnectAction());
  }, [dispatch]);

  return {
    isConnected: !!userData,
    userData,
    stxAddress,
    txs,
    mempoolTransactions,
    balance,
    refetchTransactions: confirmedTxsResponse.refetch,
    refetchMempoolTransactions: mempoolTxsResponse.refetch,
    hasTransactions: !!txs.length || !!mempoolTransactions.length,
    connect: connectWallet,
    disconnect: disconnectWallet,
    isLoading,
  };
}
