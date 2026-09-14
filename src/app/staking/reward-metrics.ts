import { DISTRIBUTIONS_PER_BOND } from './consts';
import type { Bond, BondRewards } from './data';

export interface RealizedBondRate {
  percent?: number;
  note: string;
}

export function projectCycleRewards(
  rewardsSoFarSats: bigint,
  elapsedBlocks: number,
  cycleLength: number
): bigint | undefined {
  if (
    rewardsSoFarSats < BigInt(0) ||
    !Number.isSafeInteger(elapsedBlocks) ||
    !Number.isSafeInteger(cycleLength) ||
    elapsedBlocks <= 0 ||
    cycleLength <= 0 ||
    elapsedBlocks > cycleLength
  )
    return undefined;
  return (rewardsSoFarSats * BigInt(cycleLength)) / BigInt(elapsedBlocks);
}

export function getRealizedBondRate(
  bond: Bond,
  currentBurnHeight: number,
  settlements?: BondRewards['settlementsByBond'][number]
): RealizedBondRate {
  const start = bond.schedule.activation.bitcoin_height;
  const end = bond.schedule.unlock.bitcoin_height;
  if (currentBurnHeight < end) {
    return {
      note: 'A realized rate is final after the bond term and its final reward calculation.',
    };
  }
  const incomplete = {
    note: 'Complete reward and eligible-principal history for all 24 intervals is not yet available.',
  };
  const cadence = (end - start) / DISTRIBUTIONS_PER_BOND;
  if (!settlements || cadence <= 0 || !Number.isInteger(cadence)) return incomplete;
  const slots = new Map<number, (typeof settlements)[number]>();
  for (const entry of settlements) {
    const ordinal = (entry.calculationHeight + 1 - start) / cadence;
    if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > DISTRIBUTIONS_PER_BOND)
      return incomplete;
    const previous = slots.get(ordinal);
    if (
      previous &&
      (previous.principalSats !== entry.principalSats ||
        previous.rewardedSats !== entry.rewardedSats)
    )
      return incomplete;
    slots.set(ordinal, entry);
  }
  if (slots.size !== DISTRIBUTIONS_PER_BOND) return incomplete;
  let principal = BigInt(0);
  let rewards = BigInt(0);
  for (const entry of Array.from(slots.values())) {
    if (
      entry.principalSats === undefined ||
      entry.rewardedSats === undefined ||
      entry.principalSats < BigInt(0) ||
      entry.rewardedSats < BigInt(0) ||
      (entry.principalSats === BigInt(0) && entry.rewardedSats > BigInt(0))
    )
      return incomplete;
    principal += entry.principalSats;
    rewards += entry.rewardedSats;
  }
  if (principal === BigInt(0))
    return { note: 'No eligible BTC principal was recorded for this bond.' };
  return {
    percent: (100 * 50 * Number(rewards)) / Number(principal),
    note: 'Annualized credited rewards weighted by the BTC eligible in each interval, using the protocol’s 50-interval year. Later withdrawals do not change this rate. Onward payment is separate.',
  };
}

export function estimatePendingStackerRewards(
  newRewardsSats: bigint,
  stakedMicroStx: bigint,
  bonds: { principalSats: bigint; targetRateBps: bigint }[]
): bigint {
  if (
    newRewardsSats < BigInt(0) ||
    stakedMicroStx < BigInt(0) ||
    bonds.some(bond => bond.principalSats < BigInt(0) || bond.targetRateBps < BigInt(0))
  ) {
    throw new Error('Invalid reward estimate inputs');
  }
  if (stakedMicroStx === BigInt(0)) return BigInt(0);
  const bondTargets = bonds.reduce(
    (sum, bond) => sum + (bond.principalSats * bond.targetRateBps) / BigInt(10000) / BigInt(50),
    BigInt(0)
  );
  const residual = newRewardsSats > bondTargets ? newRewardsSats - bondTargets : BigInt(0);
  // Match the contract's floor on the reserve cut, not on the remaining 85%.
  return residual - (residual * BigInt(1500)) / BigInt(10000);
}
