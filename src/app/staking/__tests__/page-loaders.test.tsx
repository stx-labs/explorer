import { fetchTx } from '@/api/data-fetchers';
import type { PoxInfo } from '@/common/queries/usePoxInforRaw';

import StakingActivityPage from '../activity/page';
import StakingBondsPage from '../bonds/page';
import * as data from '../data';
import StakingPage from '../page';
import { fetchDailyPrices } from '../prices';
import { fetchCurrentCycleEstimate } from '../reward-estimate';
import bond from './fixtures/bond.json';

jest.mock('../PageClient', () => ({ StakingPageClient: jest.fn() }));
jest.mock('@/api/data-fetchers', () => ({ fetchTx: jest.fn() }));
jest.mock('../activity/PageClient', () => ({ ActivityPageClient: jest.fn() }));
jest.mock('../bonds/PageClient', () => ({ BondsPageClient: jest.fn() }));
jest.mock('../prices');
jest.mock('../reward-estimate');
jest.mock('../data', () => ({
  ...jest.requireActual('../data'),
  fetchBondsPage: jest.fn(),
  fetchHighestBondIndex: jest.fn(),
  fetchBond: jest.fn(),
  fetchBondRegistrations: jest.fn(),
  fetchBondRewards: jest.fn(),
  fetchBurnBlockTimes: jest.fn(),
  fetchCycleRewards: jest.fn(),
  fetchPoxCycles: jest.fn(),
  fetchPoxInfo: jest.fn(),
  fetchStakingActivity: jest.fn(),
}));

const poxInfo = {
  contract_id: 'ST000000000000000000002AMW42H.pox-5',
  current_cycle: { id: 12 },
  current_burnchain_block_height: 11200,
  first_burnchain_block_height: 0,
  reward_cycle_length: 900,
  prepare_phase_block_length: 100,
  contract_versions: [
    { contract_id: 'ST000000000000000000002AMW42H.pox-5', first_reward_cycle_id: 4 },
  ],
} as unknown as PoxInfo;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(data.fetchPoxInfo).mockResolvedValue(poxInfo);
  jest.mocked(data.fetchBondsPage).mockResolvedValue({ bonds: [bond], total: 1, nextCursor: null });
  jest.mocked(data.fetchBond).mockResolvedValue(bond);
  jest.mocked(data.fetchBondRegistrations).mockResolvedValue([]);
  jest.mocked(data.fetchPoxCycles).mockResolvedValue(
    [12, 11, 10, 9, 8].map(cycle_number => ({
      cycle_number,
      block_height: 0,
      total_weight: 0,
      total_signers: 0,
      total_stacked_amount: '0',
    }))
  );
  jest.mocked(data.fetchCycleRewards).mockResolvedValue({});
  jest.mocked(data.fetchBurnBlockTimes).mockResolvedValue({});
  jest.mocked(data.fetchBondRewards).mockResolvedValue(undefined);
  jest.mocked(data.fetchStakingActivity).mockResolvedValue({ events: [], incomplete: false });
  jest.mocked(fetchDailyPrices).mockResolvedValue({ btc: new Map(), stx: new Map() });
  jest
    .mocked(fetchCurrentCycleEstimate)
    .mockResolvedValue({ cycleNumber: 12, creditedSats: BigInt(0) });
});

test('overview fetches final cycle blocks and propagates partial activity on the selected network', async () => {
  jest.mocked(data.fetchStakingActivity).mockResolvedValue({ events: [], incomplete: true });
  const page = await StakingPage({
    searchParams: Promise.resolve({ chain: 'testnet', activity: 'enrollments' }),
  });
  expect(data.fetchPoxInfo).toHaveBeenCalledWith('testnet', undefined);
  expect(data.fetchBurnBlockTimes).toHaveBeenCalledWith(
    expect.arrayContaining([9000, 9899, 9900, 10799, 10800, 11699]),
    11200,
    'testnet',
    undefined
  );
  expect(page.props.activityIncomplete).toBe(true);
  expect(page.props.selectedActivityGroup).toBe('enrollments');
  expect(page.props.cycles.map((cycle: data.PoxCycle) => cycle.cycle_number)).toEqual([
    12, 11, 10, 9,
  ]);
});

test('overview retains a usable failure state when PoX cannot be loaded', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    jest.mocked(data.fetchPoxInfo).mockRejectedValueOnce(new Error('API unavailable'));
    const page = await StakingPage({ searchParams: Promise.resolve({}) });
    expect(page.props.poxInfo).toBeUndefined();
    expect(page.props.activityIncomplete).toBe(true);
    expect(data.fetchCycleRewards).not.toHaveBeenCalled();
    expect(fetchCurrentCycleEstimate).not.toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
});

test('setup milestone uses the confirmed transaction height instead of the mismatched bond response', async () => {
  jest.mocked(data.fetchBond).mockResolvedValueOnce({
    ...bond,
    transaction: {
      tx_id: '0xsetup',
      block: { height: 100, hash: '0xblock', time: 1700000000 },
      bitcoin_block: { height: 11200, time: 1700000000 },
    },
  });
  jest.mocked(fetchTx).mockResolvedValueOnce({
    canonical: true,
    burn_block_height: 8500,
    burn_block_time: 1700000000,
  } as Awaited<ReturnType<typeof fetchTx>>);
  const page = await StakingPage({ searchParams: Promise.resolve({ chain: 'testnet' }) });
  expect(fetchTx).toHaveBeenCalledWith('https://api.testnet.hiro.so', '0xsetup');
  expect(page.props.bonds[0].transaction.bitcoin_block).toEqual({ height: 8500, time: 1700000000 });
});

test('bonds route clamps a deep link to the last server page and preserves the API/network', async () => {
  jest.mocked(data.fetchHighestBondIndex).mockResolvedValue({ highestIndex: 45, total: 45 });
  jest
    .mocked(data.fetchBondsPage)
    .mockResolvedValue({ bonds: [bond], total: 45, nextCursor: null });
  const page = await StakingBondsPage({
    searchParams: Promise.resolve({
      chain: 'testnet',
      api: 'https://api.example.test',
      page: '999',
    }),
  });
  expect(data.fetchBondsPage).toHaveBeenCalledWith('testnet', 'https://api.example.test', 20, '5');
  expect(page.props).toMatchObject({ total: 45, pageIndex: 2, pageSize: 20, bonds: [bond] });
});

test.each(['-1', '2.5', '2junk'])('invalid bond-page query %s uses the first page', async query => {
  const page = await StakingBondsPage({ searchParams: Promise.resolve({ page: query }) });
  expect(page.props.pageIndex).toBe(0);
  expect(data.fetchHighestBondIndex).not.toHaveBeenCalled();
});

test('activity route forwards a valid bond filter and incomplete result', async () => {
  jest.mocked(data.fetchStakingActivity).mockResolvedValue({ events: [], incomplete: true });
  const page = await StakingActivityPage({
    searchParams: Promise.resolve({ chain: 'testnet', bond: '3', activity: 'distributions' }),
  });
  expect(data.fetchStakingActivity).toHaveBeenCalledWith(
    poxInfo.contract_id,
    'testnet',
    undefined,
    60,
    'distributions',
    3
  );
  expect(page.props).toMatchObject({
    bondIndex: 3,
    selectedGroup: 'distributions',
    incomplete: true,
  });
});

test.each(['-1', '3junk', '1.5'])('activity ignores invalid bond index %s', async bond => {
  const page = await StakingActivityPage({ searchParams: Promise.resolve({ bond }) });
  expect(page.props.bondIndex).toBeUndefined();
});
