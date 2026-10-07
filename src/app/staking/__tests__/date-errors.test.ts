import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { logError } from '@/common/utils/error-utils';

import { fetchBurnBlockTimes } from '../data';

jest.mock('@/api/stacksAPIFetch');
jest.mock('@/common/utils/error-utils', () => ({
  ...jest.requireActual('@/common/utils/error-utils'),
  logError: jest.fn(),
}));

test('reports date lookup failures once, preserves successes, and ignores expected missing blocks', async () => {
  jest
    .mocked(stacksAPIFetch)
    .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
    .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ ok: true, json: async () => ({ burn_block_time: 123 }) } as Response);
  await expect(fetchBurnBlockTimes([100, 200, 300, 400], 500, 'mainnet')).resolves.toEqual({
    400: 123000,
  });
  expect(logError).toHaveBeenCalledTimes(1);
  expect(logError).toHaveBeenCalledWith(
    expect.any(Error),
    'Staking burn block dates: partial fetch failure',
    { chain: 'mainnet', failureCount: 2 }
  );
});
