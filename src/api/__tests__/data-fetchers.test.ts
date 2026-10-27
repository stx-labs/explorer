/** @jest-environment node */
import { stacksAPIFetch, stacksAPIFetchJson } from '@/api/stacksAPIFetch';

import { ApiError } from '../ApiError';
import { fetchFtSupply, fetchHolders, fetchTx, fetchTxEvents } from '../data-fetchers';

jest.mock('@/api/stacksAPIFetch', () => ({
  stacksAPIFetch: jest.fn(),
  stacksAPIFetchJson: jest.fn(),
}));

const fetchMock = stacksAPIFetch as jest.MockedFunction<typeof stacksAPIFetch>;
const fetchJsonMock = stacksAPIFetchJson as jest.MockedFunction<typeof stacksAPIFetchJson>;

const ASSET_ID = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token';
const ENCODED_ASSET_ID = encodeURIComponent(ASSET_ID);

beforeEach(() => jest.clearAllMocks());

test('fetchHolders reads the v3 FT holders endpoint', async () => {
  const page = { limit: 10, total: 0, cursor: {}, results: [] };
  fetchMock.mockResolvedValue(new Response(JSON.stringify(page)));

  await expect(fetchHolders('https://api.hiro.so', ASSET_ID, 10)).resolves.toEqual(page);
  expect(fetchMock.mock.calls[0][0]).toBe(
    `https://api.hiro.so/extended/v3/tokens/ft/${ENCODED_ASSET_ID}/holders?limit=10`
  );
});

test('fetchFtSupply reads the v3 FT supply endpoint', async () => {
  const supply = { asset_identifier: ASSET_ID, total: '5000' };
  fetchJsonMock.mockResolvedValue(supply);

  await expect(fetchFtSupply('https://api.hiro.so', ASSET_ID)).resolves.toEqual(supply);
  expect(fetchJsonMock.mock.calls[0][0]).toBe(
    `https://api.hiro.so/extended/v3/tokens/ft/${ENCODED_ASSET_ID}/supply`
  );
});

test('holders and supply fetchers skip invalid asset identifiers', async () => {
  await expect(fetchHolders('https://api.hiro.so', '', 10)).resolves.toBeUndefined();
  await expect(fetchFtSupply('https://api.hiro.so', '')).resolves.toBeUndefined();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(fetchJsonMock).not.toHaveBeenCalled();
});

const MINED_TX = { tx_id: '0x01', status: 'success', block: { height: 100 } };
const PENDING_TX = { tx_id: '0x01', status: 'pending', receipt_time: 1700000000 };

test('fetchTx reads the v3 transaction, requesting the given heavy fields', async () => {
  const tx = MINED_TX;
  fetchMock.mockResolvedValue(new Response(JSON.stringify(tx)));

  await expect(
    fetchTx('https://api.hiro.so', '0x01', {
      include: ['post_conditions', 'result'],
      redirect: 'error',
    })
  ).resolves.toEqual(tx);
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://api.hiro.so/extended/v3/transactions/0x01?include=post_conditions,result'
  );
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'error' });
  expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('include');
});

test('fetchTx omits the include parameter when no heavy fields are requested', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(MINED_TX)));

  await fetchTx('https://api.hiro.so', '0x01');
  expect(fetchMock.mock.calls[0][0]).toBe('https://api.hiro.so/extended/v3/transactions/0x01');
});

test('fetchTx throws an ApiError carrying the status when the API rejects the request', async () => {
  fetchMock.mockResolvedValue(new Response('{}', { status: 404, statusText: 'Not Found' }));

  const error = await fetchTx('https://api.hiro.so', '0x01').catch(e => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 404, endpoint: '/extended/v3/transactions/{tx_id}' });
});

test('fetchTxEvents reads the first page of v3 transaction events', async () => {
  const page = { total: 3, limit: 100, cursor: {}, results: [] };
  fetchJsonMock.mockResolvedValue(page);

  await expect(fetchTxEvents('https://api.hiro.so', '0x01', 100)).resolves.toEqual(page);
  expect(fetchJsonMock.mock.calls[0][0]).toBe(
    'https://api.hiro.so/extended/v3/transactions/0x01/events?limit=100'
  );
});

test('fetchTx serves a mined transaction from the data cache', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(MINED_TX)));

  await expect(fetchTx('https://api.hiro.so', '0x01')).resolves.toEqual(MINED_TX);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({
    cache: 'default',
    next: { revalidate: 3, tags: ['tx-id-0x01'] },
  });
});

test('fetchTx re-reads a cached pending transaction without the cache', async () => {
  fetchMock
    .mockResolvedValueOnce(new Response(JSON.stringify(PENDING_TX)))
    .mockResolvedValueOnce(new Response(JSON.stringify(MINED_TX)));

  await expect(
    fetchTx('https://api.hiro.so', '0x01', { include: ['result'], redirect: 'error' })
  ).resolves.toEqual(MINED_TX);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][0]).toBe(
    'https://api.hiro.so/extended/v3/transactions/0x01?include=result'
  );
  expect(fetchMock.mock.calls[1][1]).toEqual({ redirect: 'error', cache: 'no-store' });
});

test('fetchTx surfaces a failed uncached re-read as an ApiError', async () => {
  fetchMock
    .mockResolvedValueOnce(new Response(JSON.stringify(PENDING_TX)))
    .mockResolvedValueOnce(new Response('{}', { status: 404, statusText: 'Not Found' }));

  const error = await fetchTx('https://api.hiro.so', '0x01').catch(e => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 404, endpoint: '/extended/v3/transactions/{tx_id}' });
});
