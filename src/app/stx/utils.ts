import { STX_DECIMALS } from './consts';

/**
 * stx_supply returns supply in whole STX; convert to micro-STX (raw) so the
 * shared decimal-adjusting components divide it back by 10^STX_DECIMALS.
 */
export function stxToMicro(stx: string | undefined): number | undefined {
  if (!stx) return undefined;
  const parsed = parseFloat(stx);
  return Number.isFinite(parsed) ? Math.round(parsed * 10 ** STX_DECIMALS) : undefined;
}
