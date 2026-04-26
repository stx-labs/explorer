'use client';

import { STX_PRICE_USD } from '@/lib/crypto-prices.config';

/** Fixed STX/USD for display (no external price API). */
export function useEffectiveStxUsdPrice(): number {
  return STX_PRICE_USD;
}
