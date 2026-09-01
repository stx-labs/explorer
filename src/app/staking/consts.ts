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
/**
 * Bonds shown either side of the current one. The timeline reads as a sequence
 * running through the present rather than starting at whatever is live now, so
 * the two windows are counted separately and the current bond sits between
 * them.
 */
export const TIMELINE_BONDS_BEFORE = 5;
export const TIMELINE_BONDS_AFTER = 5;

/** Rows in the table view, which lists forward from the current bond only. */
export const BONDS_TABLE_LIMIT = 10;

/**
 * Where "get started" sends people.
 *
 * One deployment serves every network. Replace this with a per-network lookup
 * once separate deployments exist, so mainnet visitors are not sent to an app
 * pointed at a test network.
 */
export const STAKING_APP_URL = 'https://bitcoin-staking-app.vercel.app/';

export const ACTIVITY_FEED_LIMIT = 5;

/** Rows on the full activity page, which shows more than the page section. */
export const ACTIVITY_PAGE_LIMIT = 60;

/** Previous cycles shown before the "view all" link takes over. */
export const PREVIOUS_CYCLES_LIMIT = 3;

/** Rows per page on the full cycle history. */
export const CYCLES_PAGE_SIZE = 10;

/** Bonds per page on the full bonds list. The endpoint refuses more than 50. */
export const BONDS_PAGE_SIZE = 20;

/** Events per page on the full activity list. */
export const ACTIVITY_PAGE_SIZE = 20;

/**
 * Bond shape, fixed in pox-5 as BOND_LENGTH_CYCLES and BOND_GAP_CYCLES.
 * A bond runs 12 reward cycles and a new one starts every 2, so several
 * overlap at any time.
 */
export const BOND_GAP_CYCLES = 2;
export const DISTRIBUTIONS_PER_BOND = 24;

/**
 * Share of a distribution held back into the protocol reserve, taken after
 * active bonds are paid rather than off the cycle's gross rewards. Verified
 * against the contract: reserve-deposit is exactly 15% of
 * (gross-accrued-rewards - total-bond-rewards). RESERVE_RATIO in pox-5.
 */
export const RESERVE_RATIO_PERCENT = 15;

/**
 * Whether to show bonds that are scheduled by the contract's cadence but not
 * yet created on chain.
 *
 * TODO: needs sign-off from Mitchell before production. Whether to publish
 * upcoming bonds ahead of time, and how far ahead, is a marketing and
 * leadership decision rather than a technical one. Terms are pure arithmetic;
 * their capacity and target rate are not knowable until the Endowment sets them.
 */
export const SHOW_SCHEDULED_BONDS = true;
/**
 * Enough projected bonds to fill the timeline's forward window. It trims to
 * what that window has room for,
 * so this only needs to cover the case where few bonds exist on chain.
 */
export const SCHEDULED_BONDS_AHEAD = TIMELINE_BONDS_AFTER + 1;

export const STAKING_LINKS = {
  /** TODO: no destination agreed yet. STAKING_APP_URL is the likely target. */
  howToParticipate: '',
  stackingTracker: 'https://www.stacking-tracker.com/',
};
