import { InfiniteData, Query, UseSuspenseInfiniteQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface CursorResponseType<T> {
  limit: number;
  total: number;
  cursor: {
    next: string | null;
    previous: string | null;
    current: string | null;
  };
  results: T[];
}

export function getNextCursorPageParam<T>(lastPage?: CursorResponseType<T>): string | undefined {
  return lastPage?.cursor?.next ?? undefined;
}

/**
 * `throwOnError` for cursor-paginated tables: a failed first page is handed to the nearest error
 * boundary (an error + retry instead of an empty "No results found" table), while a failed
 * "Load more" or background refetch keeps the rows already loaded.
 */
export function throwOnFirstPageError(_error: unknown, query: Query<any, any, any, any>): boolean {
  return query.state.data === undefined;
}

export function useSuspenseCursorInfiniteQueryResult<T>(
  response: UseSuspenseInfiniteQueryResult<InfiniteData<CursorResponseType<T>>>,
  limit?: number
) {
  return useMemo(
    () =>
      response.data?.pages
        .map(page => page.results)
        .flat()
        .slice(0, limit) || [],
    [limit, response.data?.pages]
  );
}
