'use client';

import { FIXED_STX_USD } from '../constants/constants';

const stxPriceQueryResult = {
  data: FIXED_STX_USD,
  isLoading: false,
  error: null,
} as const;

export const useStxPrice = (_blockBurnTime?: string, _options?: unknown) => stxPriceQueryResult;
