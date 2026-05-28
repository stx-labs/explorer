import { CursorResponseType, getNextCursorPageParam } from '../useCursorInfiniteQueryResult';

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
