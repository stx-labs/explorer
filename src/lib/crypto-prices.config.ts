/**
 * Explorer-wide fixed crypto/USD rates (no live feeds).
 * Single source of truth for SSR `getTokenPrice`, client fallbacks, and watchlist USD.
 */
export const STX_PRICE_USD = 0.23;
export const BTC_PRICE_USD = 78_052.03;

export const CRYPTO_PRICES_SOURCE = 'constant' as const;
