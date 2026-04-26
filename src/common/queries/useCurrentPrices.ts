'use client';

import { STX_PRICE_USD } from '@/lib/crypto-prices.config';

const stxPriceQueryResult = {
  data: STX_PRICE_USD,
  isLoading: false,
  error: null,
} as const;

export const useStxPrice = (_blockBurnTime?: string, _options?: unknown) => stxPriceQueryResult;
