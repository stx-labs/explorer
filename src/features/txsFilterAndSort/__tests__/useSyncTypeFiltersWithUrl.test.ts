import { act, renderHook } from '@testing-library/react';

import { useFilterAndSortState } from '../useFilterAndSortState';
import { useSyncTypeFiltersWithUrl } from '../useSyncTypeFiltersWithUrl';

let mockSearch = '';
// Like the real shallow updater, a write replaces the URL the next render reads.
const mockUpdateUrl = jest.fn((types?: string[]) => {
  const params = new URLSearchParams(mockSearch);
  if (types) params.set('transactionType', types.join(','));
  else params.delete('transactionType');
  mockSearch = params.toString();
});

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
  rerender();
  // The URL already holds the selection, so it isn't rewritten.
  expect(mockUpdateUrl).not.toHaveBeenCalled();
});

test('normalizes a URL with unknown types once Redux holds the known ones', () => {
  mockSearch = 'transactionType=coinbase,bogus';
  mockFilters([]);
  const { rerender } = renderHook(() => useSyncTypeFiltersWithUrl());
  rerender();
  expect(mockUpdateUrl).toHaveBeenCalledWith(['coinbase']);
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
  expect(mockUpdateUrl).not.toHaveBeenCalled();

  act(() => setActiveFilters(['coinbase']));
  rerender();
  expect(mockUpdateUrl).toHaveBeenLastCalledWith(['coinbase']);

  act(() => setActiveFilters([]));
  rerender();
  expect(mockUpdateUrl).toHaveBeenLastCalledWith(undefined);
});

test("doesn't mistake its own URL write for a navigation", () => {
  const setActiveFilters = mockFilters([]);
  const { result, rerender } = renderHook(() => useSyncTypeFiltersWithUrl());

  act(() => setActiveFilters(['coinbase']));
  rerender(); // writes the URL
  rerender(); // reads the written URL back
  expect(setActiveFilters).toHaveBeenCalledTimes(1);
  expect(result.current).toEqual(['coinbase']);
});

test('takes over the types of a URL navigated to after mount', () => {
  mockSearch = 'transactionType=token_transfer';
  const setActiveFilters = mockFilters([]);
  const { result, rerender } = renderHook(() => useSyncTypeFiltersWithUrl());
  rerender();

  mockSearch = 'transactionType=coinbase';
  rerender();
  // The page queries with the new types right away, before Redux catches up.
  expect(result.current).toEqual(['coinbase']);
  expect(setActiveFilters).toHaveBeenLastCalledWith(['coinbase']);
  rerender();
  expect(result.current).toEqual(['coinbase']);
  expect(mockUpdateUrl).not.toHaveBeenCalled();
});

test('clears the selection when navigating to the page without the param', () => {
  mockSearch = 'transactionType=coinbase';
  const setActiveFilters = mockFilters([]);
  const { result, rerender } = renderHook(() => useSyncTypeFiltersWithUrl());
  rerender();

  mockSearch = '';
  rerender();
  expect(result.current).toEqual([]);
  expect(setActiveFilters).toHaveBeenLastCalledWith([]);
  rerender();
  expect(result.current).toEqual([]);
  expect(mockUpdateUrl).not.toHaveBeenCalled();
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
