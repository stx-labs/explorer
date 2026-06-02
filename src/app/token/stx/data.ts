import { stacksAPIFetchJson } from '@/api/stacksAPIFetch';

import { FungibleTokenHolderList } from '@stacks/stacks-blockchain-api-types';

import { STX_ASSET_ID } from './consts';

const STX_SUPPLY_REVALIDATION_SECONDS = 60;
const STX_HOLDERS_REVALIDATION_SECONDS = 60;

export interface StxSupplyResponse {
  unlocked_percent: string;
  total_stx: string;
  total_stx_year_2050: string;
  unlocked_stx: string;
  block_height: number;
}

export async function fetchStxSupply(apiUrl: string): Promise<StxSupplyResponse> {
  return stacksAPIFetchJson<StxSupplyResponse>(
    `${apiUrl}/extended/v1/stx_supply`,
    { cache: 'default', next: { revalidate: STX_SUPPLY_REVALIDATION_SECONDS } },
    'Failed to fetch STX supply'
  );
}

export async function fetchStxHolders(
  apiUrl: string,
  limit = 10,
  offset = 0
): Promise<FungibleTokenHolderList> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return stacksAPIFetchJson<FungibleTokenHolderList>(
    `${apiUrl}/extended/v1/tokens/ft/${STX_ASSET_ID}/holders?${params.toString()}`,
    { cache: 'default', next: { revalidate: STX_HOLDERS_REVALIDATION_SECONDS } },
    'Failed to fetch STX holders'
  );
}
