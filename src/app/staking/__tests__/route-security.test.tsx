import { UnsupportedStakingNetwork } from '../UnsupportedStakingNetwork';
import ActivityPage from '../activity/page';
import BondsPage from '../bonds/page';
import { fetchBondPageAtIndex } from '../bonds/page-data';
import { fetchPoxInfo, fetchStakingActivity } from '../data';
import { loadStakingOverview } from '../overview-data';
import StakingPage from '../page';

jest.mock('../overview-data', () => ({ loadStakingOverview: jest.fn() }));
jest.mock('../bonds/page-data', () => ({ fetchBondPageAtIndex: jest.fn() }));
jest.mock('../data', () => ({
  ...jest.requireActual('../data'),
  fetchPoxInfo: jest.fn(),
  fetchStakingActivity: jest.fn(),
}));
beforeEach(() => jest.clearAllMocks());

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
