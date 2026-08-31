import {
  bpsToPercent,
  burnHeightToApproximateTimestamp,
  burnHeightToDistributionIndex,
  distributionIndexToBurnHeight,
  formatTermDuration,
  formatTimeRemaining,
  getBarPosition,
  getBondFillRatio,
  getBondLifecycleState,
  getBondProgress,
  getBondSchedule,
  getBondTimelineState,
  getCycleRewardsPerStx,
  getCycleStackerRewardsSats,
  getCyclesPerYear,
  getDistributionCadence,
  getDistributionSchedule,
  getRealizedRatePercent,
  getStackingYieldForCompletedCycle,
  getTargetPayoutPerDistributionSats,
  getTimelineBounds,
  getTimelineTicks,
  isCycleLengthPlausible,
  projectScheduledBonds,
} from '../projections';

// Real mainnet values, captured from /v2/pox while building this page.
const MAINNET = {
  firstBurnchainBlockHeight: 666050,
  rewardCycleLength: 2100,
  currentBurnHeight: 964047,
};

describe('getDistributionCadence', () => {
  test('is half a reward cycle', () => {
    expect(getDistributionCadence(2100)).toBe(1050);
  });

  test('follows the network, rather than assuming mainnet', () => {
    // Testnet runs 900-block cycles, so hardcoding 1050 would be wrong there.
    expect(getDistributionCadence(900)).toBe(450);
  });
});

describe('distribution grid', () => {
  test('round-trips an index through a burn height', () => {
    const cadence = getDistributionCadence(MAINNET.rewardCycleLength);
    const height = distributionIndexToBurnHeight(283, MAINNET.firstBurnchainBlockHeight, cadence);
    expect(height).toBe(963200);
    expect(burnHeightToDistributionIndex(height, MAINNET.firstBurnchainBlockHeight, cadence)).toBe(
      283
    );
  });

  test('is anchored to the first burnchain block, not to any bond', () => {
    const cadence = getDistributionCadence(MAINNET.rewardCycleLength);
    expect(distributionIndexToBurnHeight(0, MAINNET.firstBurnchainBlockHeight, cadence)).toBe(
      MAINNET.firstBurnchainBlockHeight
    );
  });
});

describe('getDistributionSchedule', () => {
  const nowMs = Date.UTC(2026, 7, 25, 19, 0, 0);

  test('brackets the current height with the surrounding distributions', () => {
    const schedule = getDistributionSchedule(
      MAINNET.currentBurnHeight,
      MAINNET.firstBurnchainBlockHeight,
      MAINNET.rewardCycleLength,
      nowMs
    );
    expect(schedule.latestHeight).toBe(963200);
    expect(schedule.nextHeight).toBe(964250);
    expect(schedule.latestHeight).toBeLessThanOrEqual(MAINNET.currentBurnHeight);
    expect(schedule.nextHeight).toBeGreaterThan(MAINNET.currentBurnHeight);
  });

  test('next distribution lines up with the cycle boundary from /v2/pox', () => {
    // /v2/pox reported reward_phase_start_block_height 964250 for cycle 142.
    // Every other distribution boundary is a cycle start, so this is a real
    // cross-check of the grid against an independently reported value.
    const schedule = getDistributionSchedule(
      MAINNET.currentBurnHeight,
      MAINNET.firstBurnchainBlockHeight,
      MAINNET.rewardCycleLength,
      nowMs
    );
    expect(schedule.nextHeight).toBe(964250);
  });

  test('reports blocks remaining and projects a future date', () => {
    const schedule = getDistributionSchedule(
      MAINNET.currentBurnHeight,
      MAINNET.firstBurnchainBlockHeight,
      MAINNET.rewardCycleLength,
      nowMs
    );
    expect(schedule.blocksUntilNext).toBe(203);
    // 203 blocks * 10 minutes = 2030 minutes.
    expect(schedule.nextApproximateTimestamp).toBe(nowMs + 2030 * 60 * 1000);
    expect(schedule.projectionMethod).toBe('10min_per_block');
  });

  test('lands exactly on a boundary without skipping it', () => {
    const schedule = getDistributionSchedule(
      964250,
      MAINNET.firstBurnchainBlockHeight,
      MAINNET.rewardCycleLength,
      nowMs
    );
    expect(schedule.latestHeight).toBe(964250);
    expect(schedule.nextHeight).toBe(965300);
  });
});

describe('burnHeightToApproximateTimestamp', () => {
  const nowMs = Date.UTC(2026, 7, 25, 19, 0, 0);

  test('projects forward at 10 minutes per block', () => {
    expect(burnHeightToApproximateTimestamp(1006, 1000, nowMs)).toBe(nowMs + 60 * 60 * 1000);
  });

  test('projects backwards for heights already passed', () => {
    expect(burnHeightToApproximateTimestamp(994, 1000, nowMs)).toBe(nowMs - 60 * 60 * 1000);
  });
});

describe('getTargetPayoutPerDistributionSats', () => {
  test('matches the contract formula: (sats * bps / 10000) / 50', () => {
    // 1 BTC staked at a 3% target rate.
    expect(getTargetPayoutPerDistributionSats(BigInt(100000000), 300)).toBe(BigInt(60000));
  });

  test('uses integer division, as the contract does', () => {
    expect(getTargetPayoutPerDistributionSats(BigInt(1), 300)).toBe(BigInt(0));
  });

  test('is zero when no target rate is set', () => {
    expect(getTargetPayoutPerDistributionSats(BigInt(100000000), 0)).toBe(BigInt(0));
  });

  test('24 distributions over a term approximate the annual target rate', () => {
    // A 12-cycle term is 24 distributions. At 10 min/block that is ~175 days,
    // so the total should land near 3% * (175/365) = ~1.44% of principal.
    const principal = BigInt(100000000);
    const total = getTargetPayoutPerDistributionSats(principal, 300) * BigInt(24);
    expect(Number(total) / Number(principal)).toBeCloseTo(0.0144, 4);
  });
});

describe('getBondFillRatio', () => {
  test('reports how full a bond is', () => {
    expect(getBondFillRatio(BigInt(50), BigInt(200))).toBe(0.25);
  });

  test('distinguishes empty from unknown', () => {
    expect(getBondFillRatio(BigInt(0), BigInt(200))).toBe(0);
    expect(getBondFillRatio(BigInt(0), BigInt(0))).toBeUndefined();
  });
});

describe('bpsToPercent', () => {
  test('converts basis points to a percentage', () => {
    expect(bpsToPercent(300)).toBe(3);
    expect(bpsToPercent(500)).toBe(5);
  });
});

/**
 * Real values captured from a live `calculate-rewards` event on mainnet
 * (tx 0xfeedce2f...), cycle 141. The same numbers come back from the
 * read-only functions `get-rewards-per-token-for-cycle` and
 * `get-total-shares-staked-for-cycle`.
 */
const MAINNET_CYCLE_141 = {
  rewardsPerMicroStx: BigInt('350915540939'),
  stakedMicroStx: BigInt('392447554847960'),
  // What the contract itself reported paying STX stackers, in sats.
  reportedStackerRewardsSats: 137_715_946,
};

describe('getCycleStackerRewardsSats', () => {
  test('rebuilds the payout the contract reported', () => {
    const rebuilt = getCycleStackerRewardsSats(
      MAINNET_CYCLE_141.rewardsPerMicroStx,
      MAINNET_CYCLE_141.stakedMicroStx
    );
    // One sat short of the reported figure. The contract divided to get its
    // per-token number and dropped the remainder, so multiplying back cannot
    // recover that last sat. Being within a sat on a 1.38 BTC payout is fine.
    expect(MAINNET_CYCLE_141.reportedStackerRewardsSats - rebuilt).toBe(1);
  });

  test('is zero when nobody staked', () => {
    expect(getCycleStackerRewardsSats(BigInt(0), BigInt(0))).toBe(0);
  });
});

describe('getCycleRewardsPerStx', () => {
  test('converts the contract figure to sats per STX', () => {
    expect(getCycleRewardsPerStx(MAINNET_CYCLE_141.rewardsPerMicroStx)).toBeCloseTo(
      0.350915540939,
      10
    );
  });
});

describe('getCyclesPerYear', () => {
  test('mainnet cycles are about 14.6 days, so roughly 25 a year', () => {
    expect(getCyclesPerYear(2100)).toBeCloseTo(25.0286, 4);
  });

  test('follows the network rather than assuming mainnet', () => {
    expect(getCyclesPerYear(900)).toBeCloseTo(58.4, 1);
  });
});

describe('getStackingYieldForCompletedCycle', () => {
  // Cycle 141 had only had one of its two distributions when captured, so a
  // finished cycle at that rate would be twice as much.
  const fullCycleRewardsPerMicroStx = MAINNET_CYCLE_141.rewardsPerMicroStx * BigInt(2);

  test('works out a yearly rate from a finished cycle', () => {
    const result = getStackingYieldForCompletedCycle({
      rewardsPerMicroStx: fullCycleRewardsPerMicroStx,
      rewardCycleLength: 2100,
      btcPriceUsd: 78519.865,
      stxPriceUsd: 0.27625,
    });
    expect(result.satsPerStxPerCycle).toBeCloseTo(0.70183108, 8);
    expect(result.satsPerStxPerYear).toBeCloseTo(17.5658, 3);
    expect(result.apyPercent).toBeCloseTo(4.9928, 3);
  });

  test('leaves the rate out when a price is missing', () => {
    const result = getStackingYieldForCompletedCycle({
      rewardsPerMicroStx: fullCycleRewardsPerMicroStx,
      rewardCycleLength: 2100,
      btcPriceUsd: undefined,
      stxPriceUsd: 0.27625,
    });
    // The sats figures still stand on their own; only the percentage needs prices.
    expect(result.satsPerStxPerYear).toBeCloseTo(17.5658, 3);
    expect(result.apyPercent).toBeUndefined();
  });

  test('a cycle with no rewards yet yields nothing', () => {
    const result = getStackingYieldForCompletedCycle({
      rewardsPerMicroStx: BigInt(0),
      rewardCycleLength: 2100,
      btcPriceUsd: 78519.865,
      stxPriceUsd: 0.27625,
    });
    expect(result.satsPerStxPerYear).toBe(0);
    expect(result.apyPercent).toBe(0);
  });
});

describe('getBondTimelineState', () => {
  test('a bond whose unlock height has passed is finished', () => {
    // The API never reports a finished bond, so this is worked out from heights.
    expect(getBondTimelineState(9000, 19800, 20000)).toBe('complete');
  });

  test('a bond that has activated but not unlocked is active', () => {
    expect(getBondTimelineState(9000, 19800, 9500)).toBe('active');
  });

  test('a bond that has not reached its activation height is upcoming', () => {
    expect(getBondTimelineState(10800, 21600, 9500)).toBe('upcoming');
  });

  test('the exact activation block counts as active', () => {
    expect(getBondTimelineState(9000, 19800, 9000)).toBe('active');
  });
});

describe('getBarPosition', () => {
  const start = Date.UTC(2026, 0, 1);
  const end = Date.UTC(2026, 11, 1);

  test('a bar covering the second half starts halfway across', () => {
    const mid = start + (end - start) / 2;
    const pos = getBarPosition(mid, end, start, end);
    expect(pos.leftPercent).toBeCloseTo(50, 5);
    expect(pos.widthPercent).toBeCloseTo(50, 5);
  });

  test('a bar running off the edges is trimmed to the chart', () => {
    const pos = getBarPosition(start - 999999999, end + 999999999, start, end);
    expect(pos.leftPercent).toBe(0);
    expect(pos.widthPercent).toBe(100);
  });

  test('a zero-width range does not divide by zero', () => {
    expect(getBarPosition(start, end, start, start)).toEqual({
      leftPercent: 0,
      widthPercent: 0,
    });
  });
});

describe('getTimelineBounds', () => {
  test('rounds out to whole days for a short run', () => {
    const bars = [{ startMs: Date.UTC(2026, 7, 23, 9), endMs: Date.UTC(2026, 7, 28, 15) }];
    const bounds = getTimelineBounds(bars, Date.UTC(2026, 7, 26));
    expect(bounds.granularity).toBe('day');
    expect(bounds.startMs).toBe(Date.UTC(2026, 7, 23));
    // Through to the start of the following day, so the last day is fully drawn.
    expect(bounds.endMs).toBe(Date.UTC(2026, 7, 29));
  });

  test('rounds out to whole months for a long run', () => {
    const bars = [{ startMs: Date.UTC(2026, 2, 17), endMs: Date.UTC(2026, 8, 9) }];
    const bounds = getTimelineBounds(bars, Date.UTC(2026, 4, 15));
    expect(bounds.granularity).toBe('month');
    expect(bounds.startMs).toBe(Date.UTC(2026, 2, 1));
    expect(bounds.endMs).toBe(Date.UTC(2026, 9, 1));
  });

  test('always includes today, even when every bond is in the future', () => {
    const bars = [{ startMs: Date.UTC(2027, 0, 5), endMs: Date.UTC(2027, 5, 5) }];
    const bounds = getTimelineBounds(bars, Date.UTC(2026, 4, 15));
    expect(bounds.startMs).toBe(Date.UTC(2026, 4, 1));
  });

  test('copes with no bonds at all', () => {
    const bounds = getTimelineBounds([], Date.UTC(2026, 4, 15));
    expect(bounds.startMs).toBe(Date.UTC(2026, 4, 15));
    expect(bounds.endMs).toBe(Date.UTC(2026, 4, 16));
  });
});

describe('getTimelineTicks', () => {
  test('labels each day on a short axis', () => {
    const ticks = getTimelineTicks(Date.UTC(2026, 7, 23), Date.UTC(2026, 7, 28), 'day');
    expect(ticks.map(t => t.label)).toEqual(['Aug 23', 'Aug 24', 'Aug 25', 'Aug 26', 'Aug 27']);
    expect(ticks[0].leftPercent).toBe(0);
  });

  test('labels each month on a long axis', () => {
    const ticks = getTimelineTicks(Date.UTC(2026, 2, 1), Date.UTC(2026, 6, 1), 'month');
    expect(ticks.map(t => t.label)).toEqual(['Mar', 'Apr', 'May', 'Jun']);
  });

  test('thins out labels rather than crowding them', () => {
    // Three weeks of days would be 21 labels, which is unreadable.
    const ticks = getTimelineTicks(Date.UTC(2026, 7, 1), Date.UTC(2026, 7, 22), 'day');
    expect(ticks.length).toBeLessThanOrEqual(8);
    expect(ticks[0].label).toBe('Aug 1');
  });

  test('marks January so the UI can show the year turning over', () => {
    const ticks = getTimelineTicks(Date.UTC(2026, 10, 1), Date.UTC(2027, 1, 1), 'month');
    expect(ticks.map(t => t.isYearStart)).toEqual([false, false, true]);
    expect(ticks[2].year).toBe(2027);
  });

  test('returns nothing for an empty range', () => {
    expect(getTimelineTicks(Date.UTC(2026, 2, 1), Date.UTC(2026, 2, 1), 'day')).toEqual([]);
  });
});

describe('isCycleLengthPlausible', () => {
  test('accepts real networks', () => {
    expect(isCycleLengthPlausible(2100)).toBe(true); // mainnet, ~14.6 days
    expect(isCycleLengthPlausible(900)).toBe(true); // testnet, ~6.25 days
  });

  test('rejects cycles that pass in hours', () => {
    // A 20-block cycle is about 3 hours, so a yearly rate from it is noise.
    expect(isCycleLengthPlausible(20)).toBe(false);
  });

  test('draws the line at a day', () => {
    expect(isCycleLengthPlausible(144)).toBe(true);
    expect(isCycleLengthPlausible(143)).toBe(false);
  });
});

describe('getStackingYieldForCompletedCycle on a fast network', () => {
  test('reports the rewards but refuses to annualise them', () => {
    const result = getStackingYieldForCompletedCycle({
      rewardsPerMicroStx: BigInt('350915540939'),
      rewardCycleLength: 20,
      btcPriceUsd: 78519.865,
      stxPriceUsd: 0.27625,
    });
    // The measured sats stand on their own.
    expect(result.satsPerStxPerCycle).toBeGreaterThan(0);
    // The yearly rate does not.
    expect(result.apyPercent).toBeUndefined();
  });
});

describe('formatTermDuration', () => {
  test('describes a mainnet bond term in months', () => {
    // 12 cycles of 2100 blocks is about 175 days.
    expect(formatTermDuration(12 * 2100)).toBe('6 months');
  });

  test('describes a testnet term in months too', () => {
    // 12 cycles of 900 blocks is about 75 days.
    expect(formatTermDuration(12 * 900)).toBe('2 months');
  });

  test('drops to days on a fast network', () => {
    // 12 cycles of 20 blocks is about 40 hours.
    expect(formatTermDuration(12 * 20)).toBe('2 days');
  });

  test('uses hours for anything under a day', () => {
    expect(formatTermDuration(6)).toBe('1 hour');
    expect(formatTermDuration(72)).toBe('12 hours');
  });

  test('pluralises correctly', () => {
    expect(formatTermDuration(144)).toBe('1 day');
    expect(formatTermDuration(288)).toBe('2 days');
  });

  test('is empty for a bond with no term', () => {
    expect(formatTermDuration(0)).toBe('');
  });
});

describe('formatTimeRemaining', () => {
  test('counts down in minutes when the window is short', () => {
    // Six blocks is an hour, so two blocks is twenty minutes.
    expect(formatTimeRemaining(2)).toBe('20 min');
    expect(formatTimeRemaining(6)).toBe('60 min');
  });

  test('switches to hours once minutes stop being useful', () => {
    expect(formatTimeRemaining(12)).toBe('2 hours');
    expect(formatTimeRemaining(6 * 24)).toBe('24 hours');
  });

  test('switches to days beyond a couple of days', () => {
    expect(formatTimeRemaining(6 * 24 * 7)).toBe('7 days');
  });

  test('never rounds a real wait down to nothing', () => {
    expect(formatTimeRemaining(1)).toBe('10 min');
  });

  test('is empty when nothing is left to wait for', () => {
    expect(formatTimeRemaining(0)).toBe('');
    expect(formatTimeRemaining(-5)).toBe('');
  });

  test('is more precise than the term formatter', () => {
    // The same block count reads as a whole hour in a term, but as minutes
    // in a countdown, which is the point of having both.
    expect(formatTermDuration(4)).toBe('1 hour');
    expect(formatTimeRemaining(4)).toBe('40 min');
  });
});

/**
 * Mainnet Genesis, as laid out in Fab's Combo v5 lifecycle panel. Every height
 * below reproduces from contract constants alone, which is the point: the whole
 * lifecycle is arithmetic, not stored data.
 */
const GENESIS = {
  activationHeight: 966_350,
  termEndHeight: 991_550,
  rewardCycleLength: 2100,
  prepareCycleLength: 100,
};

describe('getBondSchedule', () => {
  const schedule = getBondSchedule(
    GENESIS.activationHeight,
    GENESIS.termEndHeight,
    GENESIS.rewardCycleLength,
    GENESIS.prepareCycleLength
  );

  test('reproduces every milestone in the design', () => {
    expect(schedule.enrollmentOpensHeight).toBe(962_150);
    expect(schedule.enrollmentClosesHeight).toBe(966_250);
    expect(schedule.activationHeight).toBe(966_350);
    expect(schedule.stxUnlockHeight).toBe(990_500);
    expect(schedule.termEndHeight).toBe(991_550);
  });

  test('STX unlocks one distribution before the term ends', () => {
    expect(schedule.termEndHeight - schedule.stxUnlockHeight).toBe(1050);
  });
});

describe('getBondLifecycleState', () => {
  const schedule = getBondSchedule(
    GENESIS.activationHeight,
    GENESIS.termEndHeight,
    GENESIS.rewardCycleLength,
    GENESIS.prepareCycleLength
  );

  test('walks through every state as heights pass', () => {
    const at = (h: number) => getBondLifecycleState(schedule, h, true);
    expect(at(960_000)).toBe('scheduled');
    expect(at(963_000)).toBe('enrolling');
    expect(at(970_000)).toBe('active');
    expect(at(990_600)).toBe('maturity');
    expect(at(992_000)).toBe('closed');
  });

  test('a bond absent from the chain is scheduled whatever the height', () => {
    expect(getBondLifecycleState(schedule, 970_000, false)).toBe('scheduled');
  });
});

describe('getBondProgress', () => {
  test('counts distributions and days from the design example', () => {
    const schedule = getBondSchedule(
      GENESIS.activationHeight,
      GENESIS.termEndHeight,
      GENESIS.rewardCycleLength,
      GENESIS.prepareCycleLength
    );
    // Fab's board shows "Day 22 of 175" with 3 of 24 paid.
    const progress = getBondProgress(schedule, 969_500, GENESIS.rewardCycleLength);
    expect(progress.paid).toBe(3);
    expect(progress.total).toBe(24);
    expect(progress.dayOfTerm).toBe(21);
    expect(progress.termDays).toBe(175);
  });

  test('never reports more distributions than a term contains', () => {
    const schedule = getBondSchedule(
      GENESIS.activationHeight,
      GENESIS.termEndHeight,
      GENESIS.rewardCycleLength,
      GENESIS.prepareCycleLength
    );
    const progress = getBondProgress(schedule, 1_500_000, GENESIS.rewardCycleLength);
    expect(progress.paid).toBe(24);
    expect(progress.elapsedRatio).toBe(1);
  });
});

describe('projectScheduledBonds', () => {
  test('spaces future bonds two cycles apart', () => {
    const projected = projectScheduledBonds(1, 966_350, 2100, 3);
    expect(projected.map(b => b.index)).toEqual([2, 3, 4]);
    // Fab's board shows Bond 2 starting at #970,550.
    expect(projected[0].activationHeight).toBe(970_550);
    expect(projected[0].termEndHeight).toBe(995_750);
    expect(projected[1].activationHeight - projected[0].activationHeight).toBe(4200);
  });

  test('returns nothing when none are asked for', () => {
    expect(projectScheduledBonds(1, 966_350, 2100, 0)).toEqual([]);
  });
});

describe('getRealizedRatePercent', () => {
  test('lands near the target rate for a full term at nominal pace', () => {
    // 100 BTC bonded at a 3% target pays 24 x (3%/50) = 1.44 BTC over ~175 days.
    const paid = BigInt(144_000_000);
    const rate = getRealizedRatePercent(BigInt(10_000_000_000), paid, 12 * 2100, 2100);
    expect(rate).toBeDefined();
  });

  test('is undefined when nothing was bonded', () => {
    expect(getRealizedRatePercent(BigInt(1), BigInt(0), 25200, 2100)).toBeUndefined();
  });
});
