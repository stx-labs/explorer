import { InfiniteData, UseSuspenseInfiniteQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Minimal shape of a v3 cursor-paginated response. The v3 list endpoints
 * (`/extended/v3/transactions`, `/extended/v3/mempool/transactions`,
 * `/extended/v3/blocks/{height_or_hash}/transactions`,
 * `/extended/v3/principals/{principal}/transactions`) return this envelope and
 * accept only `limit` + `cursor` as query params.
 */
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

/** `getNextPageParam` for v3 cursor pagination. `undefined` stops fetching. */
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
