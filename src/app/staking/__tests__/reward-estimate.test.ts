/** @jest-environment node */
import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import type { PoxInfo } from '@/common/queries/usePoxInforRaw';

import {
  ClarityValue,
  cvToHex,
  responseErrorCV,
  responseOkCV,
  someCV,
  trueCV,
  tupleCV,
  uintCV,
} from '@stacks/transactions';

import type { Bond } from '../data';
import { fetchCurrentCycleEstimate, getPendingCalculationHeight } from '../reward-estimate';

jest.mock('@/api/stacksAPIFetch');
const fetchMock = stacksAPIFetch as jest.MockedFunction<typeof stacksAPIFetch>;
const tip = 'a'.repeat(64);
const pox = {
  contract_id: 'SP000000000000000000002Q6VF78.pox-5',
  current_cycle: { id: 142 },
  first_burnchain_block_height: 666050,
  reward_cycle_length: 2100,
} as PoxInfo;
const bonds = [
  {
    index: 1,
    schedule: { activation: { bitcoin_height: 964250 }, unlock: { bitcoin_height: 989450 } },
  },
] as Bond[];
function respond(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}
function mockReads(overrides: Record<string, ClarityValue> = {}) {
  fetchMock.mockImplementation(async (url, init) => {
    if (url.includes('/extended/v2/blocks'))
      return respond({ results: [{ index_block_hash: `0x${tip}`, burn_block_height: 965299 }] });
    const fn = new URL(url).pathname.split('/').pop()!;
    const args = JSON.parse(init?.body as string).arguments;
    const values: Record<string, ClarityValue> = {
      'current-pox-reward-cycle': uintCV(142),
      'current-distribution-cycle': uintCV(284),
      'get-last-reward-compute-height': uintCV(964249),
      'get-rewards-per-token-for-cycle': uintCV('1000000000000000000'),
      'get-total-shares-staked-for-cycle': uintCV(
        args[1] === cvToHex(someCV(uintCV(1))) ? 100000000 : 100
      ),
      'get-new-rewards': uintCV(100000),
      'get-protocol-bond': someCV(tupleCV({ 'target-rate': uintCV(300) })),
      'assert-all-active-bonds-included': responseOkCV(trueCV()),
      ...overrides,
    };
    if (!values[fn]) throw new Error(`Unexpected read ${fn}`);
    return respond({ okay: true, result: cvToHex(values[fn]) });
  });
}
beforeEach(() => fetchMock.mockReset());

test('combines confirmed credits with a bond-first estimate at one pinned block', async () => {
  mockReads();
  await expect(fetchCurrentCycleEstimate(pox, bonds, 'mainnet')).resolves.toEqual({
    cycleNumber: 142,
    creditedSats: BigInt(100),
    estimatedSats: BigInt(34100),
    projectedTotalSats: BigInt(68200),
  });
  const reads = fetchMock.mock.calls.filter(([url]) => url.includes('/call-read/'));
  expect(reads.length).toBeGreaterThan(6);
  expect(reads.every(([url]) => new URL(url).searchParams.get('tip') === tip)).toBe(true);
});

test('does not mix a pending previous-cycle pool into the current cycle', async () => {
  mockReads({ 'get-last-reward-compute-height': uintCV(963199) });
  const result = await fetchCurrentCycleEstimate(pox, bonds, 'mainnet');
  expect(result.estimatedSats).toBeUndefined();
  expect(result.projectedTotalSats).toBeUndefined();
  expect(result.creditedSats).toBe(BigInt(100));
});

test('keeps confirmed credits when calculations are delayed by multiple intervals', async () => {
  mockReads({ 'get-last-reward-compute-height': uintCV(962149) });
  const result = await fetchCurrentCycleEstimate(pox, bonds, 'mainnet');
  expect(result.estimatedSats).toBeUndefined();
  expect(result.projectedTotalSats).toBeUndefined();
  expect(result.creditedSats).toBe(BigInt(100));
});

test('omits the forecast when the pinned block has no burn height', async () => {
  mockReads();
  const serve = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url, init) =>
    url.includes('/extended/v2/blocks')
      ? Promise.resolve(respond({ results: [{ index_block_hash: `0x${tip}` }] }))
      : serve(url, init)
  );
  const result = await fetchCurrentCycleEstimate(pox, bonds, 'mainnet');
  expect(result.creditedSats).toBe(BigInt(100));
  expect(result.estimatedSats).toBe(BigInt(34100));
  expect(result.projectedTotalSats).toBeUndefined();
});

test('rejects an incomplete active-bond set and a cycle rollover', async () => {
  mockReads({ 'assert-all-active-bonds-included': responseErrorCV(uintCV(1)) });
  await expect(fetchCurrentCycleEstimate(pox, bonds, 'mainnet')).rejects.toThrow(
    'missing an active bond'
  );
  mockReads({ 'current-pox-reward-cycle': uintCV(143) });
  await expect(fetchCurrentCycleEstimate(pox, bonds, 'mainnet')).rejects.toThrow('cycle boundary');
});

test('selects the due interval or the next interval after a completed calculation', () => {
  expect(getPendingCalculationHeight(285, 964249, 666050, 2100)).toBe(965299);
  expect(getPendingCalculationHeight(285, 965299, 666050, 2100)).toBe(966349);
  expect(getPendingCalculationHeight(285, 966349, 666050, 2100)).toBeUndefined();
});

test('uses integer contract cadence for odd cycle lengths', () => {
  expect(getPendingCalculationHeight(2, 1051, 1000, 105)).toBe(1103);
  expect(getPendingCalculationHeight(2, 1103, 1000, 105)).toBe(1155);
});
