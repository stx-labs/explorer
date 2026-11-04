import { act, renderHook } from '@testing-library/react';

import { useFilterAndSortState } from '../useFilterAndSortState';
import { useSyncTypeFiltersWithUrl } from '../useSyncTypeFiltersWithUrl';

let mockSearch = '';
const mockUpdateUrl = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
jest.mock('@/common/components/table/filters/table-filters-utils', () => ({
  ...jest.requireActual('@/common/components/table/filters/table-filters-utils'),
  useQueryUpdater: () => mockUpdateUrl,
}));
jest.mock('../useFilterAndSortState', () => ({ useFilterAndSortState: jest.fn() }));

const mockFilterState = useFilterAndSortState as jest.MockedFunction<typeof useFilterAndSortState>;

// A tiny stand-in for the Redux slice: setActiveFilters updates what the next render reads.
function mockFilters(initial: string[]) {
  let activeFilters = initial;
  const setActiveFilters = jest.fn((filters: string[]) => {
    activeFilters = filters;
  });
  mockFilterState.mockImplementation(
    () =>
      ({ activeFilters, setActiveFilters }) as unknown as ReturnType<typeof useFilterAndSortState>
  );
  return setActiveFilters;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = '';
});

test('applies the transactionType URL param to the filters on mount', () => {
  mockSearch = 'transactionType=coinbase,token_transfer';
  const setActiveFilters = mockFilters([]);
  const { rerender } = renderHook(() => useSyncTypeFiltersWithUrl());

  expect(setActiveFilters).toHaveBeenCalledWith(['coinbase', 'token_transfer']);
  expect(mockUpdateUrl).not.toHaveBeenCalled();

  rerender();
  expect(mockUpdateUrl).toHaveBeenLastCalledWith(['coinbase', 'token_transfer']);
});

test('writes the remembered selection to the URL when the URL has none', () => {
  const setActiveFilters = mockFilters(['contract_call']);
  renderHook(() => useSyncTypeFiltersWithUrl());

  expect(setActiveFilters).not.toHaveBeenCalled();
  expect(mockUpdateUrl).toHaveBeenCalledWith(['contract_call']);
});

test('writes later selection changes to the URL and clears the param when emptied', () => {
  const setActiveFilters = mockFilters([]);
  const { rerender } = renderHook(() => useSyncTypeFiltersWithUrl());
  expect(mockUpdateUrl).toHaveBeenLastCalledWith(undefined);

  act(() => setActiveFilters(['coinbase']));
  rerender();
  expect(mockUpdateUrl).toHaveBeenLastCalledWith(['coinbase']);

  act(() => setActiveFilters([]));
  rerender();
  expect(mockUpdateUrl).toHaveBeenLastCalledWith(undefined);
});

test('returns the URL types until Redux holds them, so the first query is already filtered', () => {
  mockSearch = 'transactionType=coinbase';
  const setActiveFilters = mockFilters(['contract_call']);
  const { result, rerender } = renderHook(() => useSyncTypeFiltersWithUrl());

  // The first render precedes the effect that copies the URL into Redux.
  expect(result.current).toEqual(['coinbase']);
  rerender();
  expect(result.current).toEqual(['coinbase']);

  act(() => setActiveFilters(['token_transfer']));
  rerender();
  expect(result.current).toEqual(['token_transfer']);
});

test('returns the remembered selection when the URL has none', () => {
  mockFilters(['contract_call']);
  const { result } = renderHook(() => useSyncTypeFiltersWithUrl());
  expect(result.current).toEqual(['contract_call']);
});
