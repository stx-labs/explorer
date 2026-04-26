import BigNumber from 'bignumber.js';

import { microToStacks } from '@/common/utils/utils';

import type { PortfolioSummary } from './types';

export function sumMicroStxStrings(balances: (string | undefined)[]): string {
  return balances
    .reduce((acc, b) => acc.plus(b || '0'), new BigNumber(0))
    .integerValue(BigNumber.ROUND_FLOOR)
    .toFixed(0);
}

export function buildPortfolioSummary(
  microStxTotal: string,
  stxPrice: number,
  addressesCount: number,
  lastUpdated: number
): PortfolioSummary {
  const totalStxNum = microToStacks(microStxTotal || '0');
  return {
    totalStx: microStxTotal || '0',
    totalUsd: stxPrice > 0 ? totalStxNum * stxPrice : 0,
    addressesCount,
    lastUpdated,
  };
}
