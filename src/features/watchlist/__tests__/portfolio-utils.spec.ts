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

  it('buildPortfolioSummary yields zero USD when price is zero', () => {
    const s = buildPortfolioSummary('1000000', 0, 1, 1);
    expect(s.totalUsd).toBe(0);
  });

  it('buildPortfolioSummary rounds STX→USD using micro balance conversion', () => {
    const s = buildPortfolioSummary('1000000', 0.23, 1, 1);
    expect(s.totalUsd).toBeCloseTo(0.23, 5);
  });
});

/** Mirrors distribution % logic from WatchlistPageClient for sum≈100. */
function distributionPcts(stxNums: number[]): number[] {
  const total = stxNums.reduce((a, b) => a + b, 0);
  return stxNums.map(s => (total > 0 ? (s / total) * 100 : 0));
}

describe('watchlist portfolio distribution (percent mix)', () => {
  it('sums to ~100% for mixed balances', () => {
    const pcts = distributionPcts([30, 50, 20]);
    const sum = pcts.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 1);
  });

  it('is all zero when total STX is zero', () => {
    expect(distributionPcts([0, 0, 0]).every(p => p === 0)).toBe(true);
  });
});
