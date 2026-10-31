import { BigNumber } from 'bignumber.js';

/**
 * Whether `amountInStx` is more than the balance, which the API reports in microstacks.
 * Floors to whole microstacks first, as `stacksToMicro` does for the amount that is sent.
 */
export function exceedsStxBalance(
  amountInStx: string | number | null,
  balanceInMicroStx: string | undefined
): boolean {
  return new BigNumber(amountInStx || 0)
    .shiftedBy(6)
    .integerValue(BigNumber.ROUND_FLOOR)
    .isGreaterThan(balanceInMicroStx || 0);
}
