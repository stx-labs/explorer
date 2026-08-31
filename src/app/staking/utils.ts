import { MICROSTACKS_IN_STACKS } from '@/common/utils/utils';

import { BOND_OFFERING_SATS, SATS_IN_BTC } from './consts';
import { Bond, BondStatus } from './data';

/** Parses an API amount string to BigInt, tolerating null/undefined/empty. */
export function toBigInt(value: string | undefined | null): bigint {
  if (!value) return BigInt(0);
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

export function satsToBtc(sats: bigint): number {
  return Number(sats) / SATS_IN_BTC;
}

export function microStxToStx(microStx: bigint): number {
  return Number(microStx) / MICROSTACKS_IN_STACKS;
}

/**
 * Bonds have no on-chain name. Index is always present, so it is the display
 * name until (and unless) marketing names land, at which point this becomes a
 * lookup like SIGNER_KEY_MAP in src/app/signers/consts.ts.
 */
export function getBondDisplayName(bond: Pick<Bond, 'index'>): string {
  return `Bond ${bond.index}`;
}

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  active: 'Active',
};

export function getBondStatusLabel(status: BondStatus): string {
  return STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * An upcoming bond is on-chain and has real parameters, but no balances yet, so
 * value columns should read as pending rather than as a hard zero.
 */
export function isBondPending(status: BondStatus): boolean {
  return status === 'upcoming';
}

export function formatBtc(sats: bigint, decimals = 4): string {
  const btc = satsToBtc(sats);
  if (btc === 0) return '0 BTC';
  if (btc < 0.0001) return `<0.0001 BTC`;
  return `${btc.toLocaleString(undefined, { maximumFractionDigits: decimals })} BTC`;
}

export function formatStx(microStx: bigint): string {
  const stx = microStxToStx(microStx);
  return `${stx.toLocaleString(undefined, { maximumFractionDigits: 2 })} STX`;
}

/**
 * A dollar figure short enough to sit beside the number it describes.
 *
 * Uses compact notation so large sums read as "$106M" rather than nine digits.
 * The shared `abbreviateNumber` stops at millions and has no thousands case, so
 * a page-local formatter beats widening a util the rest of the app relies on.
 */
export function formatUsd(amount: number): string {
  if (!Number.isFinite(amount)) return '-';
  return (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    })
      .format(amount)
      // Compact notation keeps a trailing ".0", so "$106.0M" needs trimming.
      .replace(/\.0(?=[KMBT]?$)/, '')
  );
}

export function formatPercent(ratio: number | undefined, decimals = 1): string {
  if (ratio === undefined || !Number.isFinite(ratio)) return '-';
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/** Aggregates the headline totals across every bond on the page. */
export function aggregateBondTotals(bonds: Bond[]) {
  return bonds.reduce(
    (acc, bond) => {
      acc.lockedSats += toBigInt(bond.balances?.locked?.btc);
      acc.lockedMicroStx += toBigInt(bond.balances?.locked?.stx);
      acc.paidOutSats += toBigInt(bond.balances?.paid_out?.btc);
      acc.capacitySats += toBigInt(bond.parameters?.btc_capacity);
      return acc;
    },
    {
      lockedSats: BigInt(0),
      lockedMicroStx: BigInt(0),
      paidOutSats: BigInt(0),
      capacitySats: BigInt(0),
    }
  );
}

/**
 * Bond payouts are made in sBTC rather than BTC directly, so they are labelled
 * that way. Same units as sats, only the name differs.
 */
export function formatSbtc(sats: bigint, decimals = 4): string {
  return formatBtc(sats, decimals).replace('BTC', 'sBTC');
}

/**
 * What a bond's fill is measured against.
 *
 * The meter measures the offering, which is the Endowment's figure and is not
 * on chain. Where no offering is known, fall back to on-chain capacity so the
 * meter still means something rather than disappearing.
 */
export function getBondOfferingSats(bond: Pick<Bond, 'index' | 'parameters'>): {
  sats: bigint;
  isOffering: boolean;
} {
  const offering = BOND_OFFERING_SATS[bond.index];
  if (offering) return { sats: toBigInt(offering), isOffering: true };
  return { sats: toBigInt(bond.parameters?.btc_capacity), isOffering: false };
}

/**
 * A date carrying its year, for rows that span more than one.
 *
 * Cycle history reaches back far enough that "10 Sep" alone is ambiguous.
 */
export function formatDateWithYear(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
