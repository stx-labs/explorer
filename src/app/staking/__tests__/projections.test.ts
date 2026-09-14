import {
  formatTermDuration,
  formatTimeRemaining,
  getBarPosition,
  getBondLifecycleState,
  getBondProgress,
  getBondSchedule,
  getBondTimelineState,
  getCycleStackerRewardsSatsBigInt,
  getDistributionGridCells,
  getFeaturedBondIndex,
  getTimelineBounds,
  getTimelineTicks,
  projectScheduledBonds,
} from '../projections';

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

describe('getBondTimelineState', () => {
  test('moves from upcoming to active to complete as heights pass', () => {
    expect(getBondTimelineState(10800, 21600, 9500)).toBe('upcoming');
    expect(getBondTimelineState(9000, 19800, 9500)).toBe('active');
    expect(getBondTimelineState(9000, 19800, 20000)).toBe('complete');
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
  test('gives one tick a day on a short axis, named for the day', () => {
    const ticks = getTimelineTicks(Date.UTC(2026, 7, 23), Date.UTC(2026, 7, 28), 'day');
    expect(ticks).toHaveLength(5);
    expect(ticks[0].leftPercent).toBe(0);
    ticks.forEach(tick => expect(tick.label).toMatch(/^\w{3} \d{1,2}$/));
  });

  test('gives one tick a month on a long axis, named for the month', () => {
    const ticks = getTimelineTicks(Date.UTC(2026, 2, 1), Date.UTC(2026, 6, 1), 'month');
    expect(ticks).toHaveLength(4);
    ticks.forEach(tick => expect(tick.label).toMatch(/^\w{3}$/));
  });

  test('thins out labels rather than crowding them', () => {
    const ticks = getTimelineTicks(Date.UTC(2026, 7, 1), Date.UTC(2026, 7, 22), 'day');
    expect(ticks.length).toBeLessThanOrEqual(8);
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

test.each([
  [12 * 2100, '6 months'],
  [12 * 20, '2 days'],
  [6, '1 hour'],
  [72, '12 hours'],
  [0, ''],
])('formatTermDuration(%s) displays %s', (blocks, expected) => {
  expect(formatTermDuration(blocks)).toBe(expected);
});

test.each([
  [2, '20 min'],
  [6, '60 min'],
  [12, '2 hours'],
  [6 * 24, '24 hours'],
  [6 * 24 * 7, '7 days'],
  [0, ''],
  [-5, ''],
])('formatTimeRemaining(%s) displays %s', (blocks, expected) => {
  expect(formatTimeRemaining(blocks)).toBe(expected);
});

const GENESIS = {
  activationHeight: 966_350,
  termEndHeight: 991_550,
  rewardCycleLength: 2100,
  prepareCycleLength: 100,
};
const schedule = getBondSchedule(
  GENESIS.activationHeight,
  GENESIS.termEndHeight,
  GENESIS.rewardCycleLength,
  GENESIS.prepareCycleLength
);

describe('getBondSchedule', () => {
  test('derives every lifecycle milestone', () => {
    expect(schedule.enrollmentOpensHeight).toBe(962_150);
    expect(schedule.enrollmentClosesHeight).toBe(966_250);
    expect(schedule.activationHeight).toBe(966_350);
    expect(schedule.l1UnlockHeight).toBe(990_500);
    expect(schedule.termEndHeight).toBe(991_550);
  });
});

describe('getBondLifecycleState', () => {
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
  test('counts scheduled intervals and days from the design example', () => {
    const progress = getBondProgress(schedule, 969_500, GENESIS.rewardCycleLength);
    expect(progress.elapsedDistributions).toBe(3);
    expect(progress.total).toBe(24);
    expect(progress.dayOfTerm).toBe(21);
    expect(progress.termDays).toBe(175);
  });

  test('never reports more distributions than a term contains', () => {
    const progress = getBondProgress(schedule, 1_500_000, GENESIS.rewardCycleLength);
    expect(progress.elapsedDistributions).toBe(24);
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
