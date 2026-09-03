/** @jest-environment node */
import { fetchTx } from '@/api/data-fetchers';
import { StacksApiResponseError } from '@/api/stacksAPIFetch';

import { buildContextPack } from '../server';

jest.mock('server-only', () => ({}));
jest.mock('@/api/data-fetchers', () => ({
  fetchContractInfo: jest.fn(),
  fetchTx: jest.fn(),
}));

const mockedFetchTx = jest.mocked(fetchTx);
const request = {
  txId: `0x${'1'.repeat(64)}`,
  apiUrl: 'https://api.hiro.so',
  network: 'mainnet',
  explorerBaseUrl: 'https://explorer.hiro.so',
};

describe('context-pack server errors', () => {
  beforeEach(() => jest.resetAllMocks());

  it.each([
    [404, 404],
    [401, 502],
    [500, 503],
  ])('maps upstream %i to route status %i', async (upstream, expected) => {
    mockedFetchTx.mockRejectedValue(
      new StacksApiResponseError('failed', upstream, 'upstream failure')
    );
    await expect(buildContextPack(request)).resolves.toMatchObject({ status: expected });
  });

  it('preserves rate-limit retry guidance', async () => {
    mockedFetchTx.mockRejectedValue(new StacksApiResponseError('failed', 429, 'limited', '45'));
    await expect(buildContextPack(request)).resolves.toMatchObject({
      status: 429,
      retryAfter: '45',
    });
  });

  it('treats a network failure as temporary unavailability, not a missing transaction', async () => {
    mockedFetchTx.mockRejectedValue(new TypeError('network failed'));
    await expect(buildContextPack(request)).resolves.toMatchObject({ status: 503 });
  });
});
