import {
  buildSignerKeyToManagersMap,
  computeStakerCounts,
  countStakerTypes,
  dedupeStakers,
  formatStakerTypeSplit,
  getPoxContractFirstCycleId,
  isPox5Contract,
} from '../utils';

describe('isPox5Contract', () => {
  test('detects the pox-5 contract', () => {
    expect(isPox5Contract('ST000000000000000000002AMW42H.pox-5')).toBe(true);
  });

  test('rejects other pox versions and missing values', () => {
    expect(isPox5Contract('SP000000000000000000002Q6VF78.pox-4')).toBe(false);
    expect(isPox5Contract(undefined)).toBe(false);
  });
});

describe('getPoxContractFirstCycleId', () => {
  const versions = [
    { contract_id: 'ST000000000000000000002AMW42H.pox-4', first_reward_cycle_id: 1 },
    { contract_id: 'ST000000000000000000002AMW42H.pox-5', first_reward_cycle_id: 5 },
  ];

  test('finds the first reward cycle for a contract version', () => {
    expect(getPoxContractFirstCycleId(versions, 'pox-5')).toBe(5);
  });

  test('returns undefined when the version is absent', () => {
    expect(getPoxContractFirstCycleId(versions, 'pox-6')).toBeUndefined();
    expect(getPoxContractFirstCycleId(undefined, 'pox-5')).toBeUndefined();
  });
});

describe('buildSignerKeyToManagersMap', () => {
  test('groups managers sharing a signing key and normalizes key casing', () => {
    const map = buildSignerKeyToManagersMap([
      { signer: 'ST1.manager-a', signer_key: '0xAABB' },
      { signer: 'ST2.manager-b', signer_key: '0xaabb' },
      { signer: 'ST3.manager-c', signer_key: '0xccdd' },
    ]);
    expect(map['0xaabb']).toEqual(['ST1.manager-a', 'ST2.manager-b']);
    expect(map['0xccdd']).toEqual(['ST3.manager-c']);
  });

  test('is not vulnerable to prototype-polluting keys', () => {
    const map = buildSignerKeyToManagersMap([{ signer: 'ST1.evil', signer_key: '__proto__' }]);
    expect(map['__proto__']).toEqual(['ST1.evil']);
    expect(({} as Record<string, unknown>)['ST1.evil']).toBeUndefined();
  });
});

describe('dedupeStakers', () => {
  test('merges duplicate stakers and unions their staking types', () => {
    expect(
      dedupeStakers([
        { staker: 'ST1', types: ['stx'] },
        { staker: 'ST1', types: ['btc'] },
        { staker: 'ST2', types: ['btc'] },
      ])
    ).toEqual([
      { staker: 'ST1', types: ['stx', 'btc'] },
      { staker: 'ST2', types: ['btc'] },
    ]);
  });
});

describe('countStakerTypes', () => {
  test('counts unique stakers once, per-type counts overlap', () => {
    expect(
      countStakerTypes([
        { staker: 'ST1', types: ['stx', 'btc'] },
        { staker: 'ST2', types: ['btc'] },
        { staker: 'ST2', types: ['btc'] },
      ])
    ).toEqual({ total: 2, stx: 1, btc: 2 });
  });

  test('handles an empty list', () => {
    expect(countStakerTypes([])).toEqual({ total: 0, stx: 0, btc: 0 });
  });
});

describe('computeStakerCounts', () => {
  test('dedupes across fully enumerated pages and includes the split', () => {
    expect(
      computeStakerCounts([
        { stakers: [{ staker: 'ST1', types: ['stx'] }], total: 1 },
        { stakers: [{ staker: 'ST1', types: ['btc'] }], total: 1 },
      ])
    ).toEqual({ total: 1, split: { stx: 1, btc: 1 } });
  });

  test('falls back to summed API totals without a split when paging was capped', () => {
    expect(
      computeStakerCounts([{ stakers: [{ staker: 'ST1', types: ['stx'] }], total: 5000 }])
    ).toEqual({ total: 5000 });
  });
});

describe('formatStakerTypeSplit', () => {
  test('formats the split', () => {
    expect(formatStakerTypeSplit({ stx: 2, btc: 1 })).toBe('2 STX · 1 BTC');
  });
});
