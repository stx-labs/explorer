import { InfiniteData, UseSuspenseInfiniteQueryResult } from '@tanstack/react-query';
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
