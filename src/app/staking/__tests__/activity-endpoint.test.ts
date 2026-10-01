/** @jest-environment node */
import { GET } from '@/app/api/staking/activity/route';
import { logError } from '@/common/utils/error-utils';

import * as data from '../data';

jest.mock('../data', () => ({
  fetchPoxInfo: jest.fn(),
  fetchStakingActivity: jest.fn(),
  fetchBondRewards: jest.fn(),
  fetchCycleRewards: jest.fn(),
  fetchBurnBlockTimes: jest.fn(),
}));
jest.mock('@/common/utils/error-utils', () => ({
  ...jest.requireActual('@/common/utils/error-utils'),
  logError: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(data.fetchPoxInfo).mockResolvedValue({ contract_id: 'ST123.pox-5' } as never);
  jest.mocked(data.fetchStakingActivity).mockResolvedValue({ events: [], incomplete: false });
});

test('activity endpoint preserves network/filter settings and only loads the bounded feed', async () => {
  const request = new Request(
    'http://localhost/api/staking/activity?chain=testnet&api=https%3A%2F%2Fapi.testnet.hiro.so&activity=enrollments&limit=999'
  );
  const response = await GET(request);
  expect(data.fetchPoxInfo).toHaveBeenCalledWith(
    'testnet',
    'https://api.testnet.hiro.so',
    request.signal
  );
  expect(data.fetchStakingActivity).toHaveBeenCalledWith(
    'ST123.pox-5',
    'testnet',
    'https://api.testnet.hiro.so',
    5,
    'enrollments',
    undefined,
    request.signal
  );
  expect(data.fetchBondRewards).not.toHaveBeenCalled();
  expect(data.fetchCycleRewards).not.toHaveBeenCalled();
  expect(data.fetchBurnBlockTimes).not.toHaveBeenCalled();
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ events: [], incomplete: false });
});

test('invalid filters use the mainnet all-events feed by default', async () => {
  const request = new Request('http://localhost/api/staking/activity?activity=invalid');
  await GET(request);
  expect(data.fetchStakingActivity).toHaveBeenCalledWith(
    'ST123.pox-5',
    'mainnet',
    'https://api.hiro.so',
    5,
    undefined,
    undefined,
    request.signal
  );
});

test('an already cancelled request does no upstream work or error reporting', async () => {
  const controller = new AbortController();
  controller.abort();
  const response = await GET(
    new Request('http://localhost/api/staking/activity', { signal: controller.signal })
  );
  expect(response.status).toBe(499);
  expect(data.fetchPoxInfo).not.toHaveBeenCalled();
  expect(data.fetchStakingActivity).not.toHaveBeenCalled();
  expect(logError).not.toHaveBeenCalled();
});

test('cancellation during PoX loading does not start an activity scan or report a failure', async () => {
  const controller = new AbortController();
  jest.mocked(data.fetchPoxInfo).mockImplementationOnce(async (_chain, _api, signal) => {
    controller.abort();
    if (signal?.aborted) throw signal.reason;
    throw new Error('Expected cancellation');
  });
  const response = await GET(
    new Request('http://localhost/api/staking/activity', { signal: controller.signal })
  );
  expect(response.status).toBe(499);
  expect(data.fetchStakingActivity).not.toHaveBeenCalled();
  expect(logError).not.toHaveBeenCalled();
});

test.each(['pox', 'activity'])(
  'failed %s requests return an explicit incomplete feed',
  async failure => {
    if (failure === 'pox')
      jest.mocked(data.fetchPoxInfo).mockRejectedValue(new Error('unavailable'));
    else jest.mocked(data.fetchStakingActivity).mockRejectedValue(new Error('unavailable'));
    const response = await GET(new Request('http://localhost/api/staking/activity'));
    expect(await response.json()).toEqual({ events: [], incomplete: true });
    if (failure === 'pox') expect(data.fetchStakingActivity).not.toHaveBeenCalled();
  }
);

test.each(['chain=devnet', 'chain=devnet&api=https%3A%2F%2Fapi.hiro.so'])(
  'rejects unsupported chains before upstream loading: %s',
  async query => {
    const response = await GET(new Request(`http://localhost/api/staking/activity?${query}`));
    expect(response.status).toBe(400);
    expect(data.fetchPoxInfo).not.toHaveBeenCalled();
    expect(data.fetchStakingActivity).not.toHaveBeenCalled();
  }
);

test.each(['https://attacker.example', 'http://localhost:3999', 'https://169.254.169.254'])(
  'rejects API override %s before any upstream call',
  async api => {
    const response = await GET(
      new Request(`http://localhost/api/staking/activity?api=${encodeURIComponent(api)}`)
    );
    expect(response.status).toBe(400);
    expect(data.fetchPoxInfo).not.toHaveBeenCalled();
    expect(data.fetchStakingActivity).not.toHaveBeenCalled();
  }
);
