'use client';

import { PayloadAction, createSelector, createSlice } from '@reduxjs/toolkit';

import { helloWorldContract } from '../../common/constants/contracts/hello-world-contract';
import { RootState } from '../../common/state/store';
import { UserData } from './hooks/useUser';

export interface ConnectState {
  userData: UserData | undefined;
  codeBody: string;
  showRightPanel: boolean;
  showCodeToolbar: boolean;
}

export const initialState: ConnectState = {
  userData: undefined,
  codeBody: helloWorldContract.source,
  showRightPanel: false,
  showCodeToolbar: false,
};

export const sandboxSlice = createSlice({
  name: 'connect',
  initialState,
  reducers: {
    disconnect: state => {
      state.userData = undefined;
      state.showRightPanel = false;
    },
    setUserData: (state, action: PayloadAction<{ userData: UserData }>) => {
      state.userData = action.payload.userData;
    },
    setCodeBody: (state, action: PayloadAction<{ codeBody: string }>) => {
      state.codeBody = action.payload.codeBody;
    },
    toggleRightPanel: state => {
      state.showRightPanel = !state.showRightPanel;
    },
    toggleCodeToolbar: state => {
      state.showCodeToolbar = !state.showCodeToolbar;
    },
  },
});

export const { disconnect, setUserData, setCodeBody, toggleRightPanel, toggleCodeToolbar } =
  sandboxSlice.actions;

export const selectConnectSlice = (state: RootState) => state.connect;

export const selectUserData = createSelector(
  [selectConnectSlice],
  connectSlice => connectSlice.userData
);

export const selectCodeBody = createSelector(
  [selectConnectSlice],
  connectSlice => connectSlice.codeBody
);

export const selectShowRightPanel = createSelector(
  [selectConnectSlice],
  connectSlice => connectSlice.showRightPanel
);

export const selectShowCodeToolbar = createSelector(
  [selectConnectSlice],
  connectSlice => connectSlice.showCodeToolbar
);
