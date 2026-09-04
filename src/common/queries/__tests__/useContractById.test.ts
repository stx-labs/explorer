import { QueryClient } from '@tanstack/react-query';

import { getContractByIdQueryKey, getContractByIdQueryOptions } from '../useContractById';

const CONTRACT_ID = 'SP000000000000000000002Q6VF78.example';
const API_URL = 'https://api.hiro.so';

function apiClientWith(contract: Record<string, unknown>) {
  return {
    GET: jest.fn().mockResolvedValue({
      data: contract,
      error: undefined,
      response: new Response(null, { status: 200 }),
    }),
  };
}

describe('contract-by-id query options', () => {
  it('keys contract data by contract id and active API URL', () => {
    expect(getContractByIdQueryKey(CONTRACT_ID, API_URL)).toEqual([
      'contractById',
      CONTRACT_ID,
      API_URL,
    ]);
  });

  it('parses valid ABI JSON and degrades malformed ABI data', async () => {
    const validClient = apiClientWith({ source_code: '(ok true)', abi: '{"functions":[]}' });
    const malformedClient = apiClientWith({ source_code: '(ok true)', abi: '{not-json' });
    const validCache = new QueryClient();
    const malformedCache = new QueryClient();

    const valid = await validCache.fetchQuery(
      getContractByIdQueryOptions(validClient as never, CONTRACT_ID, API_URL)
    );
    const malformed = await malformedCache.fetchQuery(
      getContractByIdQueryOptions(malformedClient as never, CONTRACT_ID, API_URL)
    );

    expect(valid.abi).toEqual({ functions: [] });
    expect(malformed.abi).toBeUndefined();
  });

  it('reuses the same fresh cache entry for callee and page queries', async () => {
    const apiClient = apiClientWith({ source_code: '(ok true)', abi: null });
    const queryClient = new QueryClient();
    const options = getContractByIdQueryOptions(apiClient as never, CONTRACT_ID, API_URL);

    await queryClient.fetchQuery(options);
    await queryClient.fetchQuery(options);

    expect(apiClient.GET).toHaveBeenCalledTimes(1);
  });
});
