import { AddressBalanceResponse } from '@stacks/stacks-blockchain-api-types';

import packageJson from '../../../package.json';
import { RELEASE_TAG_NAME } from '../constants/env';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hiroProductHeaders(): Record<string, string> {
  return {
    'x-hiro-product': 'explorer',
    'x-hiro-version': RELEASE_TAG_NAME || packageJson.version,
  };
}

export function zeroAddressBalance(): AddressBalanceResponse {
  return {
    stx: {
      balance: '0',
      total_sent: '0',
      total_received: '0',
      total_fees_sent: '0',
      total_miner_rewards_received: '0',
      lock_tx_id: '',
      locked: '0',
      lock_height: 0,
      burnchain_lock_height: 0,
      burnchain_unlock_height: 0,
    },
    fungible_tokens: {},
    non_fungible_tokens: {},
  };
}

function isBalanceShape(v: unknown): v is AddressBalanceResponse {
  if (!v || typeof v !== 'object') return false;
  return 'stx' in v && typeof (v as AddressBalanceResponse).stx === 'object';
}

type StxV2BalanceJson = {
  balance?: string;
  total_miner_rewards_received?: string;
  lock_tx_id?: string;
  locked?: string;
  lock_height?: number;
  burnchain_lock_height?: number;
  burnchain_unlock_height?: number;
};

export function stxV2JsonToAddressBalance(json: StxV2BalanceJson): AddressBalanceResponse {
  return {
    stx: {
      balance: json.balance ?? '0',
      total_sent: '0',
      total_received: '0',
      total_fees_sent: '0',
      total_miner_rewards_received: json.total_miner_rewards_received ?? '0',
      lock_tx_id: json.lock_tx_id ?? '',
      locked: json.locked ?? '0',
      lock_height: json.lock_height ?? 0,
      burnchain_lock_height: json.burnchain_lock_height ?? 0,
      burnchain_unlock_height: json.burnchain_unlock_height ?? 0,
    },
    fungible_tokens: {},
    non_fungible_tokens: {},
  };
}

/**
 * Fast STX-only balance (v2). Prefer over deprecated v1 /balances which can 500 under load.
 */
export async function fetchStxBalanceV2(
  apiBaseUrl: string,
  principal: string
): Promise<AddressBalanceResponse | null> {
  if (!principal) return null;
  const url = `${stripTrailingSlash(apiBaseUrl)}/extended/v2/addresses/${encodeURIComponent(principal)}/balances/stx`;
  try {
    const res = await fetch(url, { headers: hiroProductHeaders(), cache: 'no-store' });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    if (!json || typeof json !== 'object') return null;
    return stxV2JsonToAddressBalance(json as StxV2BalanceJson);
  } catch {
    return null;
  }
}

/**
 * Parses batch POST payloads if Hiro (or another deployment) adds support.
 */
export function parseBatchBalancesResponse(
  data: unknown
): Record<string, AddressBalanceResponse> | null {
  if (!data || typeof data !== 'object') return null;
  const out: Record<string, AddressBalanceResponse> = {};
  const root = data as Record<string, unknown>;

  const nested = root.balances ?? root.results ?? root.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    for (const [addr, val] of Object.entries(nested as Record<string, unknown>)) {
      if (typeof addr === 'string' && isBalanceShape(val)) {
        out[addr] = val;
      }
    }
    if (Object.keys(out).length) return out;
  }

  if (Array.isArray(root.results)) {
    for (const item of root.results) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const addr = (row.address ?? row.principal) as string | undefined;
      const bal = (row.balance ?? row.balances ?? row) as unknown;
      if (addr && isBalanceShape(bal)) {
        out[addr] = bal;
      }
    }
    if (Object.keys(out).length) return out;
  }

  return null;
}

export async function tryPostBatchBalances(
  baseUrl: string,
  addresses: string[]
): Promise<Record<string, AddressBalanceResponse> | null> {
  const url = `${stripTrailingSlash(baseUrl)}/extended/v1/address/balances`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...hiroProductHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses }),
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    const json: unknown = await res.json();
    return parseBatchBalancesResponse(json);
  } catch {
    return null;
  }
}

/**
 * One logical fetch: try Hiro batch POST, then fill gaps with sequential v2 STX calls (avoids parallel v1 storms / 500s).
 * Every input address gets a concrete {@link AddressBalanceResponse} (zero balance on failure).
 */
export async function aggregateWatchlistBalances(
  addresses: string[],
  apiBaseUrl: string,
  options?: { delayBetweenV2Ms?: number }
): Promise<Record<string, AddressBalanceResponse>> {
  const delay = options?.delayBetweenV2Ms ?? 80;
  const unique = Array.from(new Set(addresses.filter(Boolean)));
  const out: Record<string, AddressBalanceResponse> = {};
  unique.forEach(a => {
    out[a] = zeroAddressBalance();
  });

  const batch = await tryPostBatchBalances(apiBaseUrl, unique);
  const needV2: string[] = [];

  for (const addr of unique) {
    const row = batch?.[addr];
    if (row && isBalanceShape(row)) {
      out[addr] = {
        ...row,
        fungible_tokens: row.fungible_tokens ?? {},
        non_fungible_tokens: row.non_fungible_tokens ?? {},
      };
    } else {
      needV2.push(addr);
    }
  }

  for (let i = 0; i < needV2.length; i++) {
    const addr = needV2[i];
    const v2 = await fetchStxBalanceV2(apiBaseUrl, addr);
    out[addr] = v2 ?? zeroAddressBalance();
    if (i < needV2.length - 1 && delay > 0) {
      await sleep(delay);
    }
  }

  return out;
}

/**
 * Browser entry: one POST to our API route (server aggregates). Falls back to client-side aggregation if the route fails.
 */
export async function fetchWatchlistBalancesForClient(
  addresses: string[],
  apiBaseUrl: string
): Promise<Record<string, AddressBalanceResponse>> {
  try {
    const res = await fetch('/api/watchlist/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses, apiBaseUrl }),
    });
    if (res.ok) {
      const json = (await res.json()) as { balances?: Record<string, AddressBalanceResponse> };
      if (json.balances && typeof json.balances === 'object') {
        return json.balances;
      }
    }
  } catch {
    /* use client-side aggregate */
  }
  return aggregateWatchlistBalances(addresses, apiBaseUrl);
}
