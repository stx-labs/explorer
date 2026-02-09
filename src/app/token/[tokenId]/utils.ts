import { validateStacksContractId } from '@/common/utils/utils';

import { RISKY_NFT_RULES } from './consts';

/**
 * Checks if a contract name matches any of the risky NFT patterns
 * @param contractName The contract name to check
 * @returns True if the contract name matches any risky pattern, false otherwise
 */
export function isRiskyNFTContract(contractName: string): boolean {
  if (!contractName || !validateStacksContractId(contractName)) return false;

  return RISKY_NFT_RULES.some(rule => rule.test(contractName));
}
