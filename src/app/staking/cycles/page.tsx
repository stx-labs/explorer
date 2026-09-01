import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';

import { CYCLES_PAGE_SIZE } from '../consts';
import {
  CycleRewards,
  PoxCycle,
  fetchCycleEndTimes,
  fetchCycleRewards,
  fetchPoxCyclesPage,
  fetchPoxInfo,
} from '../data';
import { DailyPrices, fetchDailyPrices } from '../prices';
import { burnHeightToApproximateTimestamp } from '../projections';
import { CyclesPageClient } from './PageClient';

interface CyclesSearchParams {
  chain?: string;
  api?: string;
  page?: string;
}

export default async function StackingCyclesPage(props: {
  searchParams: Promise<CyclesSearchParams>;
}) {
  const { chain = NetworkModes.Mainnet, api, page } = await props.searchParams;

  // Pages are 1-indexed in the URL and 0-indexed in the table.
  const requestedPage = Number.parseInt(page ?? '1', 10);
  const pageIndex = Number.isFinite(requestedPage) && requestedPage > 1 ? requestedPage - 1 : 0;

  let cycles: PoxCycle[] = [];
  let total = 0;
  let cycleRewards: Record<number, CycleRewards> = {};
  let pricedCycles: number[] = [];
  let poxInfo;
  let pox5FirstCycleId: number | undefined;

  const [poxResult, cyclesResult] = await Promise.allSettled([
    fetchPoxInfo(chain, api),
    fetchPoxCyclesPage(chain, api, CYCLES_PAGE_SIZE, pageIndex * CYCLES_PAGE_SIZE),
  ]);

  if (poxResult.status === 'fulfilled') {
    poxInfo = poxResult.value;
    pox5FirstCycleId = poxInfo?.contract_versions?.find(
      version => version.contract_id.split('.')[1] === 'pox-5'
    )?.first_reward_cycle_id;
  } else {
    logError(poxResult.reason as Error, 'Cycles page: fetch pox info', { chain }, 'error');
  }

  if (cyclesResult.status === 'fulfilled') {
    cycles = cyclesResult.value.cycles;
    total = cyclesResult.value.total;
  } else {
    logError(cyclesResult.reason as Error, 'Cycles page: fetch cycles', { chain }, 'error');
  }

  // Only pox-5 cycles have reward figures to read, so the rest are not asked for.
  if (poxInfo?.contract_id && pox5FirstCycleId !== undefined) {
    const cyclesToPrice = cycles
      .map(cycle => cycle.cycle_number)
      .filter(cycleNumber => cycleNumber >= pox5FirstCycleId!);
    pricedCycles = cyclesToPrice;
    if (cyclesToPrice.length > 0) {
      try {
        cycleRewards = await fetchCycleRewards(cyclesToPrice, poxInfo.contract_id, chain, api);
      } catch (error) {
        logError(error as Error, 'Cycles page: fetch cycle rewards', { chain }, 'error');
      }
    }
  }

  // One request per coin prices every cycle on this page at the day it ended.
  const nowMs = Date.now();

  let cycleEndTimes: Record<number, number> = {};
  if (pricedCycles.length > 0 && poxInfo?.reward_cycle_length) {
    try {
      cycleEndTimes = await fetchCycleEndTimes(
        pricedCycles,
        poxInfo.first_burnchain_block_height ?? 0,
        poxInfo.reward_cycle_length,
        chain,
        api
      );
    } catch (error) {
      logError(error as Error, 'Cycles page: fetch cycle end times', { chain }, 'error');
    }
  }
  let prices: DailyPrices | undefined;
  if (cycles.length > 0 && poxInfo?.reward_cycle_length) {
    const oldest = Math.min(...cycles.map(cycle => cycle.cycle_number));
    const startHeight =
      (poxInfo.first_burnchain_block_height ?? 0) + oldest * poxInfo.reward_cycle_length;
    const startMs = burnHeightToApproximateTimestamp(
      startHeight,
      poxInfo.current_burnchain_block_height ?? 0,
      nowMs
    );
    try {
      prices = await fetchDailyPrices(startMs, nowMs);
    } catch (error) {
      logError(error as Error, 'Cycles page: fetch daily prices', { chain }, 'error');
    }
  }

  return (
    <CyclesPageClient
      cycles={cycles}
      cycleRewards={cycleRewards}
      total={total}
      pageIndex={pageIndex}
      pageSize={CYCLES_PAGE_SIZE}
      currentCycleId={poxInfo?.current_cycle?.id}
      pox5FirstCycleId={pox5FirstCycleId}
      rewardCycleLength={poxInfo?.reward_cycle_length ?? 0}
      firstBurnchainBlockHeight={poxInfo?.first_burnchain_block_height ?? 0}
      currentBurnHeight={poxInfo?.current_burnchain_block_height ?? 0}
      nowMs={nowMs}
      prices={prices}
      cycleEndTimes={cycleEndTimes}
    />
  );
}
