import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { TEN_MINUTES } from '../../../common/queries/query-stale-time';
import { buildSignerKeyToManagersMap, computeStakerCounts, dedupeStakers } from '../utils';

const STAKING_SIGNERS_QUERY_KEY = 'staking-signers';
const STAKING_SIGNER_STAKERS_QUERY_KEY = 'staking-signer-stakers';

export interface StakingSigner {
  signer: string;
  signer_key: string;
}

export type StakingType = 'stx' | 'btc';

export interface StakingSignerStaker {
  staker: string;
  types: StakingType[];
}

export interface SignerStakersPage {
  stakers: StakingSignerStaker[];
  // The API's exact total, which can exceed stakers.length if paging was capped
  total: number;
}

interface CursorPaginatedResponse<T> {
  total: number;
  limit: number;
  cursor: { next: string | null; previous: string | null; current: string | null };
  results: T[];
}

// Caps paging so a misbehaving API can't loop forever
const MAX_CURSOR_PAGES = 20;

async function fetchAllCursorPages<T>(
  endpoint: string,
  limit: number,
  signal?: AbortSignal
): Promise<{ results: T[]; total: number }> {
  const results: T[] = [];
  let total = 0;
  let cursor: string | null = null;
  for (let page = 0; page < MAX_CURSOR_PAGES; page++) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) {
      params.set('cursor', cursor);
    }
    const response = await fetch(`${endpoint}?${params}`, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${new URL(endpoint).pathname}: ${response.status}`);
    }
    const data: CursorPaginatedResponse<T> = await response.json();
    if (!Array.isArray(data?.results)) {
      throw new Error(`Unexpected response shape from ${new URL(endpoint).pathname}`);
    }
    results.push(...data.results);
    total = data.total;
    if (!data.cursor?.next) break;
    cursor = data.cursor.next;
  }
  return { results, total };
}

export function useStakingSigners(enabled: boolean) {
  const { url: activeNetworkUrl } = useGlobalContext().activeNetwork;

  return useQuery<StakingSigner[]>({
    queryKey: [STAKING_SIGNERS_QUERY_KEY, activeNetworkUrl],
    queryFn: ({ signal }) =>
      fetchAllCursorPages<StakingSigner>(
        `${activeNetworkUrl}/extended/v3/staking/signers`,
        100,
        signal
      ).then(({ results }) => results),
    staleTime: TEN_MINUTES,
    enabled,
  });
}

export function useStakingSignerStakers(signerManagers: string[]) {
  const { url: activeNetworkUrl } = useGlobalContext().activeNetwork;

  return useQueries({
    queries: signerManagers.map(manager => ({
      queryKey: [STAKING_SIGNER_STAKERS_QUERY_KEY, activeNetworkUrl, manager],
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        fetchAllCursorPages<StakingSignerStaker>(
          `${activeNetworkUrl}/extended/v3/staking/signers/${encodeURIComponent(manager)}/stakers`,
          200,
          signal
        ).then(({ results, total }): SignerStakersPage => ({ stakers: results, total })),
      staleTime: TEN_MINUTES,
    })),
    combine: results => {
      // Prototype-less object because keys are API-controlled principals
      const byManager: Record<string, SignerStakersPage> = Object.create(null);
      results.forEach((result, index) => {
        if (result.data) {
          byManager[signerManagers[index]] = result.data;
        }
      });
      return { byManager, isError: results.some(result => result.isError) };
    },
  });
}

export function useStakingSignerStakersForKey(signerKey: string, enabled: boolean) {
  const { data: stakingSigners, isError: isSignersError } = useStakingSigners(enabled);
  const signerManagers = useMemo(
    () => buildSignerKeyToManagersMap(stakingSigners ?? [])[signerKey.toLowerCase()] ?? [],
    [stakingSigners, signerKey]
  );
  const { byManager, isError: isStakersError } = useStakingSignerStakers(signerManagers);

  const loadedPages = useMemo(
    () => signerManagers.map(manager => byManager[manager]).filter(Boolean),
    [signerManagers, byManager]
  );
  const stakers = useMemo(
    () => dedupeStakers(loadedPages.flatMap(page => page.stakers)),
    [loadedPages]
  );
  const counts = useMemo(() => computeStakerCounts(loadedPages), [loadedPages]);

  return {
    signerManagers,
    stakers,
    counts,
    isLoaded: !!stakingSigners && loadedPages.length === signerManagers.length,
    isError: isSignersError || isStakersError,
  };
}
