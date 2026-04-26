import { FIXED_STX_USD } from '@/common/constants/constants';
import { microToStacks } from '@/common/utils/utils';

export const WATCHLIST_STX_USD_PRICE = FIXED_STX_USD;

/** $X.XX from micro-STX string and STX/USD rate (defaults to fixed explorer rate). */
export function formatWatchlistUsdFromMicroStx(
  microStx: string,
  stxUsd: number = FIXED_STX_USD
): string {
  const stx = microToStacks(microStx || '0');
  const usd = stx * stxUsd;
  return `$${usd.toFixed(2)}`;
}
