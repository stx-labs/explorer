import { redirect } from 'next/navigation';

import { UnsupportedStakingNetwork } from '../UnsupportedStakingNetwork';
import ActivityPage from '../activity/page';
import BondsPage from '../bonds/page';
import { fetchBondPageAtIndex } from '../bonds/page-data';
import { fetchPoxInfo, fetchStakingActivity } from '../data';
import { loadStakingOverview } from '../overview-data';
import StakingPage from '../page';
import { getStakingPageApiUrl } from '../page-network';

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`Redirect:${url}`);
  }),
}));

jest.mock('../overview-data', () => ({ loadStakingOverview: jest.fn() }));
jest.mock('../bonds/page-data', () => ({ fetchBondPageAtIndex: jest.fn() }));
jest.mock('../data', () => ({
  ...jest.requireActual('../data'),
  fetchPoxInfo: jest.fn(),
  fetchStakingActivity: jest.fn(),
}));
beforeEach(() => jest.clearAllMocks());

test.each([
  { page: StakingPage, pathname: '/staking' },
  { page: ActivityPage, pathname: '/staking/activity' },
  { page: BondsPage, pathname: '/staking/bonds' },
])(
  '$pathname canonicalizes API URLs before loading and preserves filters',
  async ({ page, pathname }) => {
    const params = {
      chain: 'testnet',
      api: 'https://API.TESTNET.HIRO.SO:443/',
      activity: 'distributions',
      bond: '3',
      page: '2',
      tag: ['a', 'b'],
    };
    await expect(page({ searchParams: Promise.resolve(params) })).rejects.toThrow('Redirect:');
    expect(redirect).toHaveBeenCalledWith(
      `${pathname}?chain=testnet&api=https%3A%2F%2Fapi.testnet.hiro.so&activity=distributions&bond=3&page=2&tag=a&tag=b`
    );
    expect(loadStakingOverview).not.toHaveBeenCalled();
    expect(fetchBondPageAtIndex).not.toHaveBeenCalled();
    expect(fetchPoxInfo).not.toHaveBeenCalled();
    expect(fetchStakingActivity).not.toHaveBeenCalled();
    jest.mocked(redirect).mockClear();
    expect(getStakingPageApiUrl(pathname, { ...params, api: 'https://api.testnet.hiro.so' })).toBe(
      'https://api.testnet.hiro.so'
    );
    expect(redirect).not.toHaveBeenCalled();
  }
);

test.each([undefined, 'https://api.hiro.so'])(
  'all three pages reject devnet before upstream loading (API: %s)',
  async api => {
    for (const page of [StakingPage, ActivityPage, BondsPage]) {
      const result = await page({ searchParams: Promise.resolve({ chain: 'devnet', api }) });
      expect(result.type).toBe(UnsupportedStakingNetwork);
    }
    expect(loadStakingOverview).not.toHaveBeenCalled();
    expect(fetchBondPageAtIndex).not.toHaveBeenCalled();
    expect(fetchPoxInfo).not.toHaveBeenCalled();
    expect(fetchStakingActivity).not.toHaveBeenCalled();
  }
);

test.each([
  'https://attacker.example',
  'https://api.hiro.so.attacker.example',
  'http://localhost:3999',
  'https://169.254.169.254',
  'https://[::1]',
  'https://api.hiro.so/redirect?url=https://attacker.example',
])('all three pages reject %s before upstream loading', async api => {
  for (const page of [StakingPage, ActivityPage, BondsPage]) {
    const result = await page({ searchParams: Promise.resolve({ chain: 'mainnet', api }) });
    expect(result.type).toBe(UnsupportedStakingNetwork);
  }
  expect(loadStakingOverview).not.toHaveBeenCalled();
  expect(fetchBondPageAtIndex).not.toHaveBeenCalled();
  expect(fetchPoxInfo).not.toHaveBeenCalled();
  expect(fetchStakingActivity).not.toHaveBeenCalled();
});
