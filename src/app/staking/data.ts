import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import type { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { getApiUrl } from '@/common/utils/network-utils';

import { DISTRIBUTIONS_PER_BOND, REWARDS_PRECISION } from './consts';
import { bondLabel, formatBtc, formatStx, toBigInt } from './utils';

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
}

const MAX_PAGE_LIMIT = 50;

const MAX_PAGE_LIMIT_REWARDS = 250;

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
  };
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
  if (!response.ok) {
    throw new Error(`Failed to fetch PoX info: ${response.status}`);
  }
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
  enrollments: ['register-for-bond', 'update-bond-registration', 'stake', 'stake-update'],
  unlocks: ['unstake', 'unstake-sbtc'],
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
  cumulative?: string;
}

interface RawTx {
  tx_id: string;
  tx_status: string;
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
  if (!response.ok) {
    throw new Error(`Failed to fetch ${functionName} transactions: ${response.status}`);
  }
  const data: { results?: RawTx[] } = await response.json();
  return data.results ?? [];
}

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
  if (!response.ok) {
    throw new Error(`Failed to fetch transaction ${txId}: ${response.status}`);
  }
  const data: { events?: { contract_log?: { value?: { repr?: string } } }[] } =
    await response.json();
  return (data.events ?? [])
    .map(event => event.contract_log?.value?.repr)
    .filter((repr): repr is string => !!repr);
}

export function readCumulativePaidSats(repr: string): bigint | undefined {
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
): { text?: string; bondIndex?: number; amount?: string } {
  const find = (topic: string) => reprs.find(repr => readTopic(repr) === topic);

  if (fn === 'setup-bond') {
    const repr = find('setup-bond');
    if (!repr) return {};
    const index = readUint(repr, 'bond-index');
    const cycle = readUint(repr, 'first-reward-cycle');
    const bondIndex = index !== undefined ? Number(index) : undefined;
    return {
      text: joinDetail(
        optionalBondLabel(bondIndex),
        cycle !== undefined ? `cycle ${cycle}` : undefined
      ),
      bondIndex,
      amount:
        bondIndex !== undefined
          ? formatBtc(toBigInt(bondsByIndex.get(bondIndex)?.parameters?.btc_capacity))
          : undefined,
    };
  }

  if (fn === 'stake' || fn === 'stake-update') {
    const repr = find('stake') ?? find('stake-update');
    if (!repr) return {};
    const microStx = readUint(repr, 'amount-ustx');
    const unlockCycle = readUint(repr, 'unlock-cycle');
    return {
      text: unlockCycle !== undefined ? `Unlocks cycle ${unlockCycle}` : undefined,
      amount: microStx !== undefined ? formatStx(microStx, 0) : undefined,
    };
  }

  const repr = find('register-for-bond') ?? find('update-bond-registration') ?? find('unstake');
  const index = repr ? readUint(repr, 'bond-index') : undefined;
  const bondIndex = index !== undefined ? Number(index) : undefined;
  return { text: optionalBondLabel(bondIndex), bondIndex };
}

const SETTLED_REVALIDATE_SECONDS = 24 * 60 * 60;

async function fetchBurnBlockTimeMs(
  height: number,
  chain: string,
  api?: string
): Promise<number | undefined> {
  const MAX_PROBES = 5;
  const apiUrl = getApiUrl(chain, api);
  for (let offset = 0; offset < MAX_PROBES; offset++) {
    const response = await stacksAPIFetch(`${apiUrl}/extended/v2/burn-blocks/${height + offset}`, {
      cache: 'default',
      next: { revalidate: SETTLED_REVALIDATE_SECONDS, tags: [`burn-block-${height + offset}`] },
    }).catch(() => undefined);
    if (!response?.ok) continue;
    const data: { burn_block_time?: number } = await response.json();
    if (typeof data.burn_block_time === 'number') return data.burn_block_time * 1000;
  }
  return undefined;
}

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

const MAX_ACCRUAL_PAGES = 12;

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
        total += toBigInt(row.reward_amount);
      }
      if (rows.length < MAX_PAGE_LIMIT_REWARDS) return total;
    }
  } catch {
    return undefined;
  }
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

  const bondsByIndex = new Map<number, Bond>();
  const page = await fetchBondsPage(chain, api).catch(() => undefined);
  if (page) {
    for (const bond of page.bonds) bondsByIndex.set(bond.index, bond);
  }

  const pages = await Promise.all(
    groups.flatMap(activityGroup =>
      ACTIVITY_GROUP_FUNCTIONS[activityGroup].map(async functionName => {
        const txs = await fetchTxsByFunction(apiUrl, poxContractId, functionName, limit);
        return txs.map(tx => ({ tx, activityGroup }));
      })
    )
  );
  const txs = pages
    .flat()
    .sort(
      (a, b) => b.tx.burn_block_time - a.tx.burn_block_time || b.tx.block_height - a.tx.block_height
    )
    .slice(0, limit);

  const rows = await Promise.all(
    txs.map(async ({ tx, activityGroup }): Promise<StakingActivityEvent[]> => {
      const base = {
        txId: tx.tx_id,
        txStatus: tx.tx_status,
        blockHeight: tx.block_height,
        burnBlockTime: tx.burn_block_time,
        group: activityGroup,
      };

      if (tx.contract_call?.function_name === 'calculate-rewards') {
        const reprs = await fetchTxEvents(apiUrl, tx.tx_id);
        const calculationHeight = reprs
          .filter(repr => readTopic(repr) === 'calculate-rewards')
          .map(repr => readUint(repr, 'calculation-height'))
          .find(height => height !== undefined);
        return reprs
          .filter(repr => readTopic(repr) === 'bond-distribution')
          .flatMap(repr => {
            const bondIndex = readUint(repr, 'bond-index');
            const rewards = readUint(repr, 'bond-rewards');
            if (bondIndex === undefined || rewards === undefined) return [];
            const cumulativeSats = readCumulativePaidSats(repr);
            const index = Number(bondIndex);
            const bond = bondsByIndex.get(index);
            const ordinal = describeDistribution(bond, calculationHeight);
            return [
              {
                ...base,
                label: 'Reward distribution',
                detail: joinDetail(optionalBondLabel(index), ordinal),
                bondIndex: index,
                amount: formatBtc(rewards),
                cumulative: cumulativeSats !== undefined ? formatBtc(cumulativeSats) : undefined,
              },
            ];
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

  return rows
    .flat()
    .sort((a, b) => b.burnBlockTime - a.burnBlockTime || b.blockHeight - a.blockHeight)
    .slice(0, limit);
}

const DISTRIBUTION_TX_PAGE = MAX_PAGE_LIMIT;
const MAX_DISTRIBUTION_PAGES = 4;

export interface BondRewards {
  byBondIndex: Record<number, bigint>;
  byCycle: Record<number, bigint>;
}

export async function fetchBondRewards(
  poxContractId: string,
  chain: string,
  api?: string
): Promise<BondRewards | undefined> {
  const apiUrl = getApiUrl(chain, api);
  const txs: RawTx[] = [];
  let historyComplete = false;
  for (let page = 0; page < MAX_DISTRIBUTION_PAGES; page++) {
    const batch = await fetchTxsByFunction(
      apiUrl,
      poxContractId,
      'calculate-rewards',
      DISTRIBUTION_TX_PAGE,
      page * DISTRIBUTION_TX_PAGE
    );
    txs.push(...batch);
    if (batch.length < DISTRIBUTION_TX_PAGE) {
      historyComplete = true;
      break;
    }
  }
  if (!historyComplete) return undefined;

  const settled = txs.filter(tx => tx.tx_status === 'success');
  if (settled.length === 0) return { byBondIndex: {}, byCycle: {} };

  const perTx = await Promise.all(
    settled.map(async tx => {
      const reprs = await fetchTxEvents(apiUrl, tx.tx_id);
      const summary = reprs.find(repr => readTopic(repr) === 'calculate-rewards');
      if (!summary) return undefined;
      const total = readUint(summary, 'total-bond-rewards');
      const cycle = readUint(summary, 'stx-cycle');
      if (total === undefined || cycle === undefined) return undefined;

      const perBond: Record<number, bigint> = {};
      for (const repr of reprs.filter(repr => readTopic(repr) === 'bond-distribution')) {
        const index = readUint(repr, 'bond-index');
        const rewarded = readUint(repr, 'bond-rewards');
        if (index === undefined || rewarded === undefined) return undefined;
        const key = Number(index);
        perBond[key] = (perBond[key] ?? BigInt(0)) + rewarded;
      }

      return {
        total,
        cycle,
        perBond,
      };
    })
  );
  if (perTx.some(entry => entry === undefined)) return undefined;

  const byBondIndex: Record<number, bigint> = {};
  const byCycle: Record<number, bigint> = {};
  perTx.forEach(entry => {
    if (!entry) return;
    const cycle = Number(entry.cycle);
    byCycle[cycle] = (byCycle[cycle] ?? BigInt(0)) + entry.total;
    Object.entries(entry.perBond).forEach(([index, sats]) => {
      const key = Number(index);
      byBondIndex[key] = (byBondIndex[key] ?? BigInt(0)) + sats;
    });
  });
  return { byBondIndex, byCycle };
}
