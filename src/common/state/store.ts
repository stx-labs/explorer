'use client';

import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { ConnectState, sandboxSlice } from '../../app/sandbox/sandbox-slice';
import { SearchState, searchSlice } from '../../features/search/search-slice';
import {
  TxFilters,
  filterAndSortReducers,
} from '../../features/txsFilterAndSort/txsFilterAndSortSlice';
import { ModalState, modalSlice } from '../components/modals/modal-slice';
import { CurrencyState, currencySlice } from './slices/currency-slice';
import {
  TransactionValueFilterState,
  activeTransactionValueFilterSlice,
} from './slices/transaction-value-filter-slice';
import { WatchlistState, watchlistSlice } from '../../features/watchlist/watchlist-slice';

const rootReducer = combineReducers({
  modal: modalSlice.reducer,
  search: searchSlice.reducer,
  connect: sandboxSlice.reducer,
  activeTransactionValueFilter: activeTransactionValueFilterSlice.reducer,
  currency: currencySlice.reducer,
  watchlist: watchlistSlice.reducer,
  ...filterAndSortReducers,
});

export const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    devTools: true,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<AppStore['getState']>;
export type aa = ReturnType<typeof makeStore>;
export interface RootState extends TxFilters {
  modal: ModalState;
  search: SearchState;
  connect: ConnectState;
  activeTransactionValueFilter: TransactionValueFilterState;
  currency: CurrencyState;
  watchlist: WatchlistState;
}

export type AppDispatch = ReturnType<typeof makeStore>['dispatch'];
