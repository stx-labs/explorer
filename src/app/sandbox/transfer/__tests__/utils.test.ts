import { exceedsStxBalance } from '../utils';

describe('exceedsStxBalance', () => {
  const fiveStx = '5000000';

  it('flags an amount above the balance', () => {
    expect(exceedsStxBalance(10, fiveStx)).toBe(true);
    expect(exceedsStxBalance('5.000001', fiveStx)).toBe(true);
  });

  it('allows an amount up to the balance', () => {
    expect(exceedsStxBalance(5, fiveStx)).toBe(false);
    expect(exceedsStxBalance('4.999999', fiveStx)).toBe(false);
  });

  it('treats a missing balance as zero and a missing amount as nothing to send', () => {
    expect(exceedsStxBalance(1, undefined)).toBe(true);
    expect(exceedsStxBalance(null, fiveStx)).toBe(false);
  });
});
