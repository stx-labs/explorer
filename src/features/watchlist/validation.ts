import { validateStacksAddress, validateStacksContractId } from '@/common/utils/utils';

/** Standard or contract principal (mainnet/testnet c32). */
export function validateWatchlistPrincipal(principal: string): boolean {
  if (!principal?.trim()) return false;
  return validateStacksAddress(principal) || validateStacksContractId(principal);
}
