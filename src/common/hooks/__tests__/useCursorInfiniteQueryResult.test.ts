import { Query } from '@tanstack/react-query';

import {
  CursorResponseType,
  getNextCursorPageParam,
  throwOnFirstPageError,
} from '../useCursorInfiniteQueryResult';

const page = (next: string | null): CursorResponseType<unknown> => ({
  limit: 20,
  total: 100,
  cursor: { next, previous: null, current: '1:0:0' },
  results: [],
});

describe('getNextCursorPageParam', () => {
  it('returns the next cursor when present', () => {
    expect(getNextCursorPageParam(page('8114328:2147483647:0'))).toBe('8114328:2147483647:0');
  });

  it('returns undefined at the end of the list (null next cursor)', () => {
    expect(getNextCursorPageParam(page(null))).toBeUndefined();
  });

  it('returns undefined when there is no page', () => {
    expect(getNextCursorPageParam(undefined)).toBeUndefined();
  });
});

describe('throwOnFirstPageError', () => {
  const queryWithData = (data: unknown) => ({ state: { data } }) as unknown as Query;

  it('throws when the first page failed (nothing loaded yet)', () => {
    expect(throwOnFirstPageError(new Error('boom'), queryWithData(undefined))).toBe(true);
  });

  it('keeps loaded rows when a later page or refetch failed', () => {
    const data = { pages: [page('1:0:0')], pageParams: [undefined] };
    expect(throwOnFirstPageError(new Error('boom'), queryWithData(data))).toBe(false);
  });
});
