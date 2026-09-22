import { fetchDailyPrices } from '../prices';

jest.mock('@/common/constants/env', () => ({ LUNAR_CRUSH_API_KEY: 'test-key' }));

afterEach(() => jest.restoreAllMocks());

test('reuses daily price URLs throughout the same UTC date range with full padding', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ data: [{ time: Date.UTC(2026, 8, 1) / 1000, close: 10 }] }),
  } as Response);
  const start = Date.UTC(2026, 8, 1);
  const end = Date.UTC(2026, 8, 10);
  const first = await fetchDailyPrices(start, end);
  const later = await fetchDailyPrices(start + 86_399_999, end + 86_399_999);

  expect(later).toEqual(first);
  expect(first.btc.get('2026-09-01')).toBe(10);
  expect(first.stx.get('2026-09-01')).toBe(10);
  for (const index of [0, 1]) {
    const [url, options] = fetchMock.mock.calls[index];
    expect(url).toBe(fetchMock.mock.calls[index + 2][0]);
    const params = new URL(String(url)).searchParams;
    expect(Number(params.get('start'))).toBe(Date.UTC(2026, 7, 31) / 1000);
    expect(Number(params.get('end'))).toBe(Date.UTC(2026, 8, 12) / 1000);
    expect(options?.next?.revalidate).toBe(3600);
  }
});

test('advances daily price bounds when the UTC date changes', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ data: [] }),
  } as Response);
  await fetchDailyPrices(Date.UTC(2026, 8, 1, 23, 59, 59), Date.UTC(2026, 8, 10, 23, 59, 59));
  await fetchDailyPrices(Date.UTC(2026, 8, 2), Date.UTC(2026, 8, 11));

  const before = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
  const after = new URL(String(fetchMock.mock.calls[2][0])).searchParams;
  expect(Number(after.get('start')) - Number(before.get('start'))).toBe(86400);
  expect(Number(after.get('end')) - Number(before.get('end'))).toBe(86400);
});
