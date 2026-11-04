'use client';

import {
  FilterQueryKey,
  transactionTypeFilterMutator,
  useQueryUpdater,
} from '@/common/components/table/filters/table-filters-utils';
import { parseTransactionTypeParam } from '@/features/txs-list/utils';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useFilterAndSortState } from './useFilterAndSortState';

const sameTypes = (a: string[], b: string[]) =>
  a.length === b.length && a.every(type => b.includes(type));

/**
 * Keeps the page's type filter (route-scoped Redux state, set by the FilterButton) in the
 * `transactionType` URL param so filtered views can be shared and bookmarked. On mount a type list
 * in the URL wins over the remembered selection; afterwards every selection change is written back
 * to the URL (shallow, no navigation).
 *
 * Returns the selection to query with: the URL's types until Redux has taken them over, so the first
 * request is already the filtered one (and matches a server render made from the same URL).
 */
export function useSyncTypeFiltersWithUrl(): string[] {
  const searchParams = useSearchParams();
  const { activeFilters, setActiveFilters } = useFilterAndSortState();
  const updateUrl = useQueryUpdater(transactionTypeFilterMutator);
  const [fromUrl] = useState(() =>
    parseTransactionTypeParam(searchParams.get(FilterQueryKey.TransactionType))
  );
  const hasReadUrl = useRef(false);
  const isUrlApplied = useRef(!fromUrl);

  useEffect(() => {
    if (!hasReadUrl.current) {
      hasReadUrl.current = true;
      if (fromUrl && !sameTypes(fromUrl, activeFilters)) {
        // The URL is written back on the next run, once Redux holds these types.
        setActiveFilters(fromUrl);
        return;
      }
    }
    isUrlApplied.current = true;
    updateUrl(activeFilters.length > 0 ? activeFilters : undefined);
    // Only selection changes should sync; searchParams/updateUrl change identity on every URL write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);

  return !isUrlApplied.current && fromUrl ? fromUrl : activeFilters;
}
