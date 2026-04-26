import { BTC_PRICE_USD, STX_PRICE_USD } from '@/lib/crypto-prices.config';

import { TokenPrice } from '../common/types/tokenPrice';

/** Fixed token prices for layout/SSR (no external API calls). */
export async function getTokenPrice(): Promise<TokenPrice> {
  return {
    btcPrice: BTC_PRICE_USD,
    stxPrice: STX_PRICE_USD,
  };
}
