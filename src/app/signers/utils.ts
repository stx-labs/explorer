import { SIGNER_KEY_MAP } from './consts';
import type { StakingSigner, StakingSignerStaker, StakingType } from './data/useStakingSigners';

export function getSignerKeyName(signerKey: string) {
  if (signerKey in SIGNER_KEY_MAP) {
    return SIGNER_KEY_MAP[signerKey].name;
  }
  return 'unknown';
}

export function isPox5Contract(poxContractId: string | undefined): boolean {
  return poxContractId?.split('.')[1] === 'pox-5';
}

export function getPoxContractFirstCycleId(
  contractVersions: { contract_id: string; first_reward_cycle_id: number }[] | undefined,
  contractName: string
): number | undefined {
  return contractVersions?.find(version => version.contract_id.split('.')[1] === contractName)
    ?.first_reward_cycle_id;
}

// Multiple signer-manager contracts can register the same signing key.
// Prototype-less object because keys are API-controlled.
export function buildSignerKeyToManagersMap(signers: StakingSigner[]): Record<string, string[]> {
  return signers.reduce<Record<string, string[]>>((acc, { signer, signer_key }) => {
    const key = signer_key.toLowerCase();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(signer);
    return acc;
  }, Object.create(null));
}

export function dedupeStakers(stakers: StakingSignerStaker[]): StakingSignerStaker[] {
  const typesByStaker = new Map<string, Set<StakingType>>();
  for (const { staker, types } of stakers) {
    const existing = typesByStaker.get(staker) ?? new Set<StakingType>();
    types.forEach(type => existing.add(type));
    typesByStaker.set(staker, existing);
  }
  return Array.from(typesByStaker.entries(), ([staker, types]) => ({
    staker,
    types: Array.from(types),
  }));
}

export interface StakerTypeCounts {
  total: number;
  stx: number;
  btc: number;
}

// A staker doing both stx and btc staking counts toward both type totals but
// only once toward the overall total
export function countStakerTypes(stakers: StakingSignerStaker[]): StakerTypeCounts {
  const deduped = dedupeStakers(stakers);
  return {
    total: deduped.length,
    stx: deduped.filter(({ types }) => types.includes('stx')).length,
    btc: deduped.filter(({ types }) => types.includes('btc')).length,
  };
}

export interface StakerCounts {
  total: number;
  split?: { stx: number; btc: number };
}

// When paging was capped the API totals are still exact, but the type split
// isn't known, and totals can't be deduped across managers sharing a key
export function computeStakerCounts(
  pages: { stakers: StakingSignerStaker[]; total: number }[]
): StakerCounts {
  const fullyEnumerated = pages.every(page => page.stakers.length >= page.total);
  if (fullyEnumerated) {
    const { total, stx, btc } = countStakerTypes(pages.flatMap(page => page.stakers));
    return { total, split: { stx, btc } };
  }
  return { total: pages.reduce((sum, page) => sum + page.total, 0) };
}

export function formatStakerTypeSplit(split: { stx: number; btc: number }): string {
  return `${split.stx} STX · ${split.btc} BTC`;
}
