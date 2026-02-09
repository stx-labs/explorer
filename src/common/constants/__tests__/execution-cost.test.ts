import { calculateExecutionCostPercentage, formatExecutionCostPercentage } from '../execution-cost';

describe('calculateExecutionCostPercentage', () => {
  it('calculates percentage correctly', () => {
    expect(calculateExecutionCostPercentage(50, 100)).toBe(50);
    expect(calculateExecutionCostPercentage(25, 100)).toBe(25);
    expect(calculateExecutionCostPercentage(1, 4)).toBe(25);
  });

  it('returns 0 when limit is 0', () => {
    expect(calculateExecutionCostPercentage(50, 0)).toBe(0);
  });

  it('returns 0 when limit is negative', () => {
    expect(calculateExecutionCostPercentage(50, -10)).toBe(0);
  });

  it('caps percentage at 100', () => {
    expect(calculateExecutionCostPercentage(150, 100)).toBe(100);
    expect(calculateExecutionCostPercentage(200, 50)).toBe(100);
  });

  it('handles zero value', () => {
    expect(calculateExecutionCostPercentage(0, 100)).toBe(0);
  });

  it('handles decimal percentages', () => {
    expect(calculateExecutionCostPercentage(1, 1000)).toBe(0.1);
    expect(calculateExecutionCostPercentage(1, 10000)).toBe(0.01);
  });
});

describe('formatExecutionCostPercentage', () => {
  it('formats zero as 0%', () => {
    expect(formatExecutionCostPercentage(0)).toBe('0%');
  });

  it('formats very small percentages as <0.0001%', () => {
    expect(formatExecutionCostPercentage(0.00001)).toBe('<0.0001%');
    expect(formatExecutionCostPercentage(0.00005)).toBe('<0.0001%');
    expect(formatExecutionCostPercentage(0.00009)).toBe('<0.0001%');
  });

  it('formats small percentages with 4 decimal places', () => {
    expect(formatExecutionCostPercentage(0.0001)).toBe('0.0001%');
    expect(formatExecutionCostPercentage(0.001)).toBe('0.0010%');
    expect(formatExecutionCostPercentage(0.005)).toBe('0.0050%');
    expect(formatExecutionCostPercentage(0.0099)).toBe('0.0099%');
  });

  it('formats normal percentages with 2 decimal places', () => {
    expect(formatExecutionCostPercentage(0.01)).toBe('0.01%');
    expect(formatExecutionCostPercentage(0.1)).toBe('0.10%');
    expect(formatExecutionCostPercentage(1)).toBe('1.00%');
    expect(formatExecutionCostPercentage(50)).toBe('50.00%');
    expect(formatExecutionCostPercentage(99.99)).toBe('99.99%');
    expect(formatExecutionCostPercentage(100)).toBe('100.00%');
  });
});
