import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import type { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';

import { DISTRIBUTIONS_PER_BOND, REWARDS_PRECISION } from './consts';
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
  rewardsPerMicroStx: bigint;
  stakedMicroStx: bigint;
}

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
    if (result.stakedMicroStx === BigInt(0)) return;
    byCycle[result.cycleNumber] = result;
  });
  return byCycle;
}

const ACTIVITY_GROUPS = ['distributions', 'enrollments', 'unlocks', 'bonds'] as const;

export type ActivityGroup = (typeof ACTIVITY_GROUPS)[number];

export function parseActivityGroup(value?: string): ActivityGroup | undefined {
  return ACTIVITY_GROUPS.find(group => group === value);
}

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
          if (!response.ok) return;
          const data: { burn_block_time?: number } = await response.json();
          if (typeof data.burn_block_time === 'number') times[height] = data.burn_block_time * 1000;
        } catch {
          // The presentation layer supplies a marked date estimate when this lookup fails.
        }
      })
    );
  }
  return times;
}

const TX_WINDOW_PER_ROW = 3;

export interface StakingActivityResult {
  events: StakingActivityEvent[];
  incomplete: boolean;
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
  let incomplete = false;
  const activityFailure = (error: Error) => {
    incomplete = true;
    logError(error, 'Staking activity: partial fetch failure', { chain }, 'error');
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
        activityFailure(error as Error);
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
          txWindow,
          0,
          'no-store'
        ).catch(activityFailure);
        return txs.map(tx => ({ tx, activityGroup }));
      })
    )
  );
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

  return {
    events: rows
      .flat()
      .filter(event => bondIndex === undefined || event.bondIndex === bondIndex)
      .sort((a, b) => b.burnBlockTime - a.burnBlockTime || b.blockHeight - a.blockHeight)
      .slice(0, limit),
    incomplete,
  };
}

const DISTRIBUTION_TX_PAGE = MAX_PAGE_LIMIT;

export interface BondRewards {
  byBondIndex: Record<number, bigint>;
  byCycle: Record<number, bigint>;
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

// Temporary protection until the API provides aggregated bond reward history.
const MAX_REWARD_HISTORY_REQUESTS = 250;
const REWARD_HISTORY_TIMEOUT_MS = 15_000;

export async function fetchBondRewards(
  poxContractId: string,
  chain: string,
  api?: string
): Promise<BondRewards | undefined> {
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
    return await fetchBondRewardsHistory(getApiUrl(chain, api), poxContractId, fetchRequest);
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

async function fetchBondRewardsHistory(
  apiUrl: string,
  poxContractId: string,
  fetchRequest: typeof stacksAPIFetch
): Promise<BondRewards | undefined> {
  const txs: RawTx[] = [];
  const seenTxIds = new Set<string>();
  for (let offset = 0; ; offset += DISTRIBUTION_TX_PAGE) {
    const batch = await fetchTxsByFunction(
      apiUrl,
      poxContractId,
      'calculate-rewards',
      DISTRIBUTION_TX_PAGE,
      offset,
      'default',
      fetchRequest
    );
    if (batch.length && batch.every(tx => seenTxIds.has(tx.tx_id))) {
      throw new Error('Reward transaction history pagination did not advance');
    }
    batch.forEach(tx => seenTxIds.add(tx.tx_id));
    txs.push(...batch);
    if (batch.length < DISTRIBUTION_TX_PAGE) break;
  }

  const settled = Array.from(
    new Map(txs.filter(tx => tx.tx_status === 'success').map(tx => [tx.tx_id, tx])).values()
  );

  const perTx = [];
  // Settled event responses are cached for 24 hours; bound cold-cache reads as history grows.
  for (let start = 0; start < settled.length; start += 4) {
    perTx.push(
      ...(await Promise.all(
        settled.slice(start, start + 4).map(async tx => {
          const reprs = await fetchTxEvents(apiUrl, tx.tx_id, poxContractId, true, fetchRequest);
          const summary = reprs.find(repr => readTopic(repr) === 'calculate-rewards');
          if (!summary) return undefined;
          const total = readUint(summary, 'total-bond-rewards');
          const cycle = readUint(summary, 'stx-cycle');
          const calculationHeight = readUint(summary, 'calculation-height');
          if (total === undefined || cycle === undefined || calculationHeight === undefined)
            return undefined;

          const perBond: Record<number, bigint> = {};
          const principalByBond: Record<number, bigint | undefined> = {};
          for (const repr of reprs.filter(repr => readTopic(repr) === 'bond-distribution')) {
            const index = readUint(repr, 'bond-index');
            const rewarded = readUint(repr, 'bond-rewards');
            if (index === undefined || rewarded === undefined) return undefined;
            const key = Number(index);
            if (perBond[key] !== undefined) return undefined;
            principalByBond[key] = readUint(repr, 'bond-staked-sats');
            perBond[key] = (perBond[key] ?? BigInt(0)) + rewarded;
          }

          return {
            total,
            cycle,
            perBond,
            principalByBond,
            calculationHeight: Number(calculationHeight),
            timestampMs: (tx.block_time ?? tx.burn_block_time) * 1000,
          };
        })
      ))
    );
  }
  if (perTx.some(entry => entry === undefined)) return undefined;

  const byBondIndex: Record<number, bigint> = {};
  const byCycle: Record<number, bigint> = {};
  const lastCalculationHeightByCycle: Record<number, number> = {};
  const settlementsByBond: BondRewards['settlementsByBond'] = {};
  perTx.forEach(entry => {
    if (!entry) return;
    const cycle = Number(entry.cycle);
    lastCalculationHeightByCycle[cycle] = Math.max(
      lastCalculationHeightByCycle[cycle] ?? 0,
      entry.calculationHeight
    );
    byCycle[cycle] = (byCycle[cycle] ?? BigInt(0)) + entry.total;
    Object.entries(entry.perBond).forEach(([index, sats]) => {
      const key = Number(index);
      byBondIndex[key] = (byBondIndex[key] ?? BigInt(0)) + sats;
      (settlementsByBond[key] ??= []).push({
        calculationHeight: entry.calculationHeight,
        timestampMs: entry.timestampMs,
        principalSats: entry.principalByBond[key],
        rewardedSats: sats,
      });
    });
  });
  return { byBondIndex, byCycle, lastCalculationHeightByCycle, settlementsByBond };
}
