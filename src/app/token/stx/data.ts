import { stacksAPIFetch } from '@/api/stacksAPIFetch';

import { FungibleTokenHolderList } from '@stacks/stacks-blockchain-api-types';

import { STX_ASSET_ID } from './consts';

export interface StxSupplyResponse {
  unlocked_percent: string;
  total_stx: string;
  total_stx_year_2050: string;
  unlocked_stx: string;
  block_height: number;
}

export async function fetchStxSupply(apiUrl: string): Promise<StxSupplyResponse | undefined> {
  const response = await stacksAPIFetch(`${apiUrl}/extended/v1/stx_supply`);
  return response.json();
}

export async function fetchStxHolders(
  apiUrl: string,
  limit = 10,
  offset = 0
): Promise<FungibleTokenHolderList | undefined> {
  const response = await stacksAPIFetch(
    `${apiUrl}/extended/v1/tokens/ft/${STX_ASSET_ID}/holders?limit=${limit}&offset=${offset}`
  );
  return response.json();
}
