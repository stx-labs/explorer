import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import type { WatchlistItem } from './types';

export interface WatchlistState {
  items: WatchlistItem[];
  hydrated: boolean;
  notificationsDisabled: boolean;
}

export const watchlistInitialState: WatchlistState = {
  items: [],
  hydrated: false,
  notificationsDisabled: false,
};

export const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState: watchlistInitialState,
  reducers: {
    hydrateWatchlist: (
      state,
      action: PayloadAction<{ items: WatchlistItem[]; notificationsDisabled: boolean }>
    ) => {
      state.items = action.payload.items;
      state.notificationsDisabled = action.payload.notificationsDisabled;
      state.hydrated = true;
    },
    addWatchlistItem: (state, action: PayloadAction<WatchlistItem>) => {
      const exists = state.items.some(i => i.principal === action.payload.principal);
      if (!exists) {
        state.items.push(action.payload);
      }
    },
    removeWatchlistItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.principal !== action.payload);
    },
    updateWatchlistItem: (
      state,
      action: PayloadAction<{ principal: string; patch: Partial<WatchlistItem> }>
    ) => {
      const idx = state.items.findIndex(i => i.principal === action.payload.principal);
      if (idx >= 0) {
        state.items[idx] = { ...state.items[idx], ...action.payload.patch };
      }
    },
    markWatchlistAddressViewed: (state, action: PayloadAction<string>) => {
      const idx = state.items.findIndex(i => i.principal === action.payload);
      if (idx >= 0) {
        state.items[idx].lastViewedAt = Date.now();
      }
    },
    markAllWatchlistViewed: state => {
      const now = Date.now();
      state.items = state.items.map(i => ({ ...i, lastViewedAt: now }));
    },
    /** WONT_FIX (MVP): drag-and-drop order not exposed in UI; reducer kept for slice shape stability. */
    reorderWatchlist: (state, action: PayloadAction<WatchlistItem[]>) => {
      state.items = action.payload;
    },
    setWatchlistNotificationsDisabled: (state, action: PayloadAction<boolean>) => {
      state.notificationsDisabled = action.payload;
    },
  },
});

export const {
  hydrateWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
  updateWatchlistItem,
  markWatchlistAddressViewed,
  markAllWatchlistViewed,
  setWatchlistNotificationsDisabled,
} = watchlistSlice.actions;
