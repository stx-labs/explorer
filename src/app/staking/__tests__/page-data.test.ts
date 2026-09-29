import { fetchTx } from '@/api/data-fetchers';

import { fetchBond } from '../data';
import { fetchFeaturedBond } from '../page-data';
import bond from './fixtures/bond.json';

jest.mock('@/api/data-fetchers', () => ({ fetchTx: jest.fn() }));
jest.mock('@/common/utils/error-utils', () => ({
  ...jest.requireActual('@/common/utils/error-utils'),
  logError: jest.fn(),
}));
jest.mock('../data', () => ({ fetchBond: jest.fn() }));

const bondWithSetup = {
  ...bond,
  transaction: {
    tx_id: '0xsetup',
    block: { height: 100, hash: '0xblock', time: 1700000000 },
    bitcoin_block: { height: 11200, time: 1700000000 },
  },
};

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(fetchBond).mockResolvedValue(bondWithSetup);
});

test.each([
  { chain: 'testnet', api: undefined, expectedApi: 'https://api.testnet.hiro.so' },
  { chain: 'mainnet', api: 'https://api.example.test', expectedApi: 'https://api.example.test' },
])(
  'corrects setup height and time using the selected $chain API',
  async ({ chain, api, expectedApi }) => {
    jest.mocked(fetchTx).mockResolvedValue({
      tx_status: 'success',
      canonical: true,
      burn_block_height: 8500,
      burn_block_time: 1699999900,
    } as Awaited<ReturnType<typeof fetchTx>>);

    const result = await fetchFeaturedBond(bond.index, chain, api);

    expect(fetchBond).toHaveBeenCalledWith(bond.index, chain, api);
    expect(fetchTx).toHaveBeenCalledWith(expectedApi, '0xsetup');
    expect(result).toEqual({
      ...bondWithSetup,
      transaction: {
        ...bondWithSetup.transaction,
        bitcoin_block: { height: 8500, time: 1699999900 },
      },
    });
    expect(bondWithSetup.transaction.bitcoin_block.height).toBe(11200);
  }
);

test('leaves bonds without setup metadata unchanged', async () => {
  jest.mocked(fetchBond).mockResolvedValue(bond);
  await expect(fetchFeaturedBond(bond.index, 'testnet')).resolves.toBe(bond);
  expect(fetchTx).not.toHaveBeenCalled();
});

test.each([
  { tx_status: 'pending' },
  { tx_status: 'success', canonical: false, burn_block_height: 8500, burn_block_time: 1700000000 },
  { tx_status: 'success', canonical: true, burn_block_height: 0, burn_block_time: 1700000000 },
])('falls back to the schedule for unconfirmed setup metadata: %j', async tx => {
  jest.mocked(fetchTx).mockResolvedValue(tx as Awaited<ReturnType<typeof fetchTx>>);
  await expect(fetchFeaturedBond(bond.index, 'testnet')).resolves.toEqual({
    ...bond,
    transaction: undefined,
  });
});

test.each(['abort_by_response', 'abort_by_post_condition'] as const)(
  'preserves the bond without setup metadata when a confirmed transaction has status %s',
  async tx_status => {
    jest.mocked(fetchTx).mockResolvedValue({
      tx_status,
      canonical: true,
      burn_block_height: 8500,
      burn_block_time: 1700000000,
    } as Awaited<ReturnType<typeof fetchTx>>);

    await expect(fetchFeaturedBond(bond.index, 'testnet')).resolves.toEqual({
      ...bond,
      transaction: undefined,
    });
  }
);

test('preserves the bond and falls back to its schedule when transaction lookup fails', async () => {
  jest.mocked(fetchTx).mockRejectedValue(new Error('API unavailable'));
  await expect(fetchFeaturedBond(bond.index, 'testnet')).resolves.toEqual({
    ...bond,
    transaction: undefined,
  });
});

test('still propagates primary bond fetch failures', async () => {
  jest.mocked(fetchBond).mockRejectedValue(new Error('Bond unavailable'));
  await expect(fetchFeaturedBond(bond.index, 'testnet')).rejects.toThrow('Bond unavailable');
  expect(fetchTx).not.toHaveBeenCalled();
});
