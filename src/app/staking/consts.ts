export const MINUTES_PER_BLOCK = 10;

export const BOND_TERM_CYCLES = 12;

export const SATS_IN_BTC = 100_000_000;

export const TIMELINE_BONDS_BEFORE = 5;
export const TIMELINE_BONDS_AFTER = 5;

export const BONDS_TABLE_LIMIT = 10;

export const ACTIVITY_FEED_LIMIT = 5;

export const ACTIVITY_PAGE_LIMIT = 60;

export const PREVIOUS_CYCLES_LIMIT = 3;

export const BONDS_PAGE_SIZE = 20;

export const ACTIVITY_PAGE_SIZE = 20;

export const GENESIS_BOND_INDEX = 1;

export const BOND_GAP_CYCLES = 2;
export const DISTRIBUTIONS_PER_BOND = 24;

export const RESERVE_RATIO_PERCENT = 15;

export const REWARDS_PRECISION = BigInt('1000000000000000000');

export const SCHEDULED_BONDS_AHEAD = TIMELINE_BONDS_AFTER + 1;

export const MAINNET_HISTORIC_CYCLES: Record<number, { rewardsBtc: number; apyPercent: number }> = {
  140: { rewardsBtc: 2.72, apyPercent: 7.72 },
  139: { rewardsBtc: 2.79, apyPercent: 5.76 },
};

export const STAKING_LINKS = {
  howToParticipate: 'https://www.stacks.co/bitcoin-staking',
  registerInterest: 'https://www.stacks.co/bitcoin-staking',
  estimateYield: 'https://www.stacks.co/bitcoin-yield-calculator',
  stackingTracker: 'https://www.stacking-tracker.com/',
};
