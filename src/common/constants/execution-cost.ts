export const BLOCK_EXECUTION_LIMITS = {
  write_length: 15_000_000,
  write_count: 15_000,
  read_length: 100_000_000,
  read_count: 15_000,
  runtime: 5_000_000_000,
} as const;

export const EXECUTION_COST_LABELS: Record<keyof typeof BLOCK_EXECUTION_LIMITS, string> = {
  write_length: 'write length',
  write_count: 'write count',
  read_length: 'read length',
  read_count: 'read count',
  runtime: 'runtime',
} as const;

export const EXECUTION_COST_DESCRIPTIONS: Record<keyof typeof BLOCK_EXECUTION_LIMITS, string> = {
  write_length: 'Total bytes written to storage',
  write_count: 'Number of write operations',
  read_length: 'Total bytes read from storage',
  read_count: 'Number of read operations',
  runtime: 'Clarity VM execution time',
} as const;

export type ExecutionCostKey = keyof typeof BLOCK_EXECUTION_LIMITS;

export function calculateExecutionCostPercentage(value: number, limit: number): number {
  if (limit <= 0) return 0;
  const percentage = (value / limit) * 100;
  return Math.min(percentage, 100);
}

export function formatExecutionCostPercentage(percentage: number): string {
  if (percentage === 0) {
    return '0%';
  }
  if (percentage < 0.0001) {
    return '<0.0001%';
  }
  if (percentage < 0.01) {
    return `${percentage.toFixed(4)}%`;
  }
  return `${percentage.toFixed(2)}%`;
}
