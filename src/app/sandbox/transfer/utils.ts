import { BigNumber } from 'bignumber.js';

/** Whether `amountInStx` is more than the balance, which the API reports in microstacks. */
export function exceedsStxBalance(
  amountInStx: string | number | null,
  balanceInMicroStx: string | undefined
): boolean {
  return new BigNumber(amountInStx || 0).shiftedBy(6).isGreaterThan(balanceInMicroStx || 0);
}
