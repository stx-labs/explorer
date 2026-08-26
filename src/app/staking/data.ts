import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { getApiUrl } from '@/common/utils/network-utils';

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
    `${apiUrl}/extended/v3/staking/bonds/${index}/registrations?limit=200`,
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
  const response = await stacksAPIFetch(`${apiUrl}/extended/v2/pox/cycles?limit=${limit}`, {
    cache: 'default',
    next: { revalidate: REVALIDATE_SECONDS, tags: ['staking-pox-cycles'] },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch pox cycles: ${response.status}`);
  }
  const data: { results: PoxCycle[] } = await response.json();
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
 * Recent transactions that called the pox contract.
 *
 * Note this is not the same as the contract's address transactions: that
 * endpoint returns anything involving the address, including sBTC deposits that
 * merely touch it. Filtering by `contract_id` gives only calls to the contract
 * itself, which is what "Bitcoin Staking activity" means.
 */
export interface StakingActivityTx {
  tx_id: string;
  tx_status: string;
  sender_address: string;
  burn_block_time: number;
  block_height: number;
  function_name?: string;
}

export async function fetchStakingActivity(
  poxContractId: string,
  chain: string,
  api?: string,
  limit = 10,
  functionName?: string
): Promise<StakingActivityTx[]> {
  const apiUrl = getApiUrl(chain, api);
  // The API filters by function name server-side, so a filtered feed is still a
  // true feed of that action rather than a filtered page of a mixed one.
  const params = new URLSearchParams({
    limit: String(limit),
    contract_id: poxContractId,
  });
  if (functionName) params.set('function_name', functionName);
  const response = await stacksAPIFetch(`${apiUrl}/extended/v1/tx?${params}`, {
    cache: 'default',
    next: {
      revalidate: REVALIDATE_SECONDS,
      tags: ['staking-activity', `staking-activity-${functionName ?? 'all'}`],
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch staking activity: ${response.status}`);
  }
  const data: {
    results?: {
      tx_id: string;
      tx_status: string;
      sender_address: string;
      burn_block_time: number;
      block_height: number;
      contract_call?: { function_name?: string };
    }[];
  } = await response.json();
  return (data.results ?? []).map(tx => ({
    tx_id: tx.tx_id,
    tx_status: tx.tx_status,
    sender_address: tx.sender_address,
    burn_block_time: tx.burn_block_time,
    block_height: tx.block_height,
    function_name: tx.contract_call?.function_name,
  }));
}
