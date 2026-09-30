import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import type { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { ensureError, logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';

import type { ActivityGroup } from './activity-filter';
import { DISTRIBUTIONS_PER_BOND, REWARDS_PRECISION } from './consts';
import { getCycleStackerRewardsSatsBigInt } from './projections';
import { bondLabel, formatBtc, formatSbtc, formatStx, toBigInt } from './utils';

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
  transaction?: {
    tx_id: string;
    block: { height: number; hash: string; time: number };
    bitcoin_block: { height: number; time: number };
  };
}

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
  total: number;
  nextCursor: string | null;
}

const MAX_PAGE_LIMIT = 50;

export async function fetchBondsPage(
  chain: string,
  api?: string,
  limit = MAX_PAGE_LIMIT,
  cursor?: string
): Promise<BondsPage> {
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
    nextCursor: data.cursor?.next ?? null,
  };
}

export async function fetchBond(index: number, chain: string, api?: string): Promise<Bond> {
  const response = await stacksAPIFetch(
    `${getApiUrl(chain, api)}/extended/v3/staking/bonds/${index}`,
    {
      cache: 'default',
      next: { revalidate: REVALIDATE_SECONDS, tags: [`staking-bond-${index}`] },
    }
  );
  if (!response.ok) throw new Error(`Failed to fetch bond ${index}: ${response.status}`);
  return response.json();
}

export async function fetchHighestBondIndex(
  chain: string,
  api?: string
): Promise<{ highestIndex?: number; total: number }> {
  const page = await fetchBondsPage(chain, api, 1);
  return { highestIndex: page.bonds[0]?.index, total: page.total };
}

export async function fetchBondRegistrations(
  index: number,
  chain: string,
  api?: string
): Promise<BondRegistration[]> {
  const apiUrl = getApiUrl(chain, api);
  const registrations: BondRegistration[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams({ limit: String(MAX_PAGE_LIMIT) });
    if (cursor !== null) params.set('cursor', cursor);
    const response = await stacksAPIFetch(
      `${apiUrl}/extended/v3/staking/bonds/${index}/registrations?${params}`,
      {
        cache: 'default',
        next: { revalidate: REVALIDATE_SECONDS, tags: [`staking-bond-${index}-registrations`] },
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch registrations for bond ${index}: ${response.status}`);
    }
    const data: CursorPaginated<BondRegistration> = await response.json();
    if (
      !Array.isArray(data?.results) ||
      (data?.cursor?.next !== null && typeof data?.cursor?.next !== 'string')
    ) {
      throw new Error(`Invalid registrations page for bond ${index}`);
    }
    registrations.push(...data.results);
    cursor = data.cursor.next;
    if (cursor !== null) {
      if (seenCursors.has(cursor) || data.results.length === 0) {
        throw new Error(`Incomplete registrations for bond ${index}`);
      }
      seenCursors.add(cursor);
    }
  } while (cursor !== null);
  return registrations;
}

export async function fetchPoxInfo(chain: string, api?: string): Promise<PoxInfo> {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(`${apiUrl}/v2/pox`, {
    cache: 'default',
    next: { revalidate: REVALIDATE_SECONDS, tags: ['staking-pox'] },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch PoX info: ${response.status}`);
  }
  const data: PoxInfo = await response.json();
  if (!Number.isSafeInteger(data.current_cycle?.id)) {
    throw new Error('PoX info is missing the current cycle');
  }
  return data;
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

export interface CycleRewards {
  cycleNumber: number;
  rewardsSats: bigint;
  stakedMicroStx: bigint;
}

// Do not coerce missing or malformed API amounts to zero.
function parseAmount(value: unknown): bigint {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new Error('Invalid staking amount');
  }
  return BigInt(value);
}

// Compatibility for API deployments that do not have the v3 staking endpoints yet.
function parseUintResult(result: string | undefined): bigint {
  if (!result?.startsWith('0x01')) {
    throw new Error('PoX read-only call returned an invalid uint');
  }
  return BigInt(`0x${result.slice(4)}`);
}

async function callPoxReadOnly(
  apiUrl: string,
  poxContractId: string,
  functionName: string,
  cycleNumber: number
): Promise<bigint> {
  const [contractAddress, contractName] = poxContractId.split('.');
  if (!contractAddress || !contractName) {
    throw new Error(`Invalid PoX contract ID: ${poxContractId}`);
  }

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
  if (!response.ok) {
    throw new Error(`PoX read-only call failed: ${response.status}`);
  }
  const data: { okay?: boolean; result?: string } = await response.json();
  if (!data.okay) {
    throw new Error(`PoX read-only call failed: ${functionName}`);
  }
  return parseUintResult(data.result);
}

export async function fetchCycleRewards(
  cycleNumbers: number[],
  chain: string,
  api?: string,
  poxContractId?: string
): Promise<Record<number, CycleRewards>> {
  const apiUrl = getApiUrl(chain, api);
  const results = await Promise.all(
    Array.from(new Set(cycleNumbers)).map(async cycleNumber => {
      const response = await stacksAPIFetch(`${apiUrl}/extended/v3/staking/cycles/${cycleNumber}`, {
        cache: 'default',
        next: { revalidate: REVALIDATE_SECONDS, tags: [`staking-cycle-rewards-${cycleNumber}`] },
      });
      if (response.status === 404 && poxContractId) {
        const [rate, stakedMicroStx] = await Promise.all([
          callPoxReadOnly(apiUrl, poxContractId, 'get-rewards-per-token-for-cycle', cycleNumber),
          callPoxReadOnly(apiUrl, poxContractId, 'get-total-shares-staked-for-cycle', cycleNumber),
        ]);
        return {
          cycleNumber,
          stakedMicroStx,
          rewardsSats: getCycleStackerRewardsSatsBigInt(rate, stakedMicroStx),
        };
      }
      if (!response.ok) throw new Error(`Failed to fetch cycle ${cycleNumber}: ${response.status}`);
      const data = await response.json();
      if (data?.number !== cycleNumber) throw new Error('Staking summary returned another cycle');
      return {
        cycleNumber,
        stakedMicroStx: parseAmount(data?.locked?.stx?.stx_only),
        rewardsSats: parseAmount(data?.rewards?.btc?.waterfall?.stx_only),
      };
    })
  );
  return Object.fromEntries(results.map(result => [result.cycleNumber, result]));
}

export { parseActivityGroup } from './activity-filter';
export type { ActivityGroup } from './activity-filter';

const ACTIVITY_GROUP_FUNCTIONS: Record<ActivityGroup, string[]> = {
  distributions: ['calculate-rewards'],
  enrollments: ['register-for-bond', 'update-bond-registration'],
  unlocks: ['unstake-sbtc', 'announce-l1-early-exit'],
  bonds: ['setup-bond'],
};

export interface StakingActivityEvent {
  txId: string;
  txStatus: string;
  blockHeight: number;
  burnBlockTime: number;
  group: ActivityGroup;
  label: string;
  detail?: string;
  bondIndex?: number;
  amount?: string;
  amountUnavailable?: boolean;
  cumulative?: string;
}

interface RawTx {
  tx_id: string;
  tx_status: string;
  burn_block_time: number;
  block_time?: number;
  block_height: number;
  contract_call?: { function_name?: string };
}

async function fetchTxsByFunction(
  apiUrl: string,
  poxContractId: string,
  functionName: string,
  limit: number,
  offset = 0,
  cache: 'default' | 'no-store' = 'default',
  fetchRequest = stacksAPIFetch
): Promise<RawTx[]> {
  const transactions: RawTx[] = [];
  while (transactions.length < limit) {
    const pageLimit = Math.min(limit - transactions.length, MAX_PAGE_LIMIT);
    const params = new URLSearchParams({
      limit: String(pageLimit),
      offset: String(offset + transactions.length),
      contract_id: poxContractId,
      function_name: functionName,
    });
    const response = await fetchRequest(`${apiUrl}/extended/v1/tx?${params}`, {
      cache,
      next:
        cache === 'no-store'
          ? undefined
          : { revalidate: REVALIDATE_SECONDS, tags: ['staking-transactions'] },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${functionName} transactions: ${response.status}`);
    }
    const data: { results?: RawTx[] } = await response.json();
    const rows = data.results ?? [];
    transactions.push(...rows);
    if (rows.length < pageLimit) break;
  }
  return transactions;
}

export function readUint(repr: string, key: string): bigint | undefined {
  const match = new RegExp(`\\(${key} u(\\d+)\\)`).exec(repr);
  return match ? BigInt(match[1]) : undefined;
}

export function readTopic(repr: string): string | undefined {
  return /\(topic "([^"]+)"\)/.exec(repr)?.[1];
}

async function fetchTxEvents(
  apiUrl: string,
  txId: string,
  poxContractId: string,
  settled = false,
  fetchRequest = stacksAPIFetch
): Promise<string[]> {
  const eventLimit = 100;
  const reprs: string[] = [];
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({
      event_limit: String(eventLimit),
      event_offset: String(offset),
    });
    const response = await fetchRequest(`${apiUrl}/extended/v1/tx/${txId}?${params}`, {
      cache: 'default',
      next: {
        revalidate: settled ? SETTLED_REVALIDATE_SECONDS : REVALIDATE_SECONDS,
        tags: [`staking-tx-${txId}`],
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction ${txId}: ${response.status}`);
    }
    const data: {
      event_count?: number;
      events?: { contract_log?: { contract_id?: string; value?: { repr?: string } } }[];
    } = await response.json();
    const events = data.events ?? [];
    reprs.push(
      ...events
        .filter(event => event.contract_log?.contract_id === poxContractId)
        .map(event => event.contract_log?.value?.repr)
        .filter((repr): repr is string => !!repr)
    );
    offset += events.length;
    if (data.event_count !== undefined ? offset >= data.event_count : events.length < eventLimit) {
      return reprs;
    }
    if (events.length === 0) throw new Error(`Incomplete events for transaction ${txId}`);
  }
}

export function readCycleCreditedSats(repr: string): bigint | undefined {
  const perSat = readUint(repr, 'cumulative-rewards-per-sat');
  const staked = readUint(repr, 'bond-staked-sats');
  if (perSat === undefined || staked === undefined) return undefined;
  return (perSat * staked) / REWARDS_PRECISION;
}

function optionalBondLabel(index?: number): string | undefined {
  if (index === undefined) return undefined;
  return bondLabel(index);
}

function joinDetail(...parts: (string | undefined)[]): string | undefined {
  const kept = parts.filter(Boolean);
  return kept.length > 0 ? kept.join(' · ') : undefined;
}

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

function describeContractCall(
  fn: string,
  reprs: string[],
  bondsByIndex: Map<number, Bond>
): { text?: string; bondIndex?: number; amount?: string; amountUnavailable?: boolean } {
  const find = (topic: string) => reprs.find(repr => readTopic(repr) === topic);

  if (fn === 'setup-bond') {
    const repr = find('setup-bond');
    if (!repr) return {};
    const index = readUint(repr, 'bond-index');
    const cycle = readUint(repr, 'first-reward-cycle');
    const bondIndex = index !== undefined ? Number(index) : undefined;
    const capacitySats = toBigInt(
      bondIndex !== undefined ? bondsByIndex.get(bondIndex)?.parameters?.btc_capacity : undefined
    );
    return {
      text: joinDetail(
        optionalBondLabel(bondIndex),
        cycle !== undefined ? `cycle ${cycle}` : undefined
      ),
      bondIndex,
      amount: capacitySats !== undefined ? formatBtc(capacitySats) : undefined,
      amountUnavailable: bondIndex !== undefined && capacitySats === undefined,
    };
  }

  const repr = find(fn);
  const index = repr ? readUint(repr, 'bond-index') : undefined;
  const bondIndex = index !== undefined ? Number(index) : undefined;
  const sats = repr
    ? (readUint(repr, 'sats-total') ??
      readUint(repr, 'amount-sats-released') ??
      readUint(repr, 'amount-sats') ??
      readUint(repr, 'amount-withdrawn-sats'))
    : undefined;
  const pairedMicroStx = repr ? readUint(repr, 'amount-ustx') : undefined;
  return {
    text: joinDetail(
      optionalBondLabel(bondIndex),
      pairedMicroStx !== undefined ? `${formatStx(pairedMicroStx, 0)} paired` : undefined
    ),
    bondIndex,
    amount:
      sats !== undefined ? (fn === 'unstake-sbtc' ? formatSbtc(sats) : formatBtc(sats)) : undefined,
  };
}

const SETTLED_REVALIDATE_SECONDS = 24 * 60 * 60;

export async function fetchBurnBlockTimes(
  heights: number[],
  currentBurnHeight: number,
  chain: string,
  api?: string
): Promise<Record<number, number>> {
  const times: Record<number, number> = {};
  const failures: Error[] = [];
  const mined = Array.from(new Set(heights)).filter(
    height => height > 0 && height <= currentBurnHeight
  );
  // Bound concurrency on pages containing many historical bonds. Never substitute a nearby block.
  for (let start = 0; start < mined.length; start += 8) {
    await Promise.all(
      mined.slice(start, start + 8).map(async height => {
        try {
          const response = await stacksAPIFetch(
            `${getApiUrl(chain, api)}/extended/v2/burn-blocks/${height}`,
            {
              cache: 'default',
              next: { revalidate: SETTLED_REVALIDATE_SECONDS, tags: [`burn-block-${height}`] },
            }
          );
          if (response.status === 404) return;
          if (!response.ok) throw new Error(`Burn block lookup failed: ${response.status}`);
          const data: { burn_block_time?: number } = await response.json();
          if (typeof data.burn_block_time === 'number') times[height] = data.burn_block_time * 1000;
        } catch (error) {
          failures.push(ensureError(error));
        }
      })
    );
  }
  if (failures.length)
    logError(failures[0], 'Staking burn block dates: partial fetch failure', {
      chain,
      failureCount: failures.length,
    });
  return times;
}

const TX_WINDOW_PER_ROW = 3;

export interface StakingActivityResult {
  events: StakingActivityEvent[];
  /** At least one request failed. Independent of the bounded history window. */
  incomplete: boolean;
  historyTruncated?: boolean;
}

export async function fetchStakingActivity(
  poxContractId: string,
  chain: string,
  api?: string,
  limit = 12,
  group?: ActivityGroup,
  bondIndex?: number
): Promise<StakingActivityResult> {
  const apiUrl = getApiUrl(chain, api);
  const groups = group ? [group] : (Object.keys(ACTIVITY_GROUP_FUNCTIONS) as ActivityGroup[]);
  const txWindow = Math.max(limit, Math.min(limit * TX_WINDOW_PER_ROW, MAX_PAGE_LIMIT));
  const failures: Error[] = [];
  const activityFailure = (error: unknown) => {
    failures.push(ensureError(error));
    return [];
  };
  const readActivityEvents = async (tx: RawTx): Promise<string[] | undefined> => {
    try {
      return await fetchTxEvents(apiUrl, tx.tx_id, poxContractId, tx.tx_status === 'success');
    } catch {
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        return await fetchTxEvents(apiUrl, tx.tx_id, poxContractId, tx.tx_status === 'success');
      } catch (error) {
        activityFailure(error);
        return undefined;
      }
    }
  };

  const bondsByIndex = new Map<number, Bond>();
  const bondRequests = new Map<number, Promise<Bond | undefined>>();
  const page = await fetchBondsPage(chain, api).catch(error => {
    activityFailure(error);
    return undefined;
  });
  if (page) {
    for (const bond of page.bonds) bondsByIndex.set(bond.index, bond);
  }

  const pages = await Promise.all(
    groups.flatMap(activityGroup =>
      ACTIVITY_GROUP_FUNCTIONS[activityGroup].map(async functionName => {
        const txs = await fetchTxsByFunction(
          apiUrl,
          poxContractId,
          functionName,
          txWindow + 1,
          0,
          'no-store'
        ).catch(activityFailure);
        return txs.map(tx => ({ tx, activityGroup }));
      })
    )
  );
  const historyTruncated = bondIndex !== undefined && pages.flat().length > txWindow;
  const txs = pages
    .flat()
    .sort(
      (a, b) => b.tx.burn_block_time - a.tx.burn_block_time || b.tx.block_height - a.tx.block_height
    )
    .slice(0, txWindow);

  const rows: StakingActivityEvent[][] = [];
  // Avoid bursting up to 60 transaction-detail requests at the API at once.
  for (let start = 0; start < txs.length; start += 4) {
    rows.push(
      ...(await Promise.all(
        txs
          .slice(start, start + 4)
          .map(async ({ tx, activityGroup }): Promise<StakingActivityEvent[]> => {
            const base = {
              txId: tx.tx_id,
              txStatus: tx.tx_status,
              blockHeight: tx.block_height,
              burnBlockTime: tx.burn_block_time,
              group: activityGroup,
            };

            const settled = tx.tx_status === 'success';

            if (tx.contract_call?.function_name === 'calculate-rewards') {
              const reprs = await readActivityEvents(tx);
              if (!reprs) return [];
              const summary = reprs.find(repr => readTopic(repr) === 'calculate-rewards');
              const calculationHeight = summary
                ? readUint(summary, 'calculation-height')
                : undefined;
              const cycle = summary ? readUint(summary, 'stx-cycle') : undefined;
              return reprs
                .filter(repr => readTopic(repr) === 'bond-distribution')
                .flatMap(repr => {
                  const bondIndex = readUint(repr, 'bond-index');
                  const rewards = readUint(repr, 'bond-rewards');
                  if (bondIndex === undefined || rewards === undefined) return [];
                  const cumulativeSats = readCycleCreditedSats(repr);
                  const index = Number(bondIndex);
                  const bond = bondsByIndex.get(index);
                  const ordinal = describeDistribution(bond, calculationHeight);
                  return [
                    {
                      ...base,
                      label: 'Rewards credited',
                      detail: joinDetail(
                        optionalBondLabel(index),
                        ordinal,
                        cycle !== undefined ? `cycle ${cycle}` : undefined
                      ),
                      bondIndex: index,
                      amount: formatSbtc(rewards),
                      cumulative:
                        cumulativeSats !== undefined ? formatSbtc(cumulativeSats) : undefined,
                    },
                  ];
                });
            }

            const fn = tx.contract_call?.function_name ?? '';
            const labels: Record<string, string> = {
              'register-for-bond': 'Enrolled',
              'update-bond-registration': 'Registration updated',
              'unstake-sbtc': 'sBTC unstaked',
              'announce-l1-early-exit': 'Bitcoin released early',
              'setup-bond': 'Bond created',
            };

            const reprs = await readActivityEvents(tx);
            let bondLookupFailed = false;
            if (fn === 'setup-bond') {
              const setup = reprs?.find(repr => readTopic(repr) === 'setup-bond');
              const index = setup ? readUint(setup, 'bond-index') : undefined;
              if (index !== undefined && !bondsByIndex.has(Number(index))) {
                const key = Number(index);
                if (!bondRequests.has(key)) {
                  bondRequests.set(
                    key,
                    fetchBond(key, chain, api).catch(error => {
                      activityFailure(error);
                      return undefined;
                    })
                  );
                }
                const bond = await bondRequests.get(key);
                if (bond) bondsByIndex.set(key, bond);
                else bondLookupFailed = true;
              }
            }
            const detail = describeContractCall(fn, reprs ?? [], bondsByIndex);
            return [
              {
                ...base,
                label: labels[fn] ?? 'Contract call',
                detail: detail.text,
                bondIndex: detail.bondIndex,
                amount: detail.amount,
                amountUnavailable:
                  settled &&
                  (reprs === undefined || bondLookupFailed || detail.amountUnavailable === true),
              },
            ];
          })
      ))
    );
  }

  if (failures.length)
    logError(
      failures[0],
      'Staking activity: partial fetch failure',
      {
        chain,
        failureCount: failures.length,
      },
      'error'
    );
  return {
    events: rows
      .flat()
      .filter(event => bondIndex === undefined || event.bondIndex === bondIndex)
      .sort((a, b) => b.burnBlockTime - a.burnBlockTime || b.blockHeight - a.blockHeight)
      .slice(0, limit),
    incomplete: failures.length > 0,
    ...(historyTruncated ? { historyTruncated: true } : {}),
  };
}

export interface BondRewards {
  byBondIndex: Record<number, bigint>;
  lastCalculationHeightByCycle: Record<number, number>;
  settlementsByBond: Record<
    number,
    {
      calculationHeight: number;
      timestampMs: number;
      principalSats?: bigint;
      rewardedSats?: bigint;
    }[]
  >;
}

const MAX_REWARD_HISTORY_REQUESTS = 250;
const REWARD_HISTORY_TIMEOUT_MS = 15_000;

async function withRewardHistoryBudget<T>(
  load: (fetchRequest: typeof stacksAPIFetch) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('Reward history request timed out')),
    REWARD_HISTORY_TIMEOUT_MS
  );
  let requests = 0;
  const fetchRequest: typeof stacksAPIFetch = (url, options) => {
    if (controller.signal.aborted) throw controller.signal.reason;
    if (requests >= MAX_REWARD_HISTORY_REQUESTS) {
      throw new Error('Reward history request limit exceeded');
    }
    requests++;
    return stacksAPIFetch(url, { ...options, signal: controller.signal });
  };
  try {
    return await load(fetchRequest);
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

interface BondEvent {
  name: string;
  bond_index: number;
  transaction: { tx_id: string; event_index: number };
  block: { time: number };
  data?: {
    calculation?: { bitcoin_height: number; reward_cycle: number };
    rewards?: { btc: string };
    staked?: { btc: string };
  };
}

class StakingEndpointUnavailable extends Error {}

export async function fetchBondRewards(
  bondIndexes: number[],
  chain: string,
  api?: string,
  poxContractId?: string
): Promise<BondRewards> {
  return withRewardHistoryBudget(async fetchRequest => {
    const result: BondRewards = {
      byBondIndex: {},
      lastCalculationHeightByCycle: {},
      settlementsByBond: {},
    };
    const indexes = Array.from(new Set(bondIndexes));
    // Bound concurrency across bonds; each history follows its opaque cursor sequentially.
    for (let start = 0; start < indexes.length; start += 4) {
      await Promise.all(
        indexes.slice(start, start + 4).map(async index => {
          let cursor: string | null = null;
          const seenCursors = new Set<string>();
          const seenEvents = new Map<string, string>();
          let expectedEvents: number | undefined;
          result.byBondIndex[index] = BigInt(0);
          result.settlementsByBond[index] = [];
          do {
            const params = new URLSearchParams({ limit: String(MAX_PAGE_LIMIT) });
            if (cursor !== null) params.set('cursor', cursor);
            const response = await fetchRequest(
              `${getApiUrl(chain, api)}/extended/v3/staking/bonds/${index}/events?${params}`,
              {
                cache: 'default',
                next: { revalidate: REVALIDATE_SECONDS, tags: [`staking-bond-${index}-events`] },
              }
            );
            if (response.status === 404)
              throw new StakingEndpointUnavailable('Bond events endpoint unavailable');
            if (!response.ok)
              throw new Error(`Failed to fetch bond ${index} events: ${response.status}`);
            const page: CursorPaginated<BondEvent> = await response.json();
            if (
              !Array.isArray(page?.results) ||
              !Number.isSafeInteger(page.total) ||
              page.total < 0 ||
              (page?.cursor?.next !== null && typeof page?.cursor?.next !== 'string')
            ) {
              throw new Error(`Invalid events page for bond ${index}`);
            }
            expectedEvents ??= page.total;
            let newEvents = 0;
            for (const event of page.results) {
              if (
                event?.bond_index !== index ||
                typeof event.name !== 'string' ||
                !event.transaction?.tx_id ||
                !Number.isSafeInteger(event.transaction.event_index)
              ) {
                throw new Error(`Invalid event for bond ${index}`);
              }
              const key = `${event.transaction.tx_id}:${event.transaction.event_index}`;
              const contents = JSON.stringify(event);
              const previous = seenEvents.get(key);
              if (previous !== undefined) {
                if (previous !== contents) throw new Error(`Conflicting events for bond ${index}`);
                continue;
              }
              seenEvents.set(key, contents);
              newEvents++;
              if (event.name !== 'bond-distribution') continue;
              const calculation = event.data?.calculation;
              if (
                !calculation ||
                !Number.isSafeInteger(calculation.bitcoin_height) ||
                calculation.bitcoin_height < 0 ||
                !Number.isSafeInteger(calculation.reward_cycle) ||
                calculation.reward_cycle < 0 ||
                !Number.isSafeInteger(event.block?.time) ||
                event.block.time < 0
              ) {
                throw new Error(`Invalid distribution calculation for bond ${index}`);
              }
              const rewardedSats = parseAmount(event.data?.rewards?.btc);
              const principalSats = parseAmount(event.data?.staked?.btc);
              result.byBondIndex[index] += rewardedSats;
              result.settlementsByBond[index].push({
                calculationHeight: calculation.bitcoin_height,
                timestampMs: event.block.time * 1000,
                principalSats,
                rewardedSats,
              });
              const cycle = calculation.reward_cycle;
              result.lastCalculationHeightByCycle[cycle] = Math.max(
                result.lastCalculationHeightByCycle[cycle] ?? -1,
                calculation.bitcoin_height
              );
            }
            cursor = page.cursor.next;
            if (cursor !== null) {
              if (!newEvents || seenCursors.has(cursor)) {
                throw new Error(`Bond ${index} event pagination did not advance`);
              }
              seenCursors.add(cursor);
            }
          } while (cursor !== null);
          if (seenEvents.size < expectedEvents) {
            throw new Error(`Incomplete events for bond ${index}`);
          }
        })
      );
    }
    return result;
  }).catch(error => {
    if (error instanceof StakingEndpointUnavailable && poxContractId) {
      return fetchLegacyBondRewards(poxContractId, chain, api);
    }
    throw error;
  });
}

// A finished cycle's summary can precede its final calculation. Bond events prove
// settlement when available; cycles without bonds still need calculate-rewards logs.
export async function fetchCycleCalculationHeights(
  cycleEndHeights: Record<number, number>,
  poxContractId: string,
  chain: string,
  api?: string,
  knownHeights: Record<number, number> = {}
): Promise<Record<number, number>> {
  const heights = { ...knownHeights };
  const complete = () =>
    Object.entries(cycleEndHeights).every(([cycle, end]) => (heights[Number(cycle)] ?? -1) >= end);
  if (complete()) return heights;
  await forEachRewardCalculation(
    poxContractId,
    chain,
    api,
    (_tx, _reprs, cycle, height) => {
      if (cycleEndHeights[cycle] !== undefined) {
        heights[cycle] = Math.max(heights[cycle] ?? -1, height);
      }
    },
    complete
  );
  return heights;
}

async function forEachRewardCalculation(
  poxContractId: string,
  chain: string,
  api: string | undefined,
  visit: (tx: RawTx, reprs: string[], cycle: number, height: number) => void,
  complete: () => boolean = () => false
): Promise<void> {
  await withRewardHistoryBudget(async fetchRequest => {
    const apiUrl = getApiUrl(chain, api);
    const seenTxIds = new Set<string>();
    for (let offset = 0; ; offset += MAX_PAGE_LIMIT) {
      const batch = await fetchTxsByFunction(
        apiUrl,
        poxContractId,
        'calculate-rewards',
        MAX_PAGE_LIMIT,
        offset,
        'default',
        fetchRequest
      );
      if (batch.length && batch.every(tx => seenTxIds.has(tx.tx_id))) {
        throw new Error('Reward transaction history pagination did not advance');
      }
      const settled = batch.filter(tx => {
        const seen = seenTxIds.has(tx.tx_id);
        seenTxIds.add(tx.tx_id);
        return !seen && tx.tx_status === 'success';
      });
      for (let start = 0; start < settled.length; start += 4) {
        await Promise.all(
          settled.slice(start, start + 4).map(async tx => {
            const reprs = await fetchTxEvents(apiUrl, tx.tx_id, poxContractId, true, fetchRequest);
            const summary = reprs.find(repr => readTopic(repr) === 'calculate-rewards');
            const cycle = summary === undefined ? undefined : readUint(summary, 'stx-cycle');
            const height =
              summary === undefined ? undefined : readUint(summary, 'calculation-height');
            if (
              cycle === undefined ||
              height === undefined ||
              !Number.isSafeInteger(Number(cycle)) ||
              !Number.isSafeInteger(Number(height))
            ) {
              throw new Error('Invalid cycle calculation');
            }
            visit(tx, reprs, Number(cycle), Number(height));
          })
        );
        if (complete()) return;
      }
      if (batch.length < MAX_PAGE_LIMIT) return;
    }
  });
}

async function fetchLegacyBondRewards(
  poxContractId: string,
  chain: string,
  api?: string
): Promise<BondRewards> {
  const result: BondRewards = {
    byBondIndex: {},
    lastCalculationHeightByCycle: {},
    settlementsByBond: {},
  };
  await forEachRewardCalculation(poxContractId, chain, api, (tx, reprs, cycle, height) => {
    result.lastCalculationHeightByCycle[cycle] = Math.max(
      result.lastCalculationHeightByCycle[cycle] ?? -1,
      height
    );
    const seenBonds = new Set<number>();
    for (const repr of reprs.filter(repr => readTopic(repr) === 'bond-distribution')) {
      const index = readUint(repr, 'bond-index');
      const rewardedSats = readUint(repr, 'bond-rewards');
      if (
        index === undefined ||
        !Number.isSafeInteger(Number(index)) ||
        rewardedSats === undefined ||
        seenBonds.has(Number(index))
      ) {
        throw new Error('Invalid legacy bond distribution');
      }
      const key = Number(index);
      seenBonds.add(key);
      result.byBondIndex[key] = (result.byBondIndex[key] ?? BigInt(0)) + rewardedSats;
      (result.settlementsByBond[key] ??= []).push({
        calculationHeight: height,
        timestampMs: (tx.block_time ?? tx.burn_block_time) * 1000,
        principalSats: readUint(repr, 'bond-staked-sats'),
        rewardedSats,
      });
    }
  });
  return result;
}
