import { fetchTx } from '@/api/data-fetchers';
import type { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { redirect } from 'next/navigation';

import { ActivitySection } from '../ActivitySection';
import StakingActivityPage from '../activity/page';
import StakingBondsPage from '../bonds/page';
import * as data from '../data';
import { loadStakingOverview } from '../overview-data';
import { fetchDailyPrices } from '../prices';
import { fetchCurrentCycleEstimate } from '../reward-estimate';
import bond from './fixtures/bond.json';

async function StakingPage({
  searchParams,
}: {
  searchParams: Promise<{ chain?: string; api?: string; activity?: string }>;
}) {
  const { chain = 'mainnet', api } = await searchParams;
  return { props: await loadStakingOverview(chain, api) };
}

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`Redirect:${url}`);
  }),
}));

jest.mock('../PageClient', () => ({ StakingPageClient: jest.fn() }));
jest.mock('@/api/data-fetchers', () => ({ fetchTx: jest.fn() }));
jest.mock('../activity/PageClient', () => ({ ActivityPageClient: jest.fn() }));
jest.mock('../bonds/PageClient', () => ({ BondsPageClient: jest.fn() }));
jest.mock('../prices');
jest.mock('../reward-estimate');
jest.mock('../data', () => ({
  ...jest.requireActual('../data'),
  fetchBondsPage: jest.fn(),
  fetchBond: jest.fn(),
  fetchBondRegistrations: jest.fn(),
  fetchBondRewards: jest.fn(),
  fetchBurnBlockTimes: jest.fn(),
  fetchCycleRewards: jest.fn(),
  fetchCycleCalculationHeights: jest.fn(),
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
  jest.mocked(data.fetchBondRewards).mockResolvedValue({
    byBondIndex: {},
    settlementsByBond: {},
    lastCalculationHeightByCycle: {},
  });
  jest.mocked(data.fetchCycleCalculationHeights).mockResolvedValue({});
  jest.mocked(data.fetchStakingActivity).mockResolvedValue({ events: [], incomplete: false });
  jest.mocked(fetchDailyPrices).mockResolvedValue({ btc: new Map(), stx: new Map() });
  jest
    .mocked(fetchCurrentCycleEstimate)
    .mockResolvedValue({ cycleNumber: 12, creditedSats: BigInt(0) });
});

test('overview fetches final cycle blocks independently of activity', async () => {
  jest.mocked(data.fetchStakingActivity).mockResolvedValue({ events: [], incomplete: true });
  const page = await StakingPage({
    searchParams: Promise.resolve({ chain: 'testnet', activity: 'enrollments' }),
  });
  expect(data.fetchPoxInfo).toHaveBeenCalledWith('testnet', undefined);
  expect(data.fetchCycleRewards).toHaveBeenCalledWith(
    [12, 11, 10, 9],
    'testnet',
    undefined,
    poxInfo.contract_id
  );
  expect(data.fetchBondRewards).toHaveBeenCalledWith(
    [bond.index],
    'testnet',
    undefined,
    poxInfo.contract_id,
    expect.any(Number)
  );
  expect(data.fetchCycleCalculationHeights).toHaveBeenCalledWith(
    { 9: 8999, 10: 9899, 11: 10799 },
    poxInfo.contract_id,
    'testnet',
    undefined,
    {},
    jest.mocked(data.fetchBondRewards).mock.calls[0][4]
  );
  expect(data.fetchBurnBlockTimes).toHaveBeenCalledWith(
    expect.arrayContaining([9000, 9899, 9900, 10799, 10800, 11699]),
    11200,
    'testnet',
    undefined
  );
  expect(data.fetchStakingActivity).not.toHaveBeenCalled();
  const activity = await ActivitySection({ chain: 'testnet', group: 'enrollments' });
  expect(activity.props.initialData.incomplete).toBe(true);
  expect(activity.props.initialGroup).toBe('enrollments');
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
    expect(data.fetchCycleRewards).not.toHaveBeenCalled();
    expect(fetchCurrentCycleEstimate).not.toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
});

test('cycle settlement remains independent of unavailable bond histories', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    jest.mocked(data.fetchBondRewards).mockRejectedValueOnce(new Error('Bond events unavailable'));
    jest.mocked(data.fetchCycleCalculationHeights).mockResolvedValueOnce({ 11: 10799 });
    const page = await StakingPage({ searchParams: Promise.resolve({}) });
    expect(page.props.rewarded).toBeUndefined();
    expect(page.props.lastCalculationHeightByCycle).toEqual({ 11: 10799 });
  } finally {
    error.mockRestore();
  }
});

test('overview does not restart the history deadline after a stalled bond scan', async () => {
  jest.useFakeTimers();
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const deadline = Date.now() + 15000;
    jest.mocked(data.fetchBondRewards).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error('Reward history request timed out')), 15000);
        })
    );
    const pending = loadStakingOverview('mainnet');
    await jest.advanceTimersByTimeAsync(15000);
    const result = await pending;
    expect(data.fetchBondRewards).toHaveBeenCalledWith(
      [bond.index],
      'mainnet',
      undefined,
      poxInfo.contract_id,
      deadline
    );
    expect(data.fetchCycleCalculationHeights).toHaveBeenCalledWith(
      { 9: 8999, 10: 9899, 11: 10799 },
      poxInfo.contract_id,
      'mainnet',
      undefined,
      undefined,
      deadline
    );
    expect(result.bonds).toEqual([bond]);
    expect(result.rewarded).toBeUndefined();
  } finally {
    error.mockRestore();
    jest.useRealTimers();
  }
});

test('a failed settlement fallback preserves final calculations already proven by bond events', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    jest.mocked(data.fetchBondRewards).mockResolvedValueOnce({
      byBondIndex: {},
      settlementsByBond: {},
      lastCalculationHeightByCycle: { 11: 10799 },
    });
    jest
      .mocked(data.fetchCycleCalculationHeights)
      .mockRejectedValueOnce(new Error('API unavailable'));
    const page = await StakingPage({ searchParams: Promise.resolve({}) });
    expect(page.props.lastCalculationHeightByCycle).toEqual({ 11: 10799 });
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
    tx_status: 'success',
    canonical: true,
    burn_block_height: 8500,
    burn_block_time: 1700000000,
  } as Awaited<ReturnType<typeof fetchTx>>);
  const page = await StakingPage({ searchParams: Promise.resolve({ chain: 'testnet' }) });
  expect(fetchTx).toHaveBeenCalledWith('https://api.testnet.hiro.so', '0xsetup');
  expect(page.props.bonds[0].transaction?.bitcoin_block).toEqual({
    height: 8500,
    time: 1700000000,
  });
});

test.each(['abort_by_response', 'abort_by_post_condition', 'lookup-failure'])(
  'overview retains the featured bond and schedule fallback when setup is %s',
  async status => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      jest.mocked(data.fetchBond).mockResolvedValueOnce({
        ...bond,
        transaction: {
          tx_id: '0xsetup',
          block: { height: 100, hash: '0xblock', time: 1700000000 },
          bitcoin_block: { height: 11200, time: 1700000000 },
        },
      });
      if (status === 'lookup-failure') {
        jest.mocked(fetchTx).mockRejectedValueOnce(new Error('Setup lookup unavailable'));
      } else {
        jest.mocked(fetchTx).mockResolvedValueOnce({
          tx_status: status,
          canonical: true,
          burn_block_height: 8500,
          burn_block_time: 1700000000,
        } as Awaited<ReturnType<typeof fetchTx>>);
      }
      const page = await StakingPage({ searchParams: Promise.resolve({ chain: 'testnet' }) });
      expect(page.props.bonds).toEqual([{ ...bond, transaction: undefined }]);
      expect(page.props.bondsUnavailable).toBe(false);
    } finally {
      error.mockRestore();
    }
  }
);

test('bonds route follows opaque cursors and normalizes an out-of-range URL', async () => {
  jest
    .mocked(data.fetchBondsPage)
    .mockResolvedValueOnce({ bonds: [bond], total: 45, nextCursor: 'opaque:second' })
    .mockResolvedValueOnce({ bonds: [bond], total: 45, nextCursor: 'opaque:last' })
    .mockResolvedValueOnce({ bonds: [bond], total: 45, nextCursor: null });
  await expect(
    StakingBondsPage({
      searchParams: Promise.resolve({
        chain: 'testnet',
        api: 'https://api.testnet.hiro.so',
        page: '999',
      }),
    })
  ).rejects.toThrow('Redirect:');
  expect(data.fetchBondsPage).toHaveBeenNthCalledWith(
    2,
    'testnet',
    'https://api.testnet.hiro.so',
    20,
    'opaque:second'
  );
  expect(data.fetchBondsPage).toHaveBeenNthCalledWith(
    3,
    'testnet',
    'https://api.testnet.hiro.so',
    20,
    'opaque:last'
  );
  expect(redirect).toHaveBeenCalledWith(
    '/staking/bonds?chain=testnet&api=https%3A%2F%2Fapi.testnet.hiro.so&page=3'
  );
});

test.each(['-1', '2.5', '2junk', '1', '01'])(
  'normalizes invalid or redundant page query %s',
  async page => {
    await expect(StakingBondsPage({ searchParams: Promise.resolve({ page }) })).rejects.toThrow(
      'Redirect:/staking/bonds?chain=mainnet'
    );
  }
);

test('failed first cursor lookup preserves the requested page and shows unavailable data', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    jest.mocked(data.fetchBondsPage).mockRejectedValueOnce(new Error('offline'));
    const page = await StakingBondsPage({ searchParams: Promise.resolve({ page: '5' }) });
    expect(page.props).toMatchObject({ pageIndex: 4, unavailable: true, bonds: [] });
    expect(redirect).not.toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
});

test('a failed PoX lookup preserves available bonds and pagination without fabricated heights', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    jest.mocked(data.fetchPoxInfo).mockRejectedValueOnce(new Error('PoX unavailable'));
    jest
      .mocked(data.fetchBondsPage)
      .mockResolvedValueOnce({ bonds: [bond], total: 40, nextCursor: 'next' });
    const page = await StakingBondsPage({ searchParams: Promise.resolve({}) });
    expect(page.props).toMatchObject({
      bonds: [bond],
      unavailable: false,
      total: 40,
      pageIndex: 0,
      currentBurnHeight: undefined,
      burnBlockTimes: {},
    });
    expect(data.fetchBondRewards).toHaveBeenCalled();
    expect(data.fetchBurnBlockTimes).not.toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
});

test('bond rewards and dates start concurrently', async () => {
  let finish!: (value: data.BondRewards) => void;
  jest.mocked(data.fetchBondRewards).mockReturnValueOnce(
    new Promise(resolve => {
      finish = resolve;
    })
  );
  const pending = StakingBondsPage({ searchParams: Promise.resolve({}) });
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(data.fetchBurnBlockTimes).toHaveBeenCalled();
  finish({ byBondIndex: {}, settlementsByBond: {}, lastCalculationHeightByCycle: {} });
  await pending;
});

test('activity route forwards a valid bond filter and incomplete result', async () => {
  jest.mocked(data.fetchStakingActivity).mockResolvedValue({ events: [], incomplete: true });
  const page = await StakingActivityPage({
    searchParams: Promise.resolve({ chain: 'testnet', bond: '3', activity: 'distributions' }),
  });
  expect(data.fetchStakingActivity).toHaveBeenCalledWith(
    poxInfo.contract_id,
    'testnet',
    'https://api.testnet.hiro.so',
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

test('overview exact date lookups are bounded by the timeline window', async () => {
  const bonds = Array.from({ length: 50 }, (_, i) => ({
    ...bond,
    index: i + 1,
    status: i === 39 ? 'active' : 'closed',
    schedule: {
      activation: { bitcoin_height: i * 1800, pox_cycle: i * 2 },
      unlock: { bitcoin_height: i * 1800 + 10800, pox_cycle: i * 2 + 12 },
    },
  }));
  jest.mocked(data.fetchBondsPage).mockResolvedValueOnce({ bonds, total: 50, nextCursor: null });
  await loadStakingOverview('testnet');
  const heights = jest.mocked(data.fetchBurnBlockTimes).mock.calls[0][0];
  expect(heights).toHaveLength(11 * 5 + 4 * 2);
  expect(heights).not.toContain(bonds[0].schedule.activation.bitcoin_height);
});
