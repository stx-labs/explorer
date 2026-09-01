import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';

import { BONDS_PAGE_SIZE } from '../consts';
import {
  Bond,
  BondRewards,
  fetchBondRewards,
  fetchBondsPage,
  fetchHighestBondIndex,
  fetchPoxInfo,
} from '../data';
import { BondsPageClient } from './PageClient';

interface BondsSearchParams {
  chain?: string;
  api?: string;
  page?: string;
}

export default async function StakingBondsPage(props: {
  searchParams: Promise<BondsSearchParams>;
}) {
  const { chain = NetworkModes.Mainnet, api, page } = await props.searchParams;

  // Pages are 1-indexed in the URL and 0-indexed in the table.
  const requestedPage = Number.parseInt(page ?? '1', 10);
  const pageIndex = Number.isFinite(requestedPage) && requestedPage > 1 ? requestedPage - 1 : 0;

  let bonds: Bond[] = [];
  let total = 0;
  let poxInfo;
  let rewarded: BondRewards | undefined;

  // The first page needs no cursor. Deeper pages count down from the newest
  // bond, since the endpoint pages by index rather than by offset.
  let cursor: string | undefined;
  if (pageIndex > 0) {
    try {
      const head = await fetchHighestBondIndex(chain, api);
      if (head.highestIndex !== undefined) {
        cursor = String(head.highestIndex - pageIndex * BONDS_PAGE_SIZE);
      }
    } catch (error) {
      logError(error as Error, 'Bonds page: fetch bond index head', { chain }, 'error');
    }
  }

  const [poxResult, bondsResult] = await Promise.allSettled([
    fetchPoxInfo(chain, api),
    fetchBondsPage(chain, api, BONDS_PAGE_SIZE, cursor),
  ]);

  if (poxResult.status === 'fulfilled') {
    poxInfo = poxResult.value;
  } else {
    logError(poxResult.reason as Error, 'Bonds page: fetch pox info', { chain }, 'error');
  }

  if (bondsResult.status === 'fulfilled') {
    bonds = bondsResult.value.bonds;
    total = bondsResult.value.total;
  } else {
    logError(bondsResult.reason as Error, 'Bonds page: fetch bonds', { chain }, 'error');
  }

  if (poxInfo?.contract_id) {
    try {
      rewarded = await fetchBondRewards(poxInfo.contract_id, chain, api);
    } catch (error) {
      logError(error as Error, 'Bonds page: fetch bond rewards', { chain }, 'error');
    }
  }

  return (
    <BondsPageClient
      bonds={bonds}
      total={total}
      pageIndex={pageIndex}
      pageSize={BONDS_PAGE_SIZE}
      rewardsByBond={rewarded?.byBondIndex}
      rewardCycleLength={poxInfo?.reward_cycle_length ?? 0}
      currentBurnHeight={poxInfo?.current_burnchain_block_height ?? 0}
      nowMs={Date.now()}
    />
  );
}
