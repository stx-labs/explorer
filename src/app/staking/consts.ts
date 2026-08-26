/** Assumed Bitcoin block interval used for every date projection on this page. */
export const MINUTES_PER_BLOCK = 10;

/** Bond term, in PoX reward cycles. */
export const BOND_TERM_CYCLES = 12;

export const SATS_IN_BTC = 100_000_000;

export const STAKING_PAGE_TITLE = 'Staking';

/**
 * Bonds are created continuously, so both the table and the timeline need an
 * upper bound. Newest first, with the number omitted stated in the UI rather
 * than silently truncated.
 */
export const BONDS_TABLE_LIMIT = 25;
export const TIMELINE_BOND_LIMIT = 12;

/**
 * Where "get started" sends people.
 *
 * One deployment serves every network. Replace this with a per-network lookup
 * once separate deployments exist, so mainnet visitors are not sent to an app
 * pointed at a test network.
 */
export const STAKING_APP_URL = 'https://bitcoin-staking-app.vercel.app/';

/** How many recent transactions to scan when working out which filters to offer. */
export const ACTIVITY_ACTION_SAMPLE = 50;
export const ACTIVITY_FEED_LIMIT = 12;
