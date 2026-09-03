/** @jest-environment node */
import { fetchContractInfo, fetchTx } from '@/api/data-fetchers';
import { StacksApiResponseError } from '@/api/stacksAPIFetch';

import { buildContextPack } from '../server';

jest.mock('server-only', () => ({}));
jest.mock('@/api/data-fetchers', () => ({
  fetchContractInfo: jest.fn(),
  fetchTx: jest.fn(),
}));

const mockedFetchTx = jest.mocked(fetchTx);
const mockedFetchContractInfo = jest.mocked(fetchContractInfo);
const request = {
  txId: `0x${'1'.repeat(64)}`,
  apiUrl: 'https://api.hiro.so',
  network: 'mainnet',
  explorerBaseUrl: 'https://explorer.hiro.so',
};
const failedCall = {
  tx_id: request.txId,
  tx_type: 'contract_call',
  tx_status: 'abort_by_response',
  tx_result: { hex: '0x', repr: '(err u1)' },
  sender_address: 'SP000000000000000000002Q6VF78',
  post_condition_mode: 'deny',
  post_conditions: [],
  block_height: 1,
  contract_call: {
    contract_id: 'SP000000000000000000002Q6VF78.demo',
    function_name: 'mint',
    function_signature: '(define-public (mint))',
    function_args: [],
  },
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

describe('context-pack conditional requests', () => {
  beforeEach(() => jest.resetAllMocks());
  const etag = 'W/"validator"';

  it('answers a matching validator once the transaction is a failed contract call, before fetching any contract', async () => {
    mockedFetchTx.mockResolvedValue(failedCall as never);
    await expect(buildContextPack({ ...request, etag, ifNoneMatch: etag })).resolves.toEqual({
      status: 304,
    });
    expect(mockedFetchTx).toHaveBeenCalledTimes(1);
    expect(mockedFetchContractInfo).not.toHaveBeenCalled();
  });

  it('builds the pack when the validator does not match', async () => {
    mockedFetchTx.mockResolvedValue(failedCall as never);
    mockedFetchContractInfo.mockResolvedValue(undefined as never);
    await expect(
      buildContextPack({ ...request, etag, ifNoneMatch: 'W/"stale"' })
    ).resolves.toMatchObject({ status: 200 });
    expect(mockedFetchContractInfo).toHaveBeenCalled();
  });

  it('never turns a transaction without a pack into a 304', async () => {
    mockedFetchTx.mockResolvedValue({ ...failedCall, tx_status: 'success' } as never);
    await expect(buildContextPack({ ...request, etag, ifNoneMatch: etag })).resolves.toMatchObject({
      status: 404,
    });
    mockedFetchTx.mockRejectedValue(new StacksApiResponseError('failed', 404, 'not found'));
    await expect(buildContextPack({ ...request, etag, ifNoneMatch: etag })).resolves.toMatchObject({
      status: 404,
    });
  });
});
