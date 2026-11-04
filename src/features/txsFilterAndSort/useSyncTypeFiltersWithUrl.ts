'use client';

import {
  FilterQueryKey,
  transactionTypeFilterMutator,
  useQueryUpdater,
} from '@/common/components/table/filters/table-filters-utils';
import { parseTransactionTypeParam } from '@/features/txs-list/utils';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useFilterAndSortState } from './useFilterAndSortState';

const sameTypes = (a: string[], b: string[]) =>
  a.length === b.length && a.every(type => b.includes(type));

/**
 * Keeps the page's type filter (route-scoped Redux state, set by the FilterButton) in the
 * `transactionType` URL param so filtered views can be shared and bookmarked. On mount a type list
 * in the URL wins over the remembered selection. Afterwards every selection change is written back
 * to the URL (shallow, no navigation), and the URL changing by navigation (e.g. a link to the same
 * page, or back/forward) replaces the selection: Next.js keeps the page mounted when only the query
 * string changes.
 *
 * Returns the selection to query with: the URL's types until Redux has taken them over, so the first
 * request is already the filtered one (and matches a server render made from the same URL).
 */
export function useSyncTypeFiltersWithUrl(): string[] {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get(FilterQueryKey.TransactionType);
  const { activeFilters, setActiveFilters } = useFilterAndSortState();
  const updateUrl = useQueryUpdater(transactionTypeFilterMutator);

  // The URL value last reconciled with Redux; undefined until the first sync on mount.
  const seenParam = useRef<string | null | undefined>(undefined);
  // The URL value this hook last wrote, so its own write isn't mistaken for a navigation.
  const writtenParam = useRef<string | null | undefined>(undefined);
  // Types taken from the URL that Redux hasn't caught up with yet; the URL isn't rewritten meanwhile.
  const adoptedTypes = useRef<string[] | undefined>(undefined);
  const latestUrlParam = useRef(urlParam);
  latestUrlParam.current = urlParam;

  useEffect(() => {
    const isMount = seenParam.current === undefined;
    seenParam.current = urlParam;
    if (!isMount && urlParam === writtenParam.current) {
      writtenParam.current = undefined;
      return;
    }
    // On mount a URL without types keeps the remembered selection; navigating to one clears it.
    const types = parseTransactionTypeParam(urlParam) ?? (isMount ? undefined : []);
    if (types && !sameTypes(types, activeFilters)) {
      adoptedTypes.current = types;
      setActiveFilters(types);
    }
    // Only URL changes should be adopted; the selection is written back by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParam]);

  useEffect(() => {
    if (adoptedTypes.current) {
      if (!sameTypes(adoptedTypes.current, activeFilters)) return;
      adoptedTypes.current = undefined;
    }
    const param = activeFilters.length > 0 ? activeFilters.join(',') : null;
    if (param === latestUrlParam.current) return;
    writtenParam.current = param;
    updateUrl(activeFilters.length > 0 ? activeFilters : undefined);
    // Only selection changes should sync; updateUrl changes identity on every URL write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);

  // A URL that hasn't been reconciled yet (first render, or a navigation) is what the page shows.
  if (urlParam !== seenParam.current) {
    const fromUrl = parseTransactionTypeParam(urlParam);
    if (fromUrl) return fromUrl;
    if (seenParam.current !== undefined && urlParam !== writtenParam.current) return [];
  }
  return activeFilters;
}
