'use client';

import { BTC_PRICE_USD, CRYPTO_PRICES_SOURCE, STX_PRICE_USD } from '@/lib/crypto-prices.config';

/** Fixed STX/BTC USD rates aligned with {@link getTokenPrice} / global context. */
export function useCryptoPrices() {
  return {
    stx: STX_PRICE_USD,
    btc: BTC_PRICE_USD,
    source: CRYPTO_PRICES_SOURCE,
  } as const;
}
