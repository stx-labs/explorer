import {
  applyStackingRewardWaterfall,
  bpsToPercent,
  burnHeightToApproximateTimestamp,
  formatTermDuration,
  formatTimeRemaining,
  getBarPosition,
  getBondLifecycleState,
  getBondProgress,
  getBondSchedule,
  getBondTimelineState,
  getCycleRewardsPerStx,
  getCycleStackerRewardsSatsBigInt,
  getCyclesPerYear,
  getDistributionCadence,
  getDistributionGridCells,
  getFeaturedBondIndex,
  getRealizedRatePercent,
  getStackingYieldForCompletedCycle,
  getTimelineBounds,
  getTimelineTicks,
  isCycleLengthPlausible,
  projectScheduledBonds,
} from '../projections';

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
    expect(getDistributionCadence(900)).toBe(450);
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

describe('bpsToPercent', () => {
  test('converts basis points to a percentage', () => {
    expect(bpsToPercent(300)).toBe(3);
    expect(bpsToPercent(500)).toBe(5);
  });
});

const MAINNET_CYCLE_141 = {
  rewardsPerMicroStx: BigInt('350915540939'),
  stakedMicroStx: BigInt('392447554847960'),
  reportedStackerRewardsSats: 137_715_946,
};

describe('getCycleStackerRewardsSatsBigInt', () => {
  test('rebuilds the payout the contract reported', () => {
    const rebuilt = getCycleStackerRewardsSatsBigInt(
      MAINNET_CYCLE_141.rewardsPerMicroStx,
      MAINNET_CYCLE_141.stakedMicroStx
    );
    expect(BigInt(MAINNET_CYCLE_141.reportedStackerRewardsSats) - rebuilt).toBe(BigInt(1));
  });

  test('is zero when nobody staked', () => {
    expect(getCycleStackerRewardsSatsBigInt(BigInt(0), BigInt(0))).toBe(BigInt(0));
  });
});

describe('applyStackingRewardWaterfall', () => {
  test('pays bonds before applying the reserve ratio', () => {
    expect(applyStackingRewardWaterfall(BigInt(1000), BigInt(200))).toBe(BigInt(680));
  });

  test('does not produce negative rewards', () => {
    expect(applyStackingRewardWaterfall(BigInt(100), BigInt(100))).toBe(BigInt(0));
    expect(applyStackingRewardWaterfall(BigInt(100), BigInt(200))).toBe(BigInt(0));
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
    expect(result.apyPercent).toBeCloseTo(5.1143, 3);
  });

  test('leaves the rate out when a price is missing', () => {
    const result = getStackingYieldForCompletedCycle({
      rewardsPerMicroStx: fullCycleRewardsPerMicroStx,
      rewardCycleLength: 2100,
      btcPriceUsd: undefined,
      stxPriceUsd: 0.27625,
    });
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
    expect(isCycleLengthPlausible(2100)).toBe(true);
    expect(isCycleLengthPlausible(900)).toBe(true);
  });

  test('rejects cycles that pass in hours', () => {
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
    expect(result.satsPerStxPerCycle).toBeGreaterThan(0);
    expect(result.apyPercent).toBeUndefined();
  });
});

describe('formatTermDuration', () => {
  test('describes a mainnet bond term in months', () => {
    expect(formatTermDuration(12 * 2100)).toBe('6 months');
  });

  test('describes a testnet term in months too', () => {
    expect(formatTermDuration(12 * 900)).toBe('2 months');
  });

  test('drops to days on a fast network', () => {
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
    expect(formatTermDuration(4)).toBe('1 hour');
    expect(formatTimeRemaining(4)).toBe('40 min');
  });
});

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

  test('derives every lifecycle milestone', () => {
    expect(schedule.enrollmentOpensHeight).toBe(962_150);
    expect(schedule.enrollmentClosesHeight).toBe(966_250);
    expect(schedule.activationHeight).toBe(966_350);
    expect(schedule.l1UnlockHeight).toBe(990_500);
    expect(schedule.termEndHeight).toBe(991_550);
  });

  test("the Bitcoin leg's L1 timelock opens one distribution before the term ends", () => {
    expect(schedule.termEndHeight - schedule.l1UnlockHeight).toBe(1050);
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
    const paid = BigInt(144_000_000);
    const bonded = BigInt(10_000_000_000);
    const rate = getRealizedRatePercent(paid, bonded, 12 * 2100, 2100);
    expect(rate).toBeCloseTo(3.003, 3);
  });

  test('is undefined when nothing was bonded', () => {
    expect(getRealizedRatePercent(BigInt(1), BigInt(0), 25200, 2100)).toBeUndefined();
  });

  test('refuses to annualize a term measured in hours', () => {
    expect(getRealizedRatePercent(BigInt(4800), BigInt(100_000), 240, 20)).toBeUndefined();
    const rate = getRealizedRatePercent(BigInt(4800), BigInt(100_000), 12 * 2100, 2100);
    expect(rate).toBeDefined();
    expect(rate!).toBeLessThan(20);
  });
});

describe('getFeaturedBondIndex', () => {
  test('uses the newest active bond', () => {
    expect(
      getFeaturedBondIndex([
        { index: 1, status: 'active' },
        { index: 2, status: 'active' },
        { index: 3, status: 'upcoming' },
      ])
    ).toBe(2);
  });

  test('uses the nearest upcoming bond when none are active', () => {
    expect(
      getFeaturedBondIndex([
        { index: 4, status: 'upcoming' },
        { index: 2, status: 'upcoming' },
      ])
    ).toBe(2);
  });

  test('returns nothing when no bond can be featured', () => {
    expect(getFeaturedBondIndex([{ index: 1, status: 'complete' }])).toBeUndefined();
  });
});

describe('getDistributionGridCells', () => {
  const BLOCK_MS = 10 * 60 * 1000;
  const nowMs = 1_700_000_000_000;
  const grid = {
    cadence: 10,
    firstBurnchainBlockHeight: 0,
    currentBurnHeight: 100,
    nowMs,
  };

  it('tiles the span with consecutive chain-wide cells, clipping the ends', () => {
    const cells = getDistributionGridCells({
      ...grid,
      startMs: nowMs - 5 * BLOCK_MS,
      endMs: nowMs + 25 * BLOCK_MS,
    });
    expect(cells.map(cell => cell.index)).toEqual([9, 10, 11, 12]);
    expect(cells[0].leftPercent).toBe(0);
    expect(cells[0].widthPercent).toBeCloseTo((5 / 30) * 100, 5);
    expect(cells[1].widthPercent).toBeCloseTo((10 / 30) * 100, 5);
    const covered = cells.reduce((sum, cell) => sum + cell.widthPercent, 0);
    expect(covered).toBeCloseTo(100, 5);
  });

  it('places each cell where a bar activating on that boundary would start', () => {
    const startMs = nowMs - 5 * BLOCK_MS;
    const endMs = nowMs + 25 * BLOCK_MS;
    const cells = getDistributionGridCells({ ...grid, startMs, endMs });
    const cell10 = cells.find(cell => cell.index === 10)!;
    const barAt100 = getBarPosition(nowMs, nowMs + 10 * BLOCK_MS, startMs, endMs);
    expect(cell10.leftPercent).toBeCloseTo(barAt100.leftPercent, 5);
    expect(cell10.widthPercent).toBeCloseTo(barAt100.widthPercent, 5);
  });

  it('returns nothing for an empty span or a network with no cadence', () => {
    expect(getDistributionGridCells({ ...grid, startMs: nowMs, endMs: nowMs })).toEqual([]);
    expect(
      getDistributionGridCells({ ...grid, cadence: 0, startMs: nowMs, endMs: nowMs + BLOCK_MS })
    ).toEqual([]);
  });

  it('stops at the cap rather than running away', () => {
    const cells = getDistributionGridCells({
      ...grid,
      startMs: nowMs,
      endMs: nowMs + 100_000 * BLOCK_MS,
      maxCells: 50,
    });
    expect(cells).toHaveLength(50);
  });
});
