import { stacksAPIFetch } from '@/api/stacksAPIFetch';

import { fetchBondRegistrations, fetchBondsPage, fetchPoxInfo } from '../data';

jest.mock('@/api/stacksAPIFetch');
const fetchMock = stacksAPIFetch as jest.MockedFunction<typeof stacksAPIFetch>;

function respond(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

beforeEach(() => fetchMock.mockReset());

test('returns and forwards the opaque next bond cursor', async () => {
  fetchMock
    .mockResolvedValueOnce(
      respond({ results: [{ index: 2 }], total: 2, cursor: { next: '1:next' } })
    )
    .mockResolvedValueOnce(respond({ results: [{ index: 1 }], total: 2, cursor: { next: null } }));
  const page = await fetchBondsPage('mainnet');
  expect(page.nextCursor).toBe('1:next');
  const last = await fetchBondsPage('mainnet', undefined, 50, page.nextCursor!);
  expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('cursor')).toBe('1:next');
  expect(last.nextCursor).toBeNull();
});

test('rejects PoX data without a current cycle so the page can use its unavailable state', async () => {
  fetchMock.mockResolvedValue(respond({ contract_id: 'SP000000000000000000002Q6VF78.pox-5' }));
  await expect(fetchPoxInfo('mainnet')).rejects.toThrow('missing the current cycle');
});

test('includes every registration using the returned opaque cursor', async () => {
  fetchMock
    .mockResolvedValueOnce(
      respond({
        results: [{ staker: 'first', balances: { btc: '100', stx: '200' } }],
        cursor: { next: '123:0:4' },
      })
    )
    .mockResolvedValueOnce(
      respond({
        results: [{ staker: 'second', balances: { btc: '300', stx: '400' } }],
        cursor: { next: null },
      })
    );

  const registrations = await fetchBondRegistrations(1, 'mainnet');

  expect(registrations.map(row => row.staker)).toEqual(['first', 'second']);
  expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('cursor')).toBe('123:0:4');
});

test('does not return a partial enrollment total when a later page fails', async () => {
  fetchMock
    .mockResolvedValueOnce(
      respond({
        results: [{ staker: 'first', balances: { btc: '100', stx: '200' } }],
        cursor: { next: '123:0:4' },
      })
    )
    .mockResolvedValueOnce({ ok: false, status: 503 } as Response);

  await expect(fetchBondRegistrations(1, 'mainnet')).rejects.toThrow('503');
});

test.each([
  null,
  { cursor: { next: null } },
  { results: {}, cursor: { next: null } },
  { results: [] },
  { results: [], cursor: {} },
  { results: [], cursor: { next: 123 } },
])('rejects a malformed later registration page: %j', async page => {
  fetchMock
    .mockResolvedValueOnce(
      respond({
        results: [{ staker: 'first', balances: { btc: '100', stx: '200' } }],
        cursor: { next: '123:0:4' },
      })
    )
    .mockResolvedValueOnce(respond(page));

  await expect(fetchBondRegistrations(1, 'mainnet')).rejects.toThrow(
    'Invalid registrations page for bond 1'
  );
});

test('accepts a complete empty registration page', async () => {
  fetchMock.mockResolvedValue(respond({ results: [], cursor: { next: null } }));
  await expect(fetchBondRegistrations(1, 'mainnet')).resolves.toEqual([]);
});
