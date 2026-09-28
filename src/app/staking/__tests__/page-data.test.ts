import { fetchTx } from '@/api/data-fetchers';

import { fetchBond } from '../data';
import { fetchFeaturedBond } from '../page-data';
import bond from './fixtures/bond.json';

jest.mock('@/api/data-fetchers', () => ({ fetchTx: jest.fn() }));
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
  { canonical: false, burn_block_height: 8500, burn_block_time: 1700000000 },
  { canonical: true, burn_block_height: 0, burn_block_time: 1700000000 },
])('rejects unconfirmed setup metadata: %j', async tx => {
  jest.mocked(fetchTx).mockResolvedValue(tx as Awaited<ReturnType<typeof fetchTx>>);
  await expect(fetchFeaturedBond(bond.index, 'testnet')).rejects.toThrow(
    'Bond setup transaction is not confirmed'
  );
});

test('propagates transaction lookup failure so the caller can use its unavailable state', async () => {
  jest.mocked(fetchTx).mockRejectedValue(new Error('API unavailable'));
  await expect(fetchFeaturedBond(bond.index, 'testnet')).rejects.toThrow('API unavailable');
});
