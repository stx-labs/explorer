/**
 * This file implements a Redux slice for managing transaction filtering and sorting state.
 * It provides a flexible system for handling different types of transaction views (homepage, blocks page, etc.)
 * with their own independent filter and sort states.
 */
import { PayloadAction, Reducer, createSelector, createSlice } from '@reduxjs/toolkit';

import { operations } from '@stacks/blockchain-api-client/lib/generated/schema';

import { RootState } from '../../common/state/store';

// Type definitions for mempool transaction queries and sorting
type MempoolQuery = NonNullable<operations['get_mempool_transaction_list']['parameters']['query']>;
type MempoolOrderBy = Exclude<MempoolQuery['order_by'], undefined>;
type MempoolOrder = Exclude<MempoolQuery['order'], undefined>;

// Type definitions for confirmed transaction queries and sorting
type TxsQuery = NonNullable<operations['get_transaction_list']['parameters']['query']>;
type TxSortBy = Exclude<TxsQuery['sort_by'], undefined>;
type TxOrder = Exclude<TxsQuery['order'], undefined>;

/**
 * Enum defining different contexts where transaction filtering and sorting can be applied.
 * Each type represents a different view or page in the application where transactions are displayed.
 */
export enum TxFilterAndSortTypes {
  HomepageTxFilter = 'HomepageTxFilter',
  TxsPageTxFilter = 'TxsPageTxFilter',
  MempoolPageTxFilter = 'MempoolPageTxFilter',
  TxPageTxFilter = 'TxPageTxFilter',
  BlocksPageTxFilter = 'BlocksPageTxFilter',
  SandboxTxFilter = 'SandboxTxFilter',
  AddressTxFilter = 'AddressTxFilter',
  SearchTxFilter = 'SearchTxFilter',
}

// Type mapping each filter type to its corresponding state
export type TxFilters = { [key in TxFilterAndSortTypes]: TxFilterAndSortState };

/**
 * Interface defining the shape of the filter and sort state for transactions.
 * This state is maintained independently for each filter type.
 */
export interface TxFilterAndSortState {
  activeFilters: string[]; // Currently active filter values
  activeMempoolTxsSort: MempoolOrderBy; // Sort field for mempool transactions
  activeMempoolTxsOrder: MempoolOrder; // Sort direction for mempool transactions
  activeConfirmedTxsSort: TxSortBy; // Sort field for confirmed transactions
  activeConfirmedTxsOrder: TxOrder; // Sort direction for confirmed transactions
  isVisible: boolean; // Whether the filter UI is visible
}

/**
 * Default state values for a new filter instance
 */
export const initialState: TxFilterAndSortState = {
  activeFilters: [],
  activeMempoolTxsSort: 'age',
  activeMempoolTxsOrder: 'desc',
  activeConfirmedTxsSort: 'burn_block_time',
  activeConfirmedTxsOrder: 'desc',
  isVisible: false,
};

/**
 * Creates the slice configuration for a specific filter type.
 * Each filter type gets its own set of reducers and actions.
 */
const createSliceOptions = (filterType: TxFilterAndSortTypes) => ({
  name: filterType,
  initialState,
  reducers: {
    setActiveFilters: (state: TxFilterAndSortState, action: PayloadAction<string[]>) => {
      state.activeFilters = action.payload;
    },
    setMempoolTxsActiveSort: (
      state: TxFilterAndSortState,
      action: PayloadAction<MempoolOrderBy>
    ) => {
      state.activeMempoolTxsSort = action.payload;
    },
    setMempoolTxsActiveOrder: (state: TxFilterAndSortState, action: PayloadAction<TxOrder>) => {
      state.activeMempoolTxsOrder = action.payload;
    },
    setConfirmedTxsActiveSort: (state: TxFilterAndSortState, action: PayloadAction<TxSortBy>) => {
      state.activeConfirmedTxsSort = action.payload;
    },
    setConfirmedTxsActiveOrder: (state: TxFilterAndSortState, action: PayloadAction<TxOrder>) => {
      state.activeConfirmedTxsOrder = action.payload;
    },
  },
});

/**
 * Creates a complete Redux slice for a specific filter type, including:
 * - The slice itself with reducers
 * - Action creators
 * - Selectors for accessing the state
 */
export const createTxFilterAndSortSlice = (filterType: TxFilterAndSortTypes) => {
  const slice = createSlice(createSliceOptions(filterType));
  const selectTxFilter = (state: RootState) => state[filterType];

  // Memoized selectors for accessing specific pieces of state
  const selectActiveFilters = createSelector([selectTxFilter], state => state.activeFilters);
  const selectMempoolTxsActiveSort = createSelector(
    [selectTxFilter],
    state => state.activeMempoolTxsSort
  );
  const selectMempoolTxsActiveOrder = createSelector(
    [selectTxFilter],
    state => state.activeMempoolTxsOrder
  );
  const selectConfirmedTxsActiveSort = createSelector(
    [selectTxFilter],
    state => state.activeConfirmedTxsSort
  );
  const selectConfirmedTxsActiveOrder = createSelector(
    [selectTxFilter],
    state => state.activeConfirmedTxsOrder
  );

  return {
    slice,
    actions: slice.actions,
    selectors: {
      selectActiveFilters,
      selectMempoolTxsActiveSort,
      selectMempoolTxsActiveOrder,
      selectConfirmedTxsActiveSort,
      selectConfirmedTxsActiveOrder,
    },
  };
};

/**
 * Creates a complete set of filter slices for all filter types.
 * Each filter type gets its own independent state management.
 */
export const txFilterAndSort = Object.keys(TxFilterAndSortTypes).reduce(
  (acc, filterType) => ({
    ...acc,
    [filterType]: createTxFilterAndSortSlice(filterType as TxFilterAndSortTypes),
  }),
  {} as Record<TxFilterAndSortTypes, ReturnType<typeof createTxFilterAndSortSlice>>
);

/**
 * Combines all filter reducers into a single object for easy integration with the root reducer.
 */
export const filterAndSortReducers = Object.values(TxFilterAndSortTypes).reduce(
  (acc, txFilter) => ({ ...acc, [txFilter]: txFilterAndSort[txFilter].slice.reducer }),
  {} as Record<TxFilterAndSortTypes, Reducer<TxFilterAndSortState>>
);
