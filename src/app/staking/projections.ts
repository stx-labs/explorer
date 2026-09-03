import { MICROSTACKS_IN_STACKS } from '@/common/utils/utils';

import {
  BOND_GAP_CYCLES,
  BOND_TERM_CYCLES,
  DISTRIBUTIONS_PER_BOND,
  MINUTES_PER_BLOCK,
  RESERVE_RATIO_PERCENT,
  REWARDS_PRECISION,
  SATS_IN_BTC,
} from './consts';

export function burnHeightToApproximateTimestamp(
  targetBurnHeight: number,
  currentBurnHeight: number,
  nowMs: number
): number {
  const blockDelta = targetBurnHeight - currentBurnHeight;
  return nowMs + blockDelta * MINUTES_PER_BLOCK * 60 * 1000;
}

export function approximateBurnHeightAt(
  timestampMs: number,
  currentBurnHeight: number,
  nowMs: number
): number {
  const minutesDelta = (timestampMs - nowMs) / (60 * 1000);
  return Math.round(currentBurnHeight + minutesDelta / MINUTES_PER_BLOCK);
}

export function burnHeightToRewardCycle(
  burnHeight: number,
  firstBurnchainBlockHeight: number,
  rewardCycleLength: number
): number | undefined {
  if (!rewardCycleLength) return undefined;
  return Math.floor((burnHeight - firstBurnchainBlockHeight) / rewardCycleLength);
}

export function getDistributionCadence(rewardCycleLength: number): number {
  return Math.floor(rewardCycleLength / 2);
}

export function bpsToPercent(bps: number): number {
  return bps / 100;
}

const MINUTES_IN_YEAR = 365 * 24 * 60;

export function getCycleRewardsPerStx(rewardsPerMicroStx: bigint): number {
  return (Number(rewardsPerMicroStx) * MICROSTACKS_IN_STACKS) / Number(REWARDS_PRECISION);
}

export function getCyclesPerYear(rewardCycleLength: number): number {
  const minutesPerCycle = rewardCycleLength * MINUTES_PER_BLOCK;
  return MINUTES_IN_YEAR / minutesPerCycle;
}

export function isCycleLengthPlausible(rewardCycleLength: number): boolean {
  const MINUTES_IN_DAY = 24 * 60;
  return rewardCycleLength * MINUTES_PER_BLOCK >= MINUTES_IN_DAY;
}

export interface StackingYield {
  satsPerStxPerCycle: number;
  satsPerStxPerYear: number;
  apyPercent: number | undefined;
}

export function getStackingYieldForCompletedCycle({
  rewardsPerMicroStx,
  rewardCycleLength,
  btcPriceUsd,
  stxPriceUsd,
}: {
  rewardsPerMicroStx: bigint;
  rewardCycleLength: number;
  btcPriceUsd?: number;
  stxPriceUsd?: number;
}): StackingYield {
  const satsPerStxPerCycle = getCycleRewardsPerStx(rewardsPerMicroStx);
  const satsPerStxPerYear = satsPerStxPerCycle * getCyclesPerYear(rewardCycleLength);

  if (!isCycleLengthPlausible(rewardCycleLength)) {
    return { satsPerStxPerCycle, satsPerStxPerYear, apyPercent: undefined };
  }

  if (!btcPriceUsd || !stxPriceUsd) {
    return { satsPerStxPerCycle, satsPerStxPerYear, apyPercent: undefined };
  }

  const usdRewardedPerStxPerYear = (satsPerStxPerYear / SATS_IN_BTC) * btcPriceUsd;
  const aprRatio = usdRewardedPerStxPerYear / stxPriceUsd;
  const cyclesPerYear = getCyclesPerYear(rewardCycleLength);
  return {
    satsPerStxPerCycle,
    satsPerStxPerYear,
    apyPercent: (Math.pow(1 + aprRatio / cyclesPerYear, cyclesPerYear) - 1) * 100,
  };
}

export function getCycleStackerRewardsSatsBigInt(
  rewardsPerMicroStx: bigint,
  stakedMicroStx: bigint
): bigint {
  if (stakedMicroStx <= BigInt(0)) return BigInt(0);
  return (rewardsPerMicroStx * stakedMicroStx) / REWARDS_PRECISION;
}

export function applyStackingRewardWaterfall(
  grossRewardsSats: bigint,
  bondRewardsSats: bigint
): bigint {
  const afterBonds =
    grossRewardsSats > bondRewardsSats ? grossRewardsSats - bondRewardsSats : BigInt(0);
  return (afterBonds * BigInt(100 - RESERVE_RATIO_PERCENT)) / BigInt(100);
}

export type BondTimelineState = 'complete' | 'active' | 'upcoming';

export function getBondTimelineState(
  activationHeight: number,
  unlockHeight: number,
  currentBurnHeight: number
): BondTimelineState {
  if (unlockHeight > 0 && currentBurnHeight >= unlockHeight) return 'complete';
  if (activationHeight > 0 && currentBurnHeight >= activationHeight) return 'active';
  return 'upcoming';
}

export function getBarPosition(
  startMs: number,
  endMs: number,
  boundsStartMs: number,
  boundsEndMs: number
): { leftPercent: number; widthPercent: number } {
  const span = boundsEndMs - boundsStartMs;
  if (span <= 0) return { leftPercent: 0, widthPercent: 0 };
  const clamp = (value: number) => Math.min(Math.max(value, 0), 100);
  const leftPercent = clamp(((startMs - boundsStartMs) / span) * 100);
  const rightPercent = clamp(((endMs - boundsStartMs) / span) * 100);
  return { leftPercent, widthPercent: Math.max(rightPercent - leftPercent, 0) };
}

export type TimelineGranularity = 'day' | 'month';

const MAX_DAYS_FOR_DAY_AXIS = 21;

function getTimelineGranularity(spanMs: number): TimelineGranularity {
  const days = spanMs / (24 * 60 * 60 * 1000);
  return days <= MAX_DAYS_FOR_DAY_AXIS ? 'day' : 'month';
}

export function getTimelineBounds(
  bars: { startMs: number; endMs: number }[],
  nowMs: number
): { startMs: number; endMs: number; granularity: TimelineGranularity } {
  const times = bars.flatMap(bar => [bar.startMs, bar.endMs]).filter(Boolean);
  const earliest = Math.min(nowMs, ...(times.length ? times : [nowMs]));
  const latest = Math.max(nowMs, ...(times.length ? times : [nowMs]));

  const granularity = getTimelineGranularity(latest - earliest);
  const start = new Date(earliest);
  const end = new Date(latest);

  if (granularity === 'day') {
    return {
      startMs: Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
      endMs: Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1),
      granularity,
    };
  }

  return {
    startMs: Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
    endMs: Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1),
    granularity,
  };
}

export interface TimelineTick {
  label: string;
  isYearStart: boolean;
  year: number;
  leftPercent: number;
}

export function getTimelineTicks(
  startMs: number,
  endMs: number,
  granularity: TimelineGranularity
): TimelineTick[] {
  const span = endMs - startMs;
  if (span <= 0) return [];

  const MAX_TICKS = 8;
  const start = new Date(startMs);
  const divisions: number[] = [];
  for (let i = 0; i < 400; i++) {
    const tickMs =
      granularity === 'day'
        ? Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i)
        : Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1);
    if (tickMs >= endMs) break;
    divisions.push(tickMs);
  }

  const step = Math.max(1, Math.ceil(divisions.length / MAX_TICKS));
  return divisions
    .filter((_, index) => index % step === 0)
    .map(tickMs => {
      const date = new Date(tickMs);
      return {
        label:
          granularity === 'day'
            ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
            : date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        isYearStart: date.getUTCMonth() === 0 && date.getUTCDate() === 1,
        year: date.getUTCFullYear(),
        leftPercent: ((tickMs - startMs) / span) * 100,
      };
    });
}

export function getFeaturedBondIndex(
  bonds: { index: number; status: string }[]
): number | undefined {
  const byNewest = [...bonds].sort((a, b) => b.index - a.index);
  const running = byNewest.find(bond => bond.status === 'active');
  if (running) return running.index;
  return [...byNewest].reverse().find(bond => bond.status === 'upcoming')?.index;
}

export function formatTermDuration(blocks: number): string {
  if (blocks <= 0) return '';
  const minutes = blocks * MINUTES_PER_BLOCK;
  const hours = minutes / 60;
  const days = hours / 24;
  const plural = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'}`;
  if (days < 1) return plural(Math.max(Math.round(hours), 1), 'hour');
  if (days < 60) return plural(Math.round(days), 'day');
  return plural(Math.round(days / 30.44), 'month');
}

export function formatTimeRemaining(blocks: number): string {
  if (blocks <= 0) return '';
  const minutes = blocks * MINUTES_PER_BLOCK;
  const plural = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'}`;
  if (minutes < 90) return `${Math.max(Math.round(minutes), 1)} min`;
  const hours = minutes / 60;
  if (hours < 48) return plural(Math.round(hours), 'hour');
  return plural(Math.round(hours / 24), 'day');
}

export type BondLifecycleState = 'scheduled' | 'enrolling' | 'active' | 'maturity' | 'closed';

export interface BondSchedule {
  enrollmentOpensHeight: number;
  enrollmentClosesHeight: number;
  activationHeight: number;
  l1UnlockHeight: number;
  termEndHeight: number;
}

export function getBondSchedule(
  activationHeight: number,
  termEndHeight: number,
  rewardCycleLength: number,
  prepareCycleLength: number
): BondSchedule {
  return {
    enrollmentOpensHeight: activationHeight - BOND_GAP_CYCLES * rewardCycleLength,
    enrollmentClosesHeight: activationHeight - prepareCycleLength,
    activationHeight,
    l1UnlockHeight: termEndHeight - getDistributionCadence(rewardCycleLength),
    termEndHeight,
  };
}

export function getBondLifecycleState(
  schedule: BondSchedule,
  currentBurnHeight: number,
  existsOnChain: boolean
): BondLifecycleState {
  if (!existsOnChain) return 'scheduled';
  if (currentBurnHeight >= schedule.termEndHeight) return 'closed';
  if (currentBurnHeight >= schedule.l1UnlockHeight) return 'maturity';
  if (currentBurnHeight >= schedule.activationHeight) return 'active';
  if (currentBurnHeight >= schedule.enrollmentOpensHeight) return 'enrolling';
  return 'scheduled';
}

export interface BondProgress {
  paid: number;
  total: number;
  dayOfTerm: number;
  termDays: number;
  elapsedRatio: number;
}

export function getBondProgress(
  schedule: BondSchedule,
  currentBurnHeight: number,
  rewardCycleLength: number
): BondProgress {
  const cadence = getDistributionCadence(rewardCycleLength);
  const blocksElapsed = Math.max(currentBurnHeight - schedule.activationHeight, 0);
  const termBlocks = Math.max(schedule.termEndHeight - schedule.activationHeight, 1);
  const minutesPerDay = 24 * 60;
  return {
    paid: Math.min(Math.floor(blocksElapsed / cadence), DISTRIBUTIONS_PER_BOND),
    total: DISTRIBUTIONS_PER_BOND,
    dayOfTerm: Math.floor((blocksElapsed * MINUTES_PER_BLOCK) / minutesPerDay),
    termDays: Math.round((termBlocks * MINUTES_PER_BLOCK) / minutesPerDay),
    elapsedRatio: Math.min(blocksElapsed / termBlocks, 1),
  };
}

export function getRealizedRatePercent(
  paidSats: bigint,
  bondedSats: bigint,
  termBlocks: number,
  rewardCycleLength: number
): number | undefined {
  if (bondedSats <= BigInt(0) || termBlocks <= 0) return undefined;
  if (!isCycleLengthPlausible(rewardCycleLength)) return undefined;
  const cyclesInTerm = termBlocks / rewardCycleLength;
  const yearsInTerm = cyclesInTerm / getCyclesPerYear(rewardCycleLength);
  if (yearsInTerm <= 0) return undefined;
  return (Number(paidSats) / Number(bondedSats) / yearsInTerm) * 100;
}

export function projectScheduledBonds(
  latestKnownIndex: number,
  latestKnownActivationHeight: number,
  rewardCycleLength: number,
  count: number
): { index: number; activationHeight: number; termEndHeight: number }[] {
  const gapBlocks = BOND_GAP_CYCLES * rewardCycleLength;
  const termBlocks = BOND_TERM_CYCLES * rewardCycleLength;
  return Array.from({ length: Math.max(count, 0) }, (_, offset) => {
    const index = latestKnownIndex + offset + 1;
    const activationHeight = latestKnownActivationHeight + gapBlocks * (offset + 1);
    return { index, activationHeight, termEndHeight: activationHeight + termBlocks };
  });
}

export interface DistributionGridCell {
  index: number;
  leftPercent: number;
  widthPercent: number;
}

export function getDistributionGridCells({
  startMs,
  endMs,
  cadence,
  firstBurnchainBlockHeight,
  currentBurnHeight,
  nowMs,
  maxCells = 500,
}: {
  startMs: number;
  endMs: number;
  cadence: number;
  firstBurnchainBlockHeight: number;
  currentBurnHeight: number;
  nowMs: number;
  maxCells?: number;
}): DistributionGridCell[] {
  if (cadence <= 0 || endMs <= startMs) return [];
  const cells: DistributionGridCell[] = [];
  const startHeight = approximateBurnHeightAt(startMs, currentBurnHeight, nowMs);
  let index = Math.floor((startHeight - firstBurnchainBlockHeight) / cadence);
  while (cells.length < maxCells) {
    const cellStartHeight = firstBurnchainBlockHeight + index * cadence;
    const cellStartMs = burnHeightToApproximateTimestamp(cellStartHeight, currentBurnHeight, nowMs);
    if (cellStartMs >= endMs) break;
    const cellEndMs = burnHeightToApproximateTimestamp(
      cellStartHeight + cadence,
      currentBurnHeight,
      nowMs
    );
    const position = getBarPosition(
      Math.max(cellStartMs, startMs),
      Math.min(cellEndMs, endMs),
      startMs,
      endMs
    );
    if (position.widthPercent > 0) cells.push({ index, ...position });
    index += 1;
  }
  return cells;
}
