import type { BondStateTone } from './BondStateBadge';
import type { Bond, BondRewards, BondStatus } from './data';
import { bpsToPercent } from './projections';
import { RealizedBondRate, getRealizedBondRate } from './reward-metrics';
import { bondLabel, formatBurnDate, getBondStatusLabel, isBondPending, toBigInt } from './utils';

export function getBondStateTone(status: BondStatus): BondStateTone {
  switch (status) {
    case 'active':
      return 'active';
    case 'upcoming':
    case 'awaitingActivation':
      return 'pending';
    case 'enrolling':
      return 'enrolling';
    case 'mature':
    case 'maturity':
      return 'maturity';
    case 'unlocked':
    case 'complete':
    case 'closed':
      return 'closed';
    default:
      return 'neutral';
  }
}

export interface BondRow {
  index: number;
  name: string;
  status: string;
  statusTone: BondStateTone;
  isPending: boolean;
  activationHeight: number;
  activationCycle: number;
  unlockHeight: number;
  unlockCycle: number;
  capacitySats?: bigint;
  lockedSats?: bigint;
  rewardedSats?: bigint;
  targetRatePercent: number;
  realizedRate: RealizedBondRate;
  registeredCount: number;
  allowedCount: number;
  activationDate: string;
  unlockDate: string;
}

export function toBondRow(
  bond: Bond,
  currentBurnHeight: number,
  nowMs: number,
  rewardsByBond?: Record<number, bigint>,
  burnBlockTimes: Record<number, number> = {},
  settlementsByBond?: BondRewards['settlementsByBond']
): BondRow {
  const capacitySats = toBigInt(bond.parameters?.btc_capacity);
  const lockedSats = toBigInt(bond.balances?.locked?.btc);
  const activationHeight = bond.schedule?.activation?.bitcoin_height ?? 0;
  const unlockHeight = bond.schedule?.unlock?.bitcoin_height ?? 0;
  const rewardedSats = rewardsByBond ? (rewardsByBond[bond.index] ?? BigInt(0)) : undefined;
  return {
    activationDate: formatBurnDate(activationHeight, currentBurnHeight, nowMs, burnBlockTimes),
    unlockDate: formatBurnDate(unlockHeight, currentBurnHeight, nowMs, burnBlockTimes),
    index: bond.index,
    name: bondLabel(bond.index),
    status: getBondStatusLabel(bond.status),
    statusTone: getBondStateTone(bond.status),
    isPending: isBondPending(bond.status),
    activationHeight,
    activationCycle: bond.schedule?.activation?.pox_cycle ?? 0,
    unlockHeight,
    unlockCycle: bond.schedule?.unlock?.pox_cycle ?? 0,
    capacitySats,
    lockedSats,
    rewardedSats,
    realizedRate: getRealizedBondRate(bond, currentBurnHeight, settlementsByBond?.[bond.index]),
    targetRatePercent: bpsToPercent(bond.parameters?.target_rate_bps ?? 0),
    registeredCount: bond.registrations?.registered_count ?? 0,
    allowedCount: bond.registrations?.allowed_count ?? 0,
  };
}
