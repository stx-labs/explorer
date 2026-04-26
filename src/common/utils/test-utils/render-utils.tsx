import { ChakraProvider } from '@chakra-ui/react';
import type { PreloadedState } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import React, { type JSX, PropsWithChildren, ReactElement } from 'react';
import { CookiesProvider } from 'react-cookie';
import { Provider } from 'react-redux';

import {
  sandboxSlice,
  initialState as sandboxSliceInitialState,
} from '../../../app/sandbox/sandbox-slice';
import {
  searchSlice,
  initialState as searchSliceInitialState,
} from '../../../features/search/search-slice';
import {
  watchlistInitialState,
  watchlistSlice,
} from '../../../features/watchlist/watchlist-slice';
import {
  TxFilterAndSortTypes,
  TxFilters,
  filterAndSortReducers,
  initialState as filterSliceInitialState,
} from '../../../features/txsFilterAndSort/txsFilterAndSortSlice';
import { system } from '../../../ui/theme/theme';
import {
  modalSlice,
  initialState as modalSliceInitialState,
} from '../../components/modals/modal-slice';
import {
  currencySlice,
  initialState as currencySliceInitialState,
} from '../../state/slices/currency-slice';
import {
  initialState as activeTransactionValueFilterInitialState,
  activeTransactionValueFilterSlice,
} from '../../state/slices/transaction-value-filter-slice';
import { RootState } from '../../state/store';

type ProvidersProps = {
  children: React.ReactNode;
  store?: AppStore;
  queryClient?: QueryClient;
};

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: PreloadedState<RootState>;
  store?: AppStore;
  queryClient?: QueryClient;
}

function createDefaultStore(preloadedState?: PreloadedState<RootState>) {
  return configureStore({
    reducer: {
      modal: modalSlice.reducer,
      search: searchSlice.reducer,
      connect: sandboxSlice.reducer,
      activeTransactionValueFilter: activeTransactionValueFilterSlice.reducer,
      watchlist: watchlistSlice.reducer,
      ...filterAndSortReducers,
    },
    preloadedState: preloadedState ?? {
      modal: modalSliceInitialState,
      search: searchSliceInitialState,
      connect: sandboxSliceInitialState,
      activeTransactionValueFilter: activeTransactionValueFilterInitialState,
      watchlist: watchlistInitialState,
      ...Object.keys(TxFilterAndSortTypes).reduce(
        (acc, filterType) => ({ ...acc, [filterType]: filterSliceInitialState }),
        {} as TxFilters
      ),
    },
  });
}

type AppStore = ReturnType<typeof createDefaultStore>;

function createDefaultQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
}

function AllProviders({ children, store, queryClient }: ProvidersProps) {
  const testStore = store ?? createDefaultStore();
  const testQueryClient = queryClient ?? createDefaultQueryClient();

  return (
    <CookiesProvider>
      <Provider store={testStore}>
        <QueryClientProvider client={testQueryClient}>
          <ChakraProvider value={system}>{children}</ChakraProvider>
        </QueryClientProvider>
      </Provider>
    </CookiesProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState,
    store = createDefaultStore(preloadedState),
    queryClient = createDefaultQueryClient(),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
    return <AllProviders store={store}>{children}</AllProviders>;
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Optional: Export individual providers for cases where you only need one
export function ReduxProvider({ children, store }: ProvidersProps) {
  return <Provider store={store ?? createDefaultStore()}>{children}</Provider>;
}

export function renderWithReduxProviders(
  ui: React.ReactElement,
  {
    preloadedState = {
      modal: modalSliceInitialState,
      search: searchSliceInitialState,
      connect: sandboxSliceInitialState,
      currency: currencySliceInitialState,
      activeTransactionValueFilter: activeTransactionValueFilterInitialState,
      watchlist: watchlistInitialState,
      ...Object.keys(TxFilterAndSortTypes).reduce(
        (acc, filterType) => ({ ...acc, [filterType]: filterSliceInitialState }),
        {} as TxFilters
      ),
    },
    store = configureStore({
      reducer: {
        modal: modalSlice.reducer,
        search: searchSlice.reducer,
        connect: sandboxSlice.reducer,
        activeTransactionValueFilter: activeTransactionValueFilterSlice.reducer,
        currency: currencySlice.reducer,
        watchlist: watchlistSlice.reducer,
        ...filterAndSortReducers,
      },
      preloadedState,
    }),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
    return <Provider store={store}>{children}</Provider>;
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

export function QueryProvider({ children, queryClient }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient ?? createDefaultQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

export function ChakraProviderWrapper({ children }: { children: React.ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}

export const renderWithChakraProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: ChakraProviderWrapper, ...options });
