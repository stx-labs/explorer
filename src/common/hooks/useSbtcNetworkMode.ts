'use client';

import { getSbtcNetworkMode } from '@/app/token/[tokenId]/consts';

import { useGlobalContext } from '../context/useGlobalContext';

export function useSbtcNetworkMode() {
  return getSbtcNetworkMode(useGlobalContext().activeNetwork);
}
