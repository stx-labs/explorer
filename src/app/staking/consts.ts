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
/** How many bond periods the timeline shows before the table takes over. */
export const TIMELINE_BOND_LIMIT = 10;

/** The table view lists the same number of periods as the timeline. */
export const BONDS_TABLE_LIMIT = TIMELINE_BOND_LIMIT;

/**
 * Where "get started" sends people.
 *
 * One deployment serves every network. Replace this with a per-network lookup
 * once separate deployments exist, so mainnet visitors are not sent to an app
 * pointed at a test network.
 */
export const STAKING_APP_URL = 'https://bitcoin-staking-app.vercel.app/';

export const ACTIVITY_FEED_LIMIT = 5;

/** Previous cycles shown before the "view all" link takes over. */
export const PREVIOUS_CYCLES_LIMIT = 3;

/**
 * Bond shape, fixed in pox-5 as BOND_LENGTH_CYCLES and BOND_GAP_CYCLES.
 * A bond runs 12 reward cycles and a new one starts every 2, so several
 * overlap at any time.
 */
export const BOND_GAP_CYCLES = 2;
export const DISTRIBUTIONS_PER_BOND = 24;

/**
 * Share of each cycle's Bitcoin rewards held back into the protocol reserve
 * before the remainder reaches STX stackers. RESERVE_RATIO in pox-5.
 */
export const RESERVE_RATIO_PERCENT = 15;

/**
 * The portion of a bond's on-chain capacity actually offered to stakers.
 *
 * The Endowment sets it and the rest of the on-chain capacity is an operational
 * buffer, so it cannot be read from the chain. Keyed by bond index, in sats.
 *
 * TODO: source this from the bond parameters service. Mitchell projects these
 * in Attio and has the API calls; we need those details to replace the map. A
 * bond with no entry falls back to its on-chain capacity.
 */
export const BOND_OFFERING_SATS: Record<number, string> = {};

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
 * Enough projected bonds to fill the timeline. It trims to TIMELINE_BOND_LIMIT,
 * so this only needs to cover the case where few bonds exist on chain.
 */
export const SCHEDULED_BONDS_AHEAD = TIMELINE_BOND_LIMIT;

/** TODO: no destination exists yet. Fill in when the pages are built. */
export const STAKING_LINKS = {
  howToParticipate: '',
  estimateYield: '',
  registerInterest: '',
  allBondTransactions: '',
  allTransactions: '',
  allCycles: '',
  stackingTracker: 'https://www.stacking-tracker.com/',
};
