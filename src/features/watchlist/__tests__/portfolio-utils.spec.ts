import { buildPortfolioSummary, sumMicroStxStrings } from '../portfolio-utils';

describe('portfolio-utils', () => {
  it('sumMicroStxStrings adds string micro amounts', () => {
    expect(sumMicroStxStrings(['1000000', '2000000'])).toBe('3000000');
    expect(sumMicroStxStrings(['0', undefined, '500'])).toBe('500');
  });

  it('buildPortfolioSummary computes USD from STX price', () => {
    const s = buildPortfolioSummary('2000000', 0.5, 2, 99);
    expect(s.totalStx).toBe('2000000');
    expect(s.addressesCount).toBe(2);
    expect(s.lastUpdated).toBe(99);
    expect(s.totalUsd).toBe(1);
  });
});
