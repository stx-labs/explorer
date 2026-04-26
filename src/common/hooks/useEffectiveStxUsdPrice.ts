'use client';

import { FIXED_STX_USD } from '@/common/constants/constants';

/** Fixed STX/USD for display (no external price API). */
export function useEffectiveStxUsdPrice(): number {
  return FIXED_STX_USD;
}
