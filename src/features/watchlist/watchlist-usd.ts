import { microToStacks } from '@/common/utils/utils';
import { STX_PRICE_USD } from '@/lib/crypto-prices.config';

export const WATCHLIST_STX_USD_PRICE = STX_PRICE_USD;

/** $X.XX from micro-STX string and STX/USD rate (defaults to fixed explorer rate). */
export function formatWatchlistUsdFromMicroStx(
  microStx: string,
  stxUsd: number = STX_PRICE_USD
): string {
  const stx = microToStacks(microStx || '0');
  const usd = stx * stxUsd;
  return `$${usd.toFixed(2)}`;
}
