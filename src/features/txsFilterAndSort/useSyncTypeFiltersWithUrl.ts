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
 * in the URL wins over the remembered selection; afterwards every selection change is written back
 * to the URL (shallow, no navigation).
 */
export function useSyncTypeFiltersWithUrl() {
  const searchParams = useSearchParams();
  const { activeFilters, setActiveFilters } = useFilterAndSortState();
  const updateUrl = useQueryUpdater(transactionTypeFilterMutator);
  const hasReadUrl = useRef(false);

  useEffect(() => {
    if (!hasReadUrl.current) {
      hasReadUrl.current = true;
      const fromUrl = parseTransactionTypeParam(searchParams.get(FilterQueryKey.TransactionType));
      if (fromUrl && !sameTypes(fromUrl, activeFilters)) {
        // The URL is written back on the next run, once Redux holds these types.
        setActiveFilters(fromUrl);
        return;
      }
    }
    updateUrl(activeFilters.length > 0 ? activeFilters : undefined);
    // Only selection changes should sync; searchParams/updateUrl change identity on every URL write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);
}
