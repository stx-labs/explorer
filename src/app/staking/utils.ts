import { MICROSTACKS_IN_STACKS } from '@/common/utils/utils';

import { GENESIS_BOND_INDEX, SATS_IN_BTC } from './consts';
import type { BondStatus } from './data';
import { bpsToPercent } from './projections';

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

export function bondLabel(index: number): string {
  return index === GENESIS_BOND_INDEX ? 'Genesis' : `Bond ${index}`;
}

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  active: 'Active',
};

export function getBondStatusLabel(status: BondStatus): string {
  return STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

export function isBondPending(status: BondStatus): boolean {
  return status === 'upcoming';
}

export function formatBtc(sats: bigint, decimals = 4): string {
  const btc = satsToBtc(sats);
  if (btc === 0) return '0 BTC';
  if (btc < 0.0001) return `<0.0001 BTC`;
  const maximumFractionDigits = btc < 1 ? Math.max(decimals, 4) : decimals;
  return `${btc.toLocaleString(undefined, { maximumFractionDigits })} BTC`;
}

export function formatStx(microStx: bigint, decimals = 2): string {
  const stx = microStxToStx(microStx);
  return `${stx.toLocaleString(undefined, { maximumFractionDigits: decimals })} STX`;
}

export function formatRatePercent(bps: number, decimals = 2): string {
  return `${bpsToPercent(bps).toFixed(decimals)}%`;
}

export function formatUsd(amount: number): string {
  if (!Number.isFinite(amount)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatSbtc(sats: bigint, decimals = 4): string {
  return formatBtc(sats, decimals).replace('BTC', 'sBTC');
}

export function formatDateWithYear(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
