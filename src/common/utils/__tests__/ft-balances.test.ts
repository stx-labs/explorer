import { FT_BALANCES_PAGE_SIZE, fetchAllFtBalances } from '../ft-balances';

const mkPage = (results: { token: string; balance: string }[], total: number) => ({
  results,
  total,
});

const mkRow = (token: string, balance: string) => ({ token, balance });

describe('fetchAllFtBalances', () => {
  it('returns empty record when total is 0', async () => {
    const fetchPage = jest.fn().mockResolvedValueOnce(mkPage([], 0));
    const out = await fetchAllFtBalances(fetchPage);
    expect(out).toEqual({});
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(0);
  });

  it('returns single page when total <= page size', async () => {
    const rows = [mkRow('a', '1'), mkRow('b', '2')];
    const fetchPage = jest.fn().mockResolvedValueOnce(mkPage(rows, rows.length));
    const out = await fetchAllFtBalances(fetchPage);
    expect(out).toEqual({
      a: { balance: '1', total_sent: '0', total_received: '0' },
      b: { balance: '2', total_sent: '0', total_received: '0' },
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('does not request page 2 when total === page size exactly', async () => {
    const rows = Array.from({ length: FT_BALANCES_PAGE_SIZE }, (_, i) => mkRow(`t${i}`, String(i)));
    const fetchPage = jest.fn().mockResolvedValueOnce(mkPage(rows, FT_BALANCES_PAGE_SIZE));
    const out = await fetchAllFtBalances(fetchPage);
    expect(Object.keys(out)).toHaveLength(FT_BALANCES_PAGE_SIZE);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('walks all pages for an exact multiple of page size', async () => {
    const total = FT_BALANCES_PAGE_SIZE * 2;
    const page1 = Array.from({ length: FT_BALANCES_PAGE_SIZE }, (_, i) =>
      mkRow(`a${i}`, String(i))
    );
    const page2 = Array.from({ length: FT_BALANCES_PAGE_SIZE }, (_, i) =>
      mkRow(`b${i}`, String(i + FT_BALANCES_PAGE_SIZE))
    );
    const fetchPage = jest
      .fn()
      .mockImplementation((offset: number) =>
        Promise.resolve(offset === 0 ? mkPage(page1, total) : mkPage(page2, total))
      );

    const out = await fetchAllFtBalances(fetchPage);
    expect(Object.keys(out)).toHaveLength(total);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0);
    expect(fetchPage).toHaveBeenNthCalledWith(2, FT_BALANCES_PAGE_SIZE);
  });

  it('walks a partial trailing page', async () => {
    const total = FT_BALANCES_PAGE_SIZE + 1;
    const page1 = [mkRow('only-page1', '1')];
    const page2 = [mkRow('only-page2', '2')];
    const fetchPage = jest
      .fn()
      .mockImplementation((offset: number) =>
        Promise.resolve(offset === 0 ? mkPage(page1, total) : mkPage(page2, total))
      );

    const out = await fetchAllFtBalances(fetchPage);
    expect(out['only-page1']).toBeDefined();
    expect(out['only-page2']).toBeDefined();
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('survives a failing non-first page and reports via onPageError', async () => {
    const total = FT_BALANCES_PAGE_SIZE * 2;
    const failure = new Error('boom');
    const fetchPage = jest.fn().mockImplementation((offset: number) => {
      if (offset === 0) return Promise.resolve(mkPage([mkRow('first', '1')], total));
      return Promise.reject(failure);
    });
    const onPageError = jest.fn();

    const out = await fetchAllFtBalances(fetchPage, { onPageError });

    expect(out).toEqual({ first: { balance: '1', total_sent: '0', total_received: '0' } });
    expect(onPageError).toHaveBeenCalledWith(failure, FT_BALANCES_PAGE_SIZE);
  });

  it('escalates a failing first page to the caller', async () => {
    const failure = new Error('first page boom');
    const fetchPage = jest.fn().mockRejectedValueOnce(failure);
    await expect(fetchAllFtBalances(fetchPage)).rejects.toBe(failure);
  });

  it('last write wins on duplicate token keys across pages', async () => {
    const total = FT_BALANCES_PAGE_SIZE + 1;
    const fetchPage = jest
      .fn()
      .mockImplementation((offset: number) =>
        Promise.resolve(
          offset === 0
            ? mkPage([mkRow('dup', 'first')], total)
            : mkPage([mkRow('dup', 'second')], total)
        )
      );

    const out = await fetchAllFtBalances(fetchPage);
    expect(out.dup.balance).toBe('second');
  });
});
