/**
 * Derived bond + cycle math for the staking page.
 *
 * Everything here is a pure function of on-chain data plus one documented
 * assumption (block -> date). It is deliberately isolated so that when the
 * canonical numbers service lands, this module can be swapped for API reads
 * without touching any UI. See docs/workplans/2822-bitcoin-staking-page.md.
 */
import {
  BOND_GAP_CYCLES,
  BOND_TERM_CYCLES as BOND_LENGTH_CYCLES,
  DISTRIBUTIONS_PER_BOND,
  MINUTES_PER_BLOCK,
  SATS_IN_BTC,
} from './consts';

/**
 * The single estimate in this module. Every date we render is a projection at
 * `MINUTES_PER_BLOCK` per Bitcoin block.
 *
 * On Bitcoin this is not a rough guess. The difficulty adjustment retargets
 * every 2,016 blocks specifically to hold the average at ten minutes, so the
 * assumption is actively defended by the protocol and any drift is corrected.
 * Short samples are misleading here: an hour of blocks can average well away
 * from ten minutes while a multi-week window sits within a percent of it. Do
 * not "correct" this constant from a small sample.
 *
 * It is also what the pox-5 reward maths is calibrated against: a distribution
 * lands every `rewardCycleLength / 2` blocks, and the contract divides the
 * annual target rate by 50, which is the number of such periods in a 365-day
 * year only if a block takes ten minutes. The Explorer already assumes the same
 * elsewhere (`NUM_TEN_MINUTES_IN_DAY` in src/app/data.ts).
 *
 * Test networks do not difficulty-adjust and run far faster, which is what
 * `isCycleLengthPlausible` guards against.
 *
 * Exposed so the UI can disclose the method, mirroring the `projection_method`
 * field the numbers-service proposal specifies.
 */
export const PROJECTION_METHOD = '10min_per_block' as const;

/** Projects a wall-clock timestamp (ms) for a burn height we have not reached yet. */
export function burnHeightToApproximateTimestamp(
  targetBurnHeight: number,
  currentBurnHeight: number,
  nowMs: number
): number {
  const blockDelta = targetBurnHeight - currentBurnHeight;
  return nowMs + blockDelta * MINUTES_PER_BLOCK * 60 * 1000;
}

/**
 * The burn height a moment falls on, inverting the projection above so a
 * position on the timeline can name the block under the cursor.
 */
export function approximateBurnHeightAt(
  timestampMs: number,
  currentBurnHeight: number,
  nowMs: number
): number {
  const minutesDelta = (timestampMs - nowMs) / (60 * 1000);
  return Math.round(currentBurnHeight + minutesDelta / MINUTES_PER_BLOCK);
}

/**
 * The reward cycle a burn height belongs to. Cycles are fixed-length and
 * anchored to the chain's first burnchain block, so this is arithmetic.
 */
export function burnHeightToRewardCycle(
  burnHeight: number,
  firstBurnchainBlockHeight: number,
  rewardCycleLength: number
): number | undefined {
  if (!rewardCycleLength) return undefined;
  return Math.floor((burnHeight - firstBurnchainBlockHeight) / rewardCycleLength);
}

/**
 * Bond reward distributions land on a global grid anchored to the chain's first
 * burnchain block, NOT to a bond's activation height. Every bond pays on the
 * same schedule. From pox-5.clar:
 *
 *   (define-read-only (distribution-cycle-to-burn-height (cycle uint))
 *       (+ (var-get first-burnchain-block-height)
 *           (* cycle (/ (var-get pox-reward-cycle-length) u2))))
 *
 * The cadence must be read from /v2/pox, never hardcoded: mainnet
 * `reward_cycle_length` is 2100 (so 1050) but testnet is 900 (so 450).
 */
export function getDistributionCadence(rewardCycleLength: number): number {
  return Math.floor(rewardCycleLength / 2);
}

export function burnHeightToDistributionIndex(
  burnHeight: number,
  firstBurnchainBlockHeight: number,
  cadence: number
): number {
  return Math.floor((burnHeight - firstBurnchainBlockHeight) / cadence);
}

export function distributionIndexToBurnHeight(
  index: number,
  firstBurnchainBlockHeight: number,
  cadence: number
): number {
  return firstBurnchainBlockHeight + index * cadence;
}

export interface DistributionSchedule {
  latestHeight: number;
  /** Projected wall-clock time (ms) of the most recent distribution. */
  latestApproximateTimestamp: number;
  nextHeight: number;
  /** Projected wall-clock time (ms) of the next distribution. */
  nextApproximateTimestamp: number;
  blocksUntilNext: number;
  projectionMethod: typeof PROJECTION_METHOD;
}

/**
 * The most recent distribution boundary that has passed, and the next one due.
 * This is a page-level value, not a per-bond column, because the grid is global.
 */
export function getDistributionSchedule(
  currentBurnHeight: number,
  firstBurnchainBlockHeight: number,
  rewardCycleLength: number,
  nowMs: number
): DistributionSchedule {
  const cadence = getDistributionCadence(rewardCycleLength);
  const index = burnHeightToDistributionIndex(
    currentBurnHeight,
    firstBurnchainBlockHeight,
    cadence
  );
  const latestHeight = distributionIndexToBurnHeight(index, firstBurnchainBlockHeight, cadence);
  const nextHeight = distributionIndexToBurnHeight(index + 1, firstBurnchainBlockHeight, cadence);
  return {
    latestHeight,
    latestApproximateTimestamp: burnHeightToApproximateTimestamp(
      latestHeight,
      currentBurnHeight,
      nowMs
    ),
    nextHeight,
    nextApproximateTimestamp: burnHeightToApproximateTimestamp(
      nextHeight,
      currentBurnHeight,
      nowMs
    ),
    blocksUntilNext: nextHeight - currentBurnHeight,
    projectionMethod: PROJECTION_METHOD,
  };
}

/**
 * Sats a bond targets per distribution. Mirrors `target-yield` in pox-5.clar:
 *
 *   (/ (/ (* total-sats (get target-rate bond)) u10000) u50)
 *
 * The u10000 converts basis points; the u50 annualises (there are ~50 cadence
 * periods in a year at 10 min/block). Integer division matches the contract.
 */
export function getTargetPayoutPerDistributionSats(
  totalStakedSats: bigint,
  targetRateBps: number
): bigint {
  if (targetRateBps <= 0) return BigInt(0);
  return (totalStakedSats * BigInt(targetRateBps)) / BigInt(10000) / BigInt(50);
}

/**
 * How full a bond is, 0-1. Returns undefined rather than 0 when capacity is
 * unknown, so the UI can distinguish "empty" from "we cannot say".
 */
export function getBondFillRatio(lockedSats: bigint, capacitySats: bigint): number | undefined {
  if (capacitySats <= BigInt(0)) return undefined;
  return Number(lockedSats) / Number(capacitySats);
}

/** Basis points (300) to a percentage number (3). */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/**
 * Rewards and APY for STX-only stacking.
 *
 * How stacking pays out, in plain terms:
 *
 * Miners send BTC to the PoX addresses. Each distribution, the pox-5 contract
 * splits that pot in a fixed order:
 *
 *   1. Every active bond is paid first, up to its target yield.
 *   2. 15% of whatever is left is set aside in a reserve.
 *   3. The rest goes to people who stacked STX.
 *
 * The contract then divides step 3 by the total STX staked that cycle and
 * stores the result, so we never have to redo that division ourselves. That
 * stored number is what `get-rewards-per-token-for-cycle` returns.
 *
 * Two things worth knowing about it:
 *
 * - It is scaled up by 1e18 (the contract's PRECISION) so that Clarity's
 *   whole-number division does not throw away the fraction. We divide it back
 *   out here.
 * - It counts up during a cycle and starts again from zero each cycle. So a
 *   cycle that is still running holds a partial figure, which is why we only
 *   work out a yearly rate for cycles that have finished.
 */

/** The contract multiplies its per-token figure by this to avoid rounding to zero. */
export const REWARDS_PRECISION = BigInt('1000000000000000000'); // 1e18

const MICRO_STX_IN_STX = 1_000_000;
const MINUTES_IN_YEAR = 365 * 24 * 60;

/**
 * Sats rewarded per STX staked, for one cycle.
 *
 * The contract's figure is per micro-STX and scaled by 1e18, so to get a
 * per-STX number we multiply by the million micro-STX in a STX and divide the
 * scaling back out.
 */
export function getCycleRewardsPerStx(rewardsPerMicroStx: bigint): number {
  return (Number(rewardsPerMicroStx) * MICRO_STX_IN_STX) / Number(REWARDS_PRECISION);
}

/**
 * How many cycles fit in a year.
 *
 * A cycle is a fixed number of Bitcoin blocks, and we assume a block takes
 * about 10 minutes, so this follows from the network's cycle length rather
 * than being a fixed number. Mainnet cycles are 2100 blocks, which is about
 * 14.6 days, so roughly 25 cycles a year.
 */
export function getCyclesPerYear(rewardCycleLength: number): number {
  const minutesPerCycle = rewardCycleLength * MINUTES_PER_BLOCK;
  return MINUTES_IN_YEAR / minutesPerCycle;
}

/**
 * Whether a network's cycles are long enough for a yearly rate to mean anything.
 *
 * Annualising multiplies a single cycle's rewards by how many cycles fit in a
 * year, which only holds if blocks arrive at roughly the assumed rate. Test
 * networks mine far faster, so a cycle can pass in hours and the resulting
 * figure runs into the hundreds of percent. A reward cycle shorter than a day
 * is not a real cycle, so we decline to annualise it.
 */
export function isCycleLengthPlausible(rewardCycleLength: number): boolean {
  const MINUTES_IN_DAY = 24 * 60;
  return rewardCycleLength * MINUTES_PER_BLOCK >= MINUTES_IN_DAY;
}

export interface StackingYield {
  /** Sats rewarded per STX staked over the whole cycle. */
  satsPerStxPerCycle: number;
  /** The same figure stretched out over a year. */
  satsPerStxPerYear: number;
  /**
   * The simple yearly rate: a cycle's return scaled up without reinvesting.
   * Needs both prices, so it is undefined when we do not have them.
   */
  aprPercent?: number | undefined;
  /**
   * The yearly rate with rewards restacked each cycle, which is what an APY
   * means and what the wider ecosystem quotes. Undefined without both prices.
   */
  apyPercent: number | undefined;
}

/**
 * Works out the yearly rate for one finished cycle.
 *
 * The comparison is between two different coins, so prices have to come into
 * it: we take the BTC a stacker rewarded, convert it to dollars, and express
 * that as a percentage of the dollar value of the STX they locked up.
 *
 * Only pass a cycle that has finished. A cycle still in progress holds only
 * part of its rewards, so stretching that over a year would understate the
 * rate, and the shortfall gets bigger the earlier in the cycle you ask.
 */
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

  // On a network whose cycles pass in hours, a yearly rate is meaningless.
  // The sats figures are still a straight measurement, so they stand.
  if (!isCycleLengthPlausible(rewardCycleLength)) {
    return { satsPerStxPerCycle, satsPerStxPerYear, apyPercent: undefined };
  }

  // Without both prices there is nothing to compare, so leave the rate out
  // rather than showing a number built on a missing price.
  if (!btcPriceUsd || !stxPriceUsd) {
    return { satsPerStxPerCycle, satsPerStxPerYear, apyPercent: undefined };
  }

  const usdRewardedPerStxPerYear = (satsPerStxPerYear / SATS_IN_BTC) * btcPriceUsd;
  // The simple rate: a cycle's return scaled to a year without reinvesting.
  const aprRatio = usdRewardedPerStxPerYear / stxPriceUsd;
  // Rewards land every cycle and can be restacked, so the yearly figure
  // compounds at that frequency. This is the difference between an APR and an
  // APY, and the ecosystem quotes the compounded one.
  const cyclesPerYear = getCyclesPerYear(rewardCycleLength);
  return {
    satsPerStxPerCycle,
    satsPerStxPerYear,
    aprPercent: aprRatio * 100,
    apyPercent: (Math.pow(1 + aprRatio / cyclesPerYear, cyclesPerYear) - 1) * 100,
  };
}

/**
 * Total BTC (in sats) paid to STX stackers in a cycle, across everyone.
 *
 * This multiplies the per-STX figure back out by the total staked. It lands a
 * sat or so under what the contract reported, because the contract dropped a
 * remainder when it did the original division and that cannot be recovered.
 */
export function getCycleStackerRewardsSatsBigInt(
  rewardsPerMicroStx: bigint,
  stakedMicroStx: bigint
): bigint {
  if (stakedMicroStx <= BigInt(0)) return BigInt(0);
  return (rewardsPerMicroStx * stakedMicroStx) / REWARDS_PRECISION;
}

/** As above, as a plain number for display maths. */
export function getCycleStackerRewardsSats(
  rewardsPerMicroStx: bigint,
  stakedMicroStx: bigint
): number {
  return Number(getCycleStackerRewardsSatsBigInt(rewardsPerMicroStx, stakedMicroStx));
}

/**
 * Laying bonds out on a timeline.
 *
 * Each bond runs from the block where it activates to the block where it
 * unlocks. To draw those as bars on a calendar we turn both block heights into
 * rough dates, work out the earliest and latest date across every bond, and
 * then express each bar as a percentage across that span. Percentages mean the
 * chart resizes with its container without recalculating anything.
 */

export type BondTimelineState = 'complete' | 'active' | 'upcoming';

export interface BondTimelineBar {
  index: number;
  label: string;
  startMs: number;
  endMs: number;
  state: BondTimelineState;
  /** Distance from the left edge of the chart, as a percentage. */
  leftPercent: number;
  /** Bar width, as a percentage of the whole chart. */
  widthPercent: number;
}

/**
 * Which of the three states a bond is in.
 *
 * We work this out from block heights rather than trusting the status field,
 * because the API only ever reports "upcoming" or "active" and never tells us
 * a bond has finished. A bond whose unlock height has already passed is done,
 * whatever it calls itself.
 */
export function getBondTimelineState(
  activationHeight: number,
  unlockHeight: number,
  currentBurnHeight: number
): BondTimelineState {
  if (unlockHeight > 0 && currentBurnHeight >= unlockHeight) return 'complete';
  if (activationHeight > 0 && currentBurnHeight >= activationHeight) return 'active';
  return 'upcoming';
}

/** Where a bar sits, as percentages across the chart's full time span. */
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

/**
 * How the timeline axis is divided.
 *
 * Bonds can span days on a fast network or most of a year on mainnet, so the
 * axis follows the data: a short run is labelled by day, a long one by month.
 * Padding to the wrong unit is what squeezes a week of bars into the corner of
 * a month-wide chart.
 */
export type TimelineGranularity = 'day' | 'month';

/** Beyond this many days, per-day labels stop being readable. */
const MAX_DAYS_FOR_DAY_AXIS = 21;

export function getTimelineGranularity(spanMs: number): TimelineGranularity {
  const days = spanMs / (24 * 60 * 60 * 1000);
  return days <= MAX_DAYS_FOR_DAY_AXIS ? 'day' : 'month';
}

/**
 * Rounds the range out to whole days or months so the axis labels line up with
 * the bars instead of starting partway through a division.
 */
export function getTimelineBounds(
  bars: { startMs: number; endMs: number }[],
  nowMs: number
): { startMs: number; endMs: number; granularity: TimelineGranularity } {
  const times = bars.flatMap(bar => [bar.startMs, bar.endMs]).filter(Boolean);
  // Always include today, so the "today" marker is never off the edge.
  const earliest = Math.min(nowMs, ...(times.length ? times : [nowMs]));
  const latest = Math.max(nowMs, ...(times.length ? times : [nowMs]));

  const granularity = getTimelineGranularity(latest - earliest);
  const start = new Date(earliest);
  const end = new Date(latest);

  if (granularity === 'day') {
    return {
      startMs: Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
      // The day after the last one we need, so the final day is fully drawn.
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
  /** Whether this tick starts a new year, so the UI can show the year too. */
  isYearStart: boolean;
  year: number;
  leftPercent: number;
}

/**
 * Axis labels across the chart.
 *
 * Steps by more than one division when there would otherwise be too many
 * labels to read, so a three-week span shows every few days rather than all 21.
 */
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

/**
 * The bond the page leads with.
 *
 * Bonds overlap, so several run at once while one is usually taking
 * registrations. The one to feature is the bond currently running, because
 * that is the one with real balances and a payout history to show. The bond
 * open for enrollment is surfaced alongside it as what comes next, rather than
 * in its place. Falls back to the enrolling bond when nothing is running yet.
 */
export function getFeaturedBondIndex(
  bonds: { index: number; status: string }[]
): number | undefined {
  const byNewest = [...bonds].sort((a, b) => b.index - a.index);
  const running = byNewest.find(bond => bond.status === 'active');
  if (running) return running.index;
  return byNewest.find(bond => bond.status === 'upcoming')?.index;
}

/**
 * A duration expressed in the largest unit that still reads naturally, so a
 * six-month bond term says "6 months" rather than "175 days".
 */
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

/**
 * Time until something happens, in the finest unit that stays readable.
 *
 * Separate from `formatTermDuration` because a countdown and a term want
 * different precision: nobody needs a six-month term to the minute, but "1
 * hour left" is uselessly vague when there are twenty minutes to act.
 */
export function formatTimeRemaining(blocks: number): string {
  if (blocks <= 0) return '';
  const minutes = blocks * MINUTES_PER_BLOCK;
  const plural = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'}`;
  if (minutes < 90) return `${Math.max(Math.round(minutes), 1)} min`;
  const hours = minutes / 60;
  if (hours < 48) return plural(Math.round(hours), 'hour');
  return plural(Math.round(hours / 24), 'day');
}

/**
 * A bond's life, as five states rather than the three the API reports.
 *
 * The API knows `upcoming`, `active` and `unlocked`. The page needs more: a
 * bond that exists but has not opened for enrollment reads differently from
 * one taking registrations, and a bond past its STX unlock reads differently
 * from one whose term has ended. All four boundaries are block heights, so the
 * extra states are derived rather than asked for.
 */
export type BondLifecycleState = 'scheduled' | 'enrolling' | 'active' | 'maturity' | 'closed';

export interface BondSchedule {
  enrollmentOpensHeight: number;
  enrollmentClosesHeight: number;
  /** Day 0: the bond starts earning. */
  activationHeight: number;
  /**
   * The bond's Bitcoin becomes spendable: the L1 timelock's minimum unlock
   * height, one distribution before the term ends. This is the BTC leg, not
   * the STX one, which stays locked until the term ends on L2.
   */
  l1UnlockHeight: number;
  termEndHeight: number;
}

/**
 * Every milestone in a bond's life, from its start height alone.
 *
 * Enrollment opens one bond gap before the bond starts and closes at the start
 * of the prepare phase. The Bitcoin leg's L1 timelock can be spent one
 * distribution before the term ends; the STX leg stays locked until the term
 * ends on L2. Verified against the contract's own `get-bond-l1-unlock-height`
 * and `bond-period-to-reward-cycle`.
 */
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
  /** Distributions already paid, out of the bond's full term. */
  paid: number;
  total: number;
  /** Whole days since the bond started, and its full length in days. */
  dayOfTerm: number;
  termDays: number;
  elapsedRatio: number;
}

/**
 * How far through its term a bond is.
 *
 * Distributions land on the chain-wide grid, and a bond's term spans exactly
 * 24 of them, so the count is how many grid steps have passed since it
 * started rather than anything stored per bond.
 */
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

/**
 * What a finished bond actually returned, against what it targeted.
 *
 * The contract pays a fixed amount per distribution regardless of how long the
 * blocks took, so a bond that ran fast returns slightly more than its target
 * rate and one that ran slow slightly less. Undefined where the figure would
 * not mean anything: nothing bonded, or cycles too short to annualize.
 */
export function getRealizedRatePercent(
  paidSats: bigint,
  bondedSats: bigint,
  termBlocks: number,
  rewardCycleLength: number
): number | undefined {
  if (bondedSats <= BigInt(0) || termBlocks <= 0) return undefined;
  // Annualizing needs a term long enough for a year to be a sensible unit. On a
  // chain whose cycles run in hours, a term returns its full rate in under two
  // days, and scaling that to a year produces a number in the hundreds of
  // percent that describes the block interval rather than the bond.
  if (!isCycleLengthPlausible(rewardCycleLength)) return undefined;
  const cyclesInTerm = termBlocks / rewardCycleLength;
  const yearsInTerm = cyclesInTerm / getCyclesPerYear(rewardCycleLength);
  if (yearsInTerm <= 0) return undefined;
  return (Number(paidSats) / Number(bondedSats) / yearsInTerm) * 100;
}

/**
 * Start heights for bonds the contract will create but has not yet.
 *
 * Bond N starts BOND_GAP_CYCLES after bond N-1, so the schedule extends
 * indefinitely from any known bond. Only the timing is knowable this way; a
 * scheduled bond has no capacity or target rate until the Endowment sets them.
 */
export function projectScheduledBonds(
  latestKnownIndex: number,
  latestKnownActivationHeight: number,
  rewardCycleLength: number,
  count: number
): { index: number; activationHeight: number; termEndHeight: number }[] {
  const gapBlocks = BOND_GAP_CYCLES * rewardCycleLength;
  const termBlocks = BOND_LENGTH_CYCLES * rewardCycleLength;
  return Array.from({ length: Math.max(count, 0) }, (_, offset) => {
    const index = latestKnownIndex + offset + 1;
    const activationHeight = latestKnownActivationHeight + gapBlocks * (offset + 1);
    return { index, activationHeight, termEndHeight: activationHeight + termBlocks };
  });
}
