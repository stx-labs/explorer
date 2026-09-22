import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import type { PoxInfo } from '@/common/queries/usePoxInforRaw';
import { getApiUrl } from '@/common/utils/network-utils';

import {
  ClarityValue,
  cvToHex,
  cvToString,
  deserializeCV,
  listCV,
  noneCV,
  someCV,
  uintCV,
} from '@stacks/transactions';

import type { Bond } from './data';
import { readUint } from './data';
import { getCycleStackerRewardsSatsBigInt, getDistributionCadence } from './projections';
import { estimatePendingStackerRewards, projectCycleRewards } from './reward-metrics';

export interface CurrentCycleEstimate {
  cycleNumber: number;
  creditedSats: bigint;
  estimatedSats?: bigint;
  projectedTotalSats?: bigint;
}

export function getPendingCalculationHeight(
  distributionIndex: number,
  lastCalculationHeight: number,
  firstBurnHeight: number,
  cycleLength: number
): number | undefined {
  const cadence = getDistributionCadence(cycleLength);
  if (cadence <= 0 || !Number.isInteger(cadence) || distributionIndex < 1) return undefined;
  const latestBoundary = firstBurnHeight + distributionIndex * cadence - 1;
  if (lastCalculationHeight > latestBoundary || lastCalculationHeight < latestBoundary - cadence)
    return undefined;
  return lastCalculationHeight === latestBoundary ? latestBoundary + cadence : latestBoundary;
}

export async function fetchCurrentCycleEstimate(
  poxInfo: PoxInfo,
  bonds: Bond[],
  chain: string,
  api?: string
): Promise<CurrentCycleEstimate> {
  const apiUrl = getApiUrl(chain, api);
  const response = await stacksAPIFetch(`${apiUrl}/extended/v2/blocks?limit=1`, {
    cache: 'default',
    next: { revalidate: 60, tags: ['staking-estimate-tip'] },
  });
  if (!response.ok) throw new Error(`Reward estimate block lookup failed: ${response.status}`);
  const blocks: { results?: { index_block_hash: string; burn_block_height?: number }[] } =
    await response.json();
  const tip = blocks.results?.[0]?.index_block_hash.replace(/^0x/, '');
  if (!tip || !/^[0-9a-f]{64}$/i.test(tip)) throw new Error('Reward estimate block is unavailable');
  const [address, name] = poxInfo.contract_id.split('.');
  if (!address || !name) throw new Error('Reward estimate contract is unavailable');
  async function read(fn: string, args: ClarityValue[] = []): Promise<string> {
    const result = await stacksAPIFetch(
      `${apiUrl}/v2/contracts/call-read/${address}/${name}/${fn}?tip=${tip}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: address, arguments: args.map(cvToHex) }),
        cache: 'default',
        next: { revalidate: 60, tags: ['staking-reward-estimate'] },
      }
    );
    if (!result.ok) throw new Error(`Reward estimate read failed: ${result.status}`);
    const data: { okay?: boolean; result?: string } = await result.json();
    if (!data.okay || !data.result) throw new Error(`Reward estimate read failed: ${fn}`);
    return cvToString(deserializeCV(data.result));
  }
  async function readUintValue(fn: string, args: ClarityValue[] = []): Promise<bigint> {
    const repr = await read(fn, args);
    if (!/^u\d+$/.test(repr)) throw new Error(`Invalid reward estimate uint: ${fn}`);
    return BigInt(repr.slice(1));
  }
  const cycleNumber = Number(await readUintValue('current-pox-reward-cycle'));
  if (cycleNumber !== poxInfo.current_cycle?.id)
    throw new Error('Reward estimate crossed a cycle boundary');
  const args = [uintCV(cycleNumber), noneCV()];
  const [creditedPerToken, shares, incoming, distributionIndex, lastCalculation] =
    await Promise.all([
      readUintValue('get-rewards-per-token-for-cycle', args),
      readUintValue('get-total-shares-staked-for-cycle', args),
      readUintValue('get-new-rewards'),
      readUintValue('current-distribution-cycle'),
      readUintValue('get-last-reward-compute-height'),
    ]);
  const creditedSats = getCycleStackerRewardsSatsBigInt(creditedPerToken, shares);
  const base = { cycleNumber, creditedSats };
  const firstBurnHeight = poxInfo.first_burnchain_block_height;
  const cycleLength = poxInfo.reward_cycle_length;
  const calculationHeight = getPendingCalculationHeight(
    Number(distributionIndex),
    Number(lastCalculation),
    firstBurnHeight,
    cycleLength
  );
  if (calculationHeight === undefined) return base;
  const pendingCycle = Math.floor((calculationHeight - firstBurnHeight) / cycleLength);
  if (pendingCycle !== cycleNumber) return base;

  const active = bonds.filter(
    bond =>
      bond.schedule.activation.bitcoin_height < calculationHeight &&
      bond.schedule.unlock.bitcoin_height >= calculationHeight
  );
  if (active.length > 6) throw new Error('Invalid active bond set for reward estimate');
  const complete = await read('assert-all-active-bonds-included', [
    listCV(active.map(bond => uintCV(bond.index))),
    uintCV(calculationHeight),
  ]);
  if (complete !== '(ok true)') throw new Error('Reward estimate is missing an active bond');
  const targets = await Promise.all(
    active.map(async bond => {
      const [principalSats, protocolBond] = await Promise.all([
        readUintValue('get-total-shares-staked-for-cycle', [
          uintCV(pendingCycle),
          someCV(uintCV(bond.index)),
        ]),
        read('get-protocol-bond', [uintCV(bond.index)]),
      ]);
      const targetRateBps = readUint(protocolBond, 'target-rate');
      if (targetRateBps === undefined)
        throw new Error('Reward estimate bond parameters unavailable');
      return { principalSats, targetRateBps };
    })
  );
  const estimatedSats = creditedSats + estimatePendingStackerRewards(incoming, shares, targets);
  // Use the same block as the reward reads. Include the current mined Bitcoin block.
  const burnHeight = blocks.results?.[0]?.burn_block_height;
  const elapsedBlocks =
    burnHeight === undefined ? 0 : burnHeight - (firstBurnHeight + cycleNumber * cycleLength) + 1;
  return {
    ...base,
    estimatedSats,
    projectedTotalSats: projectCycleRewards(estimatedSats, elapsedBlocks, cycleLength),
  };
}
