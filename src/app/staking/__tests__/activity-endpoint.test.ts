/** @jest-environment node */
import { GET } from '@/app/api/staking/activity/route';

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
  const response = await GET(
    new Request(
      'http://localhost/api/staking/activity?chain=testnet&api=https%3A%2F%2Fcustom.test&activity=enrollments&limit=999'
    )
  );
  expect(data.fetchPoxInfo).toHaveBeenCalledWith('testnet', 'https://custom.test');
  expect(data.fetchStakingActivity).toHaveBeenCalledWith(
    'ST123.pox-5',
    'testnet',
    'https://custom.test',
    5,
    'enrollments'
  );
  expect(data.fetchBondRewards).not.toHaveBeenCalled();
  expect(data.fetchCycleRewards).not.toHaveBeenCalled();
  expect(data.fetchBurnBlockTimes).not.toHaveBeenCalled();
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ events: [], incomplete: false });
});

test('invalid filters use the mainnet all-events feed by default', async () => {
  await GET(new Request('http://localhost/api/staking/activity?activity=invalid'));
  expect(data.fetchStakingActivity).toHaveBeenCalledWith(
    'ST123.pox-5',
    'mainnet',
    undefined,
    5,
    undefined
  );
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
