import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';

import { AddressTransaction } from '@stacks/stacks-blockchain-api-types';

import {
  addressBalanceMockData,
  addressTxsMockData,
  mockAddress,
} from '../../../../common/mockData/txsData';
import { store } from '../../../../common/state/store';
import { useTxsCSVData } from '../useTxsCSVData';

const queryClient = new QueryClient();

queryClient.setQueryData(
  ['addressConfirmedTxsWithTransfersInfinite', mockAddress],
  addressTxsMockData
);

queryClient.setQueryData(['accountBalance', mockAddress], addressBalanceMockData);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </Provider>
);

describe('useTxsCSVData Custom Hook', () => {
  it('should match the getTxsCSVData result with the snapshot', () => {
    const { result } = renderHook(() => useTxsCSVData(), { wrapper });

    const txsCsvData = result.current.getTxsCSVData(mockAddress);

    expect(txsCsvData.length).toBe(addressTxsMockData.pages[0].results.length);
    expect(txsCsvData).toMatchSnapshot();
  });

  it('should match the formatTxsCSVData result with the snapshot', () => {
    const { result } = renderHook(() => useTxsCSVData(), { wrapper });

    const formatTxsData = result.current.formatTxsCSVData(
      addressTxsMockData.pages[0].results as unknown as AddressTransaction[],
      addressBalanceMockData.stx.balance
    );

    expect(formatTxsData.length).toBe(addressTxsMockData.pages[0].results.length);
    expect(formatTxsData).toMatchSnapshot();
  });
});
