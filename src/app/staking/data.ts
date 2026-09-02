import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { getApiUrl } from '@/common/utils/network-utils';

import { DISTRIBUTIONS_PER_BOND, GENESIS_BOND_INDEX } from './consts';

/**
 * Shapes returned by /extended/v3/staking/*. These are not covered by
 * @stacks/blockchain-api-client, so they are declared here. Replace them with
 * generated types if the client adds them.
 *
 * Amount units: `btc` fields are sats. `stx` fields are microSTX, matching the
 * rest of the API. Both arrive as strings and are kept as strings here so that
 * large values survive without precision loss; convert with BigInt at the edge.
 */
export type BondStatus = 'upcoming' | 'active' | (string & {});

export interface BondParameters {
  target_rate_bps: number;
  stx_value_ratio: number;
  minimum_stx_ratio: number;
  btc_capacity: string;
}

export interface BondSchedulePoint {
  bitcoin_height: number;
  pox_cycle: number;
}

export interface Bond {
  index: number;
  pox_version: string;
  status: BondStatus;
  parameters: BondParameters;
  registrations: {
    allowed_count: number;
    registered_count: number;
  };
  schedule: {
    activation: BondSchedulePoint;
    unlock: BondSchedulePoint;
  };
  balances: {
    locked: { btc: string; stx: string };
    paid_out: { btc: string };
  };
  /** Present on the detail endpoint; the bond's creation transaction. */
  transaction?: {
    tx_id: string;
    block: { height: number; hash: string; time: number };
    bitcoin_block: { height: number; time: number };
  };
}

/**
 * One enrollment's size, without whose it is.
 *
 * The breakdown shows proportions, so the staker address has no job on the
 * page and is dropped rather than shipped to the browser unused.
 */
export interface EnrollmentShare {
  btc: string;
}

export interface BondRegistration {
  staker: string;
  signer: string;
  type: string;
  balances: { btc: string; stx: string };
}

interface CursorPaginated<T> {
  total: number;
  limit: number;
  cursor: { next: string | null; previous: string | null; current: string | null };
  results: T[];
}

const REVALIDATE_SECONDS = 60;

export interface BondsPage {
  bonds: Bond[];
  /** How many bonds exist, which can exceed the number fetched. */
  total: number;
}

export async function fetchBonds(chain: string, api?: string): Promise<BondsPage> {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(`${apiUrl}/extended/v3/staking/bonds?limit=50`, {
    cache: 'default',
    next: { revalidate: REVALIDATE_SECONDS, tags: ['staking-bonds'] },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch bonds: ${response.status}`);
  }
  const data: CursorPaginated<Bond> = await response.json();
  const bonds = [...(data.results ?? [])].sort((a, b) => b.index - a.index);
  // `total` is the count on chain, not the count returned, so the UI can say
  // how many bonds it is not showing.
  return { bonds, total: data.total ?? bonds.length };
}

/**
 * A page of bonds.
 *
 * The endpoint pages by cursor rather than offset — `offset` is accepted and
 * ignored — and the cursor is the bond index the page starts at, running down
 * from there. Callers that want a page number derive the cursor from the
 * highest index, which `fetchHighestBondIndex` reads.
 */
export interface BondsCursorPage extends BondsPage {
  nextCursor?: string;
  previousCursor?: string;
}

/**
 * Every paged endpoint used here rejects a limit above this. Requests are
 * clamped rather than trusted: asking for more returns a 400, which reads as an
 * empty result and silently produces a confident zero downstream.
 */
const MAX_PAGE_LIMIT = 50;

/** The burnchain rewards endpoint allows a larger page than the rest. */
const MAX_PAGE_LIMIT_REWARDS = 250;

export async function fetchBondsPage(
  chain: string,
  api?: string,
  limit = MAX_PAGE_LIMIT,
  cursor?: string
): Promise<BondsCursorPage> {
  const apiUrl = getApiUrl(chain, api);
  const params = new URLSearchParams({ limit: String(Math.min(limit, MAX_PAGE_LIMIT)) });
  if (cursor !== undefined) params.set('cursor', cursor);
  const response = await stacksAPIFetch(`${apiUrl}/extended/v3/staking/bonds?${params}`, {
    cache: 'default',
    next: { revalidate: REVALIDATE_SECONDS, tags: ['staking-bonds'] },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch bonds: ${response.status}`);
  }
  const data: CursorPaginated<Bond> = await response.json();
  const bonds = [...(data.results ?? [])].sort((a, b) => b.index - a.index);
  return {
    bonds,
    total: data.total ?? bonds.length,
    nextCursor: data.cursor?.next ?? undefined,
    previousCursor: data.cursor?.previous ?? undefined,
  };
}

/**
 * The newest bond's index and how many exist, read from the first page. Paging
 * by number counts down from the index rather than assuming it equals the
 * total, which only holds while no bond has ever been skipped.
 */
export async function fetchHighestBondIndex(
  chain: string,
  api?: string
): Promise<{ highestIndex?: number; total: number }> {
  const page = await fetchBondsPage(chain, api, 1);
  return { highestIndex: page.bonds[0]?.index, total: page.total };
}

export async function fetchBond(index: number, chain: string, api?: string): Promise<Bond> {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(`${apiUrl}/extended/v3/staking/bonds/${index}`, {
    cache: 'default',
    next: { revalidate: REVALIDATE_SECONDS, tags: [`staking-bond-${index}`] },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch bond ${index}: ${response.status}`);
  }
  return response.json();
}

export async function fetchBondRegistrations(
  index: number,
  chain: string,
  api?: string
): Promise<BondRegistration[]> {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(
    `${apiUrl}/extended/v3/staking/bonds/${index}/registrations?limit=${MAX_PAGE_LIMIT}`,
    {
      cache: 'default',
      next: { revalidate: REVALIDATE_SECONDS, tags: [`staking-bond-${index}-registrations`] },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch registrations for bond ${index}: ${response.status}`);
  }
  const data: CursorPaginated<BondRegistration> = await response.json();
  return data.results ?? [];
}

export async function fetchPoxInfo(chain: string, api?: string): Promise<PoxInfo> {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(`${apiUrl}/v2/pox`, {
    cache: 'default',
    next: { revalidate: REVALIDATE_SECONDS, tags: ['staking-pox'] },
  });
  return response.json();
}

export interface PoxCycle {
  cycle_number: number;
  block_height: number;
  total_weight: number;
  total_stacked_amount: string;
  total_signers: number;
}

export async function fetchPoxCycles(chain: string, api?: string, limit = 10): Promise<PoxCycle[]> {
  const apiUrl = getApiUrl(chain, api);
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await stacksAPIFetch(`${apiUrl}/extended/v2/pox/cycles?${params}`, {
    cache: 'default',
    next: { revalidate: REVALIDATE_SECONDS, tags: ['staking-pox-cycles'] },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch pox cycles: ${response.status}`);
  }
  const data: { results?: PoxCycle[] } = await response.json();
  return data.results ?? [];
}

export interface StakingSignerManager {
  signer: string;
  signer_key: string;
}

/**
 * Current staker count across all signer managers.
 *
 * This is deliberately server-side and cached. There is no aggregate endpoint,
 * so it costs one request to list the signer managers plus one per manager, and
 * fanning that out from the browser on every page load trips rate limiting. Only
 * each manager's `total` is needed, so requests use limit=1 and go out in small
 * batches.
 *
 * This is a snapshot of the present. /extended/v3/staking/* takes no cycle
 * parameter, so past cycles cannot be reconstructed from it. That is why the
 * stacker count is a current-only stat and is absent from the previous-cycles
 * table.
 */
const STAKER_COUNT_BATCH_SIZE = 4;
const STAKER_COUNT_REVALIDATE_SECONDS = 300;
const STAKER_COUNT_MAX_RETRIES = 3;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Reads one manager's staker `total`, retrying on rate limiting.
 *
 * Returns undefined, never 0, when the count could not be read. Treating a
 * failed request as zero silently understates the network-wide total, which is
 * worse than showing nothing: a wrong number looks authoritative.
 */
async function fetchStakerTotalForManager(
  apiUrl: string,
  manager: string
): Promise<number | undefined> {
  for (let attempt = 0; attempt < STAKER_COUNT_MAX_RETRIES; attempt++) {
    const response = await stacksAPIFetch(
      `${apiUrl}/extended/v3/staking/signers/${encodeURIComponent(manager)}/stakers?limit=1`,
      {
        cache: 'default',
        next: { revalidate: STAKER_COUNT_REVALIDATE_SECONDS, tags: ['staking-stakers'] },
      }
    );
    if (response.ok) {
      const page: CursorPaginated<unknown> = await response.json();
      return page.total ?? 0;
    }
    if (response.status !== 429) return undefined;
    await delay(500 * (attempt + 1));
  }
  return undefined;
}

export async function fetchCurrentStakerCount(
  chain: string,
  api?: string
): Promise<number | undefined> {
  const apiUrl = getApiUrl(chain, api);
  try {
    const managers: string[] = [];
    let cursor: string | null = null;
    do {
      const params = new URLSearchParams({ limit: '100' });
      if (cursor) params.set('cursor', cursor);
      const response = await stacksAPIFetch(`${apiUrl}/extended/v3/staking/signers?${params}`, {
        cache: 'default',
        next: {
          revalidate: STAKER_COUNT_REVALIDATE_SECONDS,
          tags: ['staking-signer-managers'],
        },
      });
      if (!response.ok) return undefined;
      const page: CursorPaginated<StakingSignerManager> = await response.json();
      managers.push(...(page.results ?? []).map(r => r.signer));
      cursor = page.cursor?.next ?? null;
    } while (cursor);

    let total = 0;
    for (let i = 0; i < managers.length; i += STAKER_COUNT_BATCH_SIZE) {
      const batch = managers.slice(i, i + STAKER_COUNT_BATCH_SIZE);
      const counts = await Promise.all(
        batch.map(manager => fetchStakerTotalForManager(apiUrl, manager))
      );
      // Any unreadable manager makes the sum an undercount, so report nothing
      // rather than a total we know is wrong.
      if (counts.some(count => count === undefined)) return undefined;
      total += counts.reduce<number>((sum, count) => sum + (count ?? 0), 0);
    }
    return total;
  } catch {
    // A missing stacker count should never take down the page.
    return undefined;
  }
}

/**
 * Per-cycle stacking rewards, read straight from the pox contract.
 *
 * These are read-only functions, so each is a single cheap call and works for
 * any past cycle. That matters because it means we do not have to hunt through
 * the contract's event log to find what a cycle paid out.
 *
 * `get-rewards-per-token-for-cycle` returns rewards per micro-STX, scaled up by
 * 1e18. `get-total-shares-staked-for-cycle` returns the micro-STX staked. The
 * `none` argument on both means "STX-only stacking" rather than a bond.
 *
 * Cycles before pox-5 return 0, since this contract has no record of them.
 */
export interface CycleRewards {
  cycleNumber: number;
  rewardsPerMicroStx: bigint;
  stakedMicroStx: bigint;
}

function parseUintResult(result: string | undefined): bigint {
  // A Clarity uint comes back as "0x01" followed by a 16-byte hex number.
  if (!result || !result.startsWith('0x01')) return BigInt(0);
  try {
    return BigInt(`0x${result.slice(4)}`);
  } catch {
    return BigInt(0);
  }
}

async function callPoxReadOnly(
  apiUrl: string,
  poxContractId: string,
  functionName: string,
  cycleNumber: number
): Promise<bigint> {
  const [contractAddress, contractName] = poxContractId.split('.');
  if (!contractAddress || !contractName) return BigInt(0);

  const cycleArg = `0x01${cycleNumber.toString(16).padStart(32, '0')}`;
  const noneArg = '0x09';

  const response = await stacksAPIFetch(
    `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: contractAddress, arguments: [cycleArg, noneArg] }),
      cache: 'default',
      next: {
        revalidate: REVALIDATE_SECONDS,
        tags: [`staking-cycle-rewards-${cycleNumber}`],
      },
    }
  );
  if (!response.ok) return BigInt(0);
  const data: { okay?: boolean; result?: string } = await response.json();
  if (!data.okay) return BigInt(0);
  return parseUintResult(data.result);
}

export async function fetchCycleRewards(
  cycleNumbers: number[],
  poxContractId: string,
  chain: string,
  api?: string
): Promise<Record<number, CycleRewards>> {
  const apiUrl = getApiUrl(chain, api);
  const byCycle: Record<number, CycleRewards> = {};

  const results = await Promise.all(
    cycleNumbers.map(async cycleNumber => {
      const [rewardsPerMicroStx, stakedMicroStx] = await Promise.all([
        callPoxReadOnly(apiUrl, poxContractId, 'get-rewards-per-token-for-cycle', cycleNumber),
        callPoxReadOnly(apiUrl, poxContractId, 'get-total-shares-staked-for-cycle', cycleNumber),
      ]);
      return { cycleNumber, rewardsPerMicroStx, stakedMicroStx };
    })
  );

  results.forEach(result => {
    byCycle[result.cycleNumber] = result;
  });
  return byCycle;
}

/**
 * Bitcoin Staking activity, as events rather than transactions.
 *
 * One `calculate-rewards` transaction pays every active bond and emits a
 * `bond-distribution` event for each, so a transaction list would show a single
 * opaque row where the page wants one per bond. Events carry the amounts;
 * transactions carry the block and timestamp, so both are needed.
 */
export type ActivityGroup = 'distributions' | 'enrollments' | 'unlocks' | 'bonds';

/** Which contract functions belong to each of the page's filters. */
export const ACTIVITY_GROUP_FUNCTIONS: Record<ActivityGroup, string[]> = {
  distributions: ['calculate-rewards'],
  enrollments: ['register-for-bond', 'update-bond-registration', 'stake', 'stake-update'],
  unlocks: ['unstake', 'unstake-sbtc'],
  bonds: ['setup-bond'],
};

export interface StakingActivityEvent {
  txId: string;
  txStatus: string;
  blockHeight: number;
  burnBlockTime: number;
  sender: string;
  group: ActivityGroup;
  /** Headline label, e.g. "Reward distribution". */
  label: string;
  /** Qualifier under the label, e.g. "Bond 306". */
  detail?: string;
  /** The bond the event belongs to, for filtering without parsing the label. */
  bondIndex?: number;
  /** Amount moved, already formatted with its unit. */
  amount?: string;
  /** Running total paid to that bond, where the event reports one. */
  cumulative?: string;
}

interface RawTx {
  tx_id: string;
  tx_status: string;
  sender_address: string;
  burn_block_time: number;
  block_height: number;
  contract_call?: { function_name?: string };
}

async function fetchTxsByFunction(
  apiUrl: string,
  poxContractId: string,
  functionName: string,
  limit: number,
  offset = 0
): Promise<RawTx[]> {
  const params = new URLSearchParams({
    limit: String(Math.min(limit, MAX_PAGE_LIMIT)),
    offset: String(offset),
    contract_id: poxContractId,
    function_name: functionName,
  });
  const response = await stacksAPIFetch(`${apiUrl}/extended/v1/tx?${params}`, {
    cache: 'default',
    next: { revalidate: REVALIDATE_SECONDS, tags: [`staking-activity-${functionName}`] },
  });
  if (!response.ok) return [];
  const data: { results?: RawTx[] } = await response.json();
  return data.results ?? [];
}

/** Reads `(key uN)` pairs out of a Clarity tuple's printed form. */
export function readUint(repr: string, key: string): bigint | undefined {
  const match = new RegExp(`\\(${key} u(\\d+)\\)`).exec(repr);
  return match ? BigInt(match[1]) : undefined;
}

export function readTopic(repr: string): string | undefined {
  return /\(topic "([^"]+)"\)/.exec(repr)?.[1];
}

async function fetchTxEvents(apiUrl: string, txId: string): Promise<string[]> {
  const response = await stacksAPIFetch(`${apiUrl}/extended/v1/tx/${txId}`, {
    cache: 'default',
    next: { revalidate: REVALIDATE_SECONDS, tags: [`staking-tx-${txId}`] },
  });
  if (!response.ok) return [];
  const data: { events?: { contract_log?: { value?: { repr?: string } } }[] } =
    await response.json();
  return (data.events ?? [])
    .map(event => event.contract_log?.value?.repr)
    .filter((repr): repr is string => !!repr);
}

const SATS_PER_BTC = 100_000_000;
const REWARDS_PRECISION_DIVISOR = BigInt('1000000000000000000');

/**
 * Total paid to a bond so far, from a distribution event.
 *
 * The event reports a per-sat rate rather than a running total, so it has to be
 * multiplied back out by what the bond holds.
 */
export function readCumulativePaidSats(repr: string): bigint | undefined {
  const perSat = readUint(repr, 'cumulative-rewards-per-sat');
  const staked = readUint(repr, 'bond-staked-sats');
  if (perSat === undefined || staked === undefined) return undefined;
  return (perSat * staked) / REWARDS_PRECISION_DIVISOR;
}

function formatSats(sats: bigint): string {
  const btc = Number(sats) / SATS_PER_BTC;
  if (btc === 0) return '0 BTC';
  if (btc < 0.0001) return '<0.0001 BTC';
  return `${btc.toLocaleString(undefined, { maximumFractionDigits: 4 })} BTC`;
}

/** Parsed locally: utils imports from this module, so it cannot be imported back. */
function parseAmount(value: string | undefined | null): bigint {
  if (!value) return BigInt(0);
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

/** "Genesis" for the first bond, "Bond N" for the rest. */
function bondName(index?: number): string | undefined {
  if (index === undefined) return undefined;
  return index === GENESIS_BOND_INDEX ? 'Genesis' : `Bond ${index}`;
}

function joinDetail(...parts: (string | undefined)[]): string | undefined {
  const kept = parts.filter(Boolean);
  return kept.length > 0 ? kept.join(' · ') : undefined;
}

/**
 * Which of the bond's distributions this one is.
 *
 * Distributions land on the chain-wide grid and a term spans exactly
 * DISTRIBUTIONS_PER_BOND of them, so the ordinal is how many grid steps have
 * passed since the bond started rather than anything the event reports.
 */
function describeDistribution(bond?: Bond, calculationHeight?: bigint): string | undefined {
  const activation = bond?.schedule?.activation?.bitcoin_height;
  const unlock = bond?.schedule?.unlock?.bitcoin_height;
  if (activation === undefined || unlock === undefined || calculationHeight === undefined) {
    return undefined;
  }
  const cadence = (unlock - activation) / DISTRIBUTIONS_PER_BOND;
  if (cadence <= 0) return undefined;
  const ordinal = Math.floor((Number(calculationHeight) - activation) / cadence) + 1;
  if (ordinal < 1 || ordinal > DISTRIBUTIONS_PER_BOND) return undefined;
  return `${ordinal} of ${DISTRIBUTIONS_PER_BOND}`;
}

/**
 * The bond a non-distribution call touched, and what it moved.
 *
 * Each of these functions prints a topic naming its bond, so the row can say
 * which bond it belongs to without parsing the function's arguments.
 */
function describeContractCall(
  fn: string,
  reprs: string[],
  bondsByIndex: Map<number, Bond>
): { text?: string; bondIndex?: number; amount?: string } {
  const find = (topic: string) => reprs.find(repr => readTopic(repr) === topic);

  if (fn === 'setup-bond') {
    const repr = find('setup-bond');
    if (!repr) return {};
    const index = readUint(repr, 'bond-index');
    const cycle = readUint(repr, 'first-reward-cycle');
    const bondIndex = index !== undefined ? Number(index) : undefined;
    return {
      // A bond has no bonded amount at setup: this call runs before enrollment
      // opens, so the only size the chain knows here is the offering the bond
      // was created with.
      text: joinDetail(bondName(bondIndex), cycle !== undefined ? `cycle ${cycle}` : undefined),
      bondIndex,
      amount:
        bondIndex !== undefined
          ? formatSats(parseAmount(bondsByIndex.get(bondIndex)?.parameters?.btc_capacity))
          : undefined,
    };
  }

  if (fn === 'stake' || fn === 'stake-update') {
    const repr = find('stake') ?? find('stake-update');
    if (!repr) return {};
    const microStx = readUint(repr, 'amount-ustx');
    // Staked STX is not tied to a bond, so the row names when it unlocks
    // rather than which bond it belongs to.
    const unlockCycle = readUint(repr, 'unlock-cycle');
    return {
      text: unlockCycle !== undefined ? `Unlocks cycle ${unlockCycle}` : undefined,
      amount: microStx !== undefined ? formatMicroStx(microStx) : undefined,
    };
  }

  const repr = find('register-for-bond') ?? find('update-bond-registration') ?? find('unstake');
  const index = repr ? readUint(repr, 'bond-index') : undefined;
  const bondIndex = index !== undefined ? Number(index) : undefined;
  return { text: bondName(bondIndex), bondIndex };
}

function formatMicroStx(microStx: bigint): string {
  const stx = Number(microStx) / 1_000_000;
  return `${stx.toLocaleString(undefined, { maximumFractionDigits: 0 })} STX`;
}

/**
 * When a burn block was mined.
 *
 * Not every height has a record, so this walks forward a few blocks rather than
 * giving up on the first gap. A cycle boundary is a burn height, and the block
 * that lands on or just after it is the one that opened the cycle.
 */
/**
 * A finished cycle's boundary never moves, so its lookup is cached for far
 * longer than live chain data. The 60-second default would re-fetch a settled
 * fact on nearly every render.
 */
const SETTLED_REVALIDATE_SECONDS = 24 * 60 * 60;

export async function fetchBurnBlockTimeMs(
  height: number,
  chain: string,
  api?: string
): Promise<number | undefined> {
  const MAX_PROBES = 5;
  const apiUrl = getApiUrl(chain, api);
  for (let offset = 0; offset < MAX_PROBES; offset++) {
    try {
      const response = await stacksAPIFetch(
        `${apiUrl}/extended/v2/burn-blocks/${height + offset}`,
        {
          cache: 'default',
          next: { revalidate: SETTLED_REVALIDATE_SECONDS, tags: [`burn-block-${height + offset}`] },
        }
      );
      if (!response.ok) continue;
      const data: { burn_block_time?: number } = await response.json();
      if (typeof data.burn_block_time === 'number') return data.burn_block_time * 1000;
    } catch {
      // Try the next height rather than failing the whole lookup.
    }
  }
  return undefined;
}

/**
 * The moment each cycle ended, read from the chain rather than projected.
 *
 * A cycle ends where the next one's reward phase begins. Only cycles that show
 * a rate need this, so the cost tracks the rows that use it.
 */
export async function fetchCycleEndTimes(
  cycleNumbers: number[],
  firstBurnchainBlockHeight: number,
  rewardCycleLength: number,
  chain: string,
  api?: string
): Promise<Record<number, number>> {
  if (!rewardCycleLength) return {};
  const entries = await Promise.all(
    cycleNumbers.map(async cycleNumber => {
      const endHeight = firstBurnchainBlockHeight + (cycleNumber + 1) * rewardCycleLength;
      const endedMs = await fetchBurnBlockTimeMs(endHeight, chain, api);
      return [cycleNumber, endedMs] as const;
    })
  );
  const byCycle: Record<number, number> = {};
  for (const [cycleNumber, endedMs] of entries) {
    if (endedMs !== undefined) byCycle[cycleNumber] = endedMs;
  }
  return byCycle;
}

/** Burnchain reward pages needed to cover one cycle, with room to spare. */
const MAX_ACCRUAL_PAGES = 12;

/**
 * Bitcoin paid to reward addresses since a cycle began, in sats.
 *
 * The contract credits stackers once per distribution, so between distributions
 * its figure sits still while Bitcoin keeps arriving. This measures what has
 * actually landed. Payouts for the running cycle are the newest rows, so this
 * pages from the start and stops on crossing the cycle boundary: no offset
 * arithmetic, unlike reaching back to an arbitrary past cycle.
 *
 * Undefined if the boundary is not reached within the page budget, since a
 * short sum would read as a real figure.
 */
export async function fetchCycleAccruedSats(
  cycleStartHeight: number,
  chain: string,
  api?: string
): Promise<bigint | undefined> {
  if (!cycleStartHeight) return undefined;
  const apiUrl = getApiUrl(chain, api);
  let total = BigInt(0);
  try {
    for (let page = 0; page < MAX_ACCRUAL_PAGES; page++) {
      const params = new URLSearchParams({
        limit: String(MAX_PAGE_LIMIT_REWARDS),
        offset: String(page * MAX_PAGE_LIMIT_REWARDS),
      });
      const response = await stacksAPIFetch(`${apiUrl}/extended/v1/burnchain/rewards?${params}`, {
        cache: 'default',
        next: { revalidate: REVALIDATE_SECONDS, tags: ['staking-cycle-accrual'] },
      });
      if (!response.ok) return undefined;
      const data: { results?: { burn_block_height: number; reward_amount: string }[] } =
        await response.json();
      const rows = data.results ?? [];
      if (rows.length === 0) return total;
      for (const row of rows) {
        if (row.burn_block_height < cycleStartHeight) return total;
        total += parseAmount(row.reward_amount);
      }
      if (rows.length < MAX_PAGE_LIMIT_REWARDS) return total;
    }
  } catch {
    return undefined;
  }
  // Ran out of pages before reaching the boundary.
  return undefined;
}

export async function fetchStakingActivity(
  poxContractId: string,
  chain: string,
  api?: string,
  limit = 12,
  group?: ActivityGroup
): Promise<StakingActivityEvent[]> {
  const apiUrl = getApiUrl(chain, api);
  const groups = group ? [group] : (Object.keys(ACTIVITY_GROUP_FUNCTIONS) as ActivityGroup[]);

  // Rows name which distribution they are and which bond they belong to, both
  // of which come from the bond rather than the event. Only bonds currently
  // paying out can appear, so the newest page covers every row.
  const bondsByIndex = new Map<number, Bond>();
  try {
    const page = await fetchBondsPage(chain, api);
    for (const bond of page.bonds) bondsByIndex.set(bond.index, bond);
  } catch {
    // Rows still render; they just carry no bond context.
  }

  const perGroup = await Promise.all(
    groups.map(async activityGroup => {
      const functions = ACTIVITY_GROUP_FUNCTIONS[activityGroup];
      const txsByFunction = await Promise.all(
        functions.map(fn => fetchTxsByFunction(apiUrl, poxContractId, fn, limit))
      );
      const txs = txsByFunction.flat();

      const rows = await Promise.all(
        txs.map(async (tx): Promise<StakingActivityEvent[]> => {
          const base = {
            txId: tx.tx_id,
            txStatus: tx.tx_status,
            blockHeight: tx.block_height,
            burnBlockTime: tx.burn_block_time,
            sender: tx.sender_address,
            group: activityGroup,
          };

          // A rewards transaction expands into one row per bond it paid.
          if (tx.contract_call?.function_name === 'calculate-rewards') {
            const reprs = await fetchTxEvents(apiUrl, tx.tx_id);
            const calculationHeight = reprs
              .filter(repr => readTopic(repr) === 'calculate-rewards')
              .map(repr => readUint(repr, 'calculation-height'))
              .find(height => height !== undefined);
            return reprs
              .filter(repr => readTopic(repr) === 'bond-distribution')
              .map(repr => {
                const bondIndex = readUint(repr, 'bond-index');
                const rewards = readUint(repr, 'bond-rewards') ?? BigInt(0);
                const cumulativeSats = readCumulativePaidSats(repr);
                const index = bondIndex !== undefined ? Number(bondIndex) : undefined;
                const bond = index !== undefined ? bondsByIndex.get(index) : undefined;
                const ordinal = describeDistribution(bond, calculationHeight);
                return {
                  ...base,
                  label: 'Reward distribution',
                  detail: joinDetail(bondName(index), ordinal),
                  bondIndex: index,
                  amount: formatSats(rewards),
                  cumulative: cumulativeSats !== undefined ? formatSats(cumulativeSats) : undefined,
                };
              });
          }

          const fn = tx.contract_call?.function_name ?? '';
          const labels: Record<string, string> = {
            'register-for-bond': 'Enrolled',
            'update-bond-registration': 'Registration updated',
            unstake: 'Unstaked',
            'unstake-sbtc': 'sBTC unstaked',
            stake: 'STX paired',
            'stake-update': 'STX paired',
            'setup-bond': 'Bond created',
          };

          const reprs = await fetchTxEvents(apiUrl, tx.tx_id);
          const detail = describeContractCall(fn, reprs, bondsByIndex);
          return [
            {
              ...base,
              label: labels[fn] ?? 'Contract call',
              detail: detail.text,
              bondIndex: detail.bondIndex,
              amount: detail.amount,
            },
          ];
        })
      );
      return rows.flat();
    })
  );

  return perGroup
    .flat()
    .sort((a, b) => b.burnBlockTime - a.burnBlockTime || b.blockHeight - a.blockHeight)
    .slice(0, limit);
}

/**
 * BTC rewarded by all bonds to date, in sats.
 *
 * The bonds endpoint reports `paid_out`, which counts rewards that have been
 * claimed rather than rewarded, so a bond can accrue for months and still read
 * zero. What the programme has actually produced is the sum of
 * `total-bond-rewards` across every distribution, which each `calculate-rewards`
 * event reports.
 *
 * The contract stores no lifetime total per bond, so this has to be summed from
 * history. That is affordable because distributions are rare — two per reward
 * cycle — but it does grow, so the scan is bounded and the result cached.
 */
const DISTRIBUTION_TX_PAGE = MAX_PAGE_LIMIT;
const MAX_DISTRIBUTION_PAGES = 4;

export interface BondRewards {
  /** Total sats rewarded across all bonds. */
  totalSats: bigint;
  /** Sats rewarded per bond, keyed by bond index. */
  byBondIndex: Record<number, bigint>;
  /**
   * Sats diverted to bonds per reward cycle. A cycle with a share here paid
   * STX stackers less than one without, which is why its yield reads lower.
   */
  byCycle: Record<number, bigint>;
}

/**
 * BTC rewarded by bonds to date, in total and per bond.
 *
 * Both come from the same walk of distribution history, so the per-bond
 * breakdown costs nothing extra: each `calculate-rewards` transaction reports
 * `total-bond-rewards` for the whole waterfall and emits one
 * `bond-distribution` event per bond it paid.
 */
export async function fetchBondRewards(
  poxContractId: string,
  chain: string,
  api?: string
): Promise<BondRewards | undefined> {
  const apiUrl = getApiUrl(chain, api);
  try {
    // The transaction endpoint caps limit at 50, so history is paged.
    const txs: RawTx[] = [];
    for (let page = 0; page < MAX_DISTRIBUTION_PAGES; page++) {
      const batch = await fetchTxsByFunction(
        apiUrl,
        poxContractId,
        'calculate-rewards',
        DISTRIBUTION_TX_PAGE,
        page * DISTRIBUTION_TX_PAGE
      );
      txs.push(...batch);
      if (batch.length < DISTRIBUTION_TX_PAGE) break;
    }

    const settled = txs.filter(tx => tx.tx_status === 'success');
    if (settled.length === 0) return { totalSats: BigInt(0), byBondIndex: {}, byCycle: {} };

    const perTx = await Promise.all(
      settled.map(async tx => {
        const reprs = await fetchTxEvents(apiUrl, tx.tx_id);
        const summary = reprs.find(repr => readTopic(repr) === 'calculate-rewards');
        // A distribution we cannot read would understate the totals, so report
        // nothing rather than a number we know is short.
        if (!summary) return undefined;

        const perBond: Record<number, bigint> = {};
        reprs
          .filter(repr => readTopic(repr) === 'bond-distribution')
          .forEach(repr => {
            const index = readUint(repr, 'bond-index');
            const rewarded = readUint(repr, 'bond-rewards');
            if (index === undefined || rewarded === undefined) return;
            const key = Number(index);
            perBond[key] = (perBond[key] ?? BigInt(0)) + rewarded;
          });

        return {
          total: readUint(summary, 'total-bond-rewards') ?? BigInt(0),
          cycle: readUint(summary, 'stx-cycle'),
          perBond,
        };
      })
    );
    if (perTx.some(entry => entry === undefined)) return undefined;

    const byBondIndex: Record<number, bigint> = {};
    const byCycle: Record<number, bigint> = {};
    let totalSats = BigInt(0);
    perTx.forEach(entry => {
      if (!entry) return;
      totalSats += entry.total;
      // A cycle runs two distributions, so its share is the sum of both.
      if (entry.cycle !== undefined) {
        const cycle = Number(entry.cycle);
        byCycle[cycle] = (byCycle[cycle] ?? BigInt(0)) + entry.total;
      }
      Object.entries(entry.perBond).forEach(([index, sats]) => {
        const key = Number(index);
        byBondIndex[key] = (byBondIndex[key] ?? BigInt(0)) + sats;
      });
    });
    return { totalSats, byBondIndex, byCycle };
  } catch {
    // Missing totals should not take the page down.
    return undefined;
  }
}
