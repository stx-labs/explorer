import { handleSettledResult } from '@/app/address/[principal]/page-data';
import { NetworkModes } from '@/common/types/network';

import { BONDS_PAGE_SIZE } from '../consts';
import {
  fetchBondRewards,
  fetchBondsPage,
  fetchBurnBlockTimes,
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

  const requestedPage = Number(page ?? '1');
  let pageIndex = Number.isSafeInteger(requestedPage) && requestedPage > 1 ? requestedPage - 1 : 0;

  let cursor: string | undefined;
  if (pageIndex > 0) {
    const [headResult] = await Promise.allSettled([fetchHighestBondIndex(chain, api)]);
    const head = handleSettledResult(headResult, 'Bonds page: fetch bond index head');
    if (head?.highestIndex === undefined) {
      pageIndex = 0;
    } else {
      const lastPageIndex = Math.max(Math.ceil(head.total / BONDS_PAGE_SIZE) - 1, 0);
      pageIndex = Math.min(pageIndex, lastPageIndex);
      cursor =
        pageIndex > 0
          ? String(Math.max(head.highestIndex - pageIndex * BONDS_PAGE_SIZE, 0))
          : undefined;
    }
  }

  const [poxInfoResult, bondsPageResult] = await Promise.allSettled([
    fetchPoxInfo(chain, api),
    fetchBondsPage(chain, api, BONDS_PAGE_SIZE, cursor),
  ]);
  const poxInfo = handleSettledResult(poxInfoResult, 'Bonds page: fetch pox info');
  const bondsPage = handleSettledResult(bondsPageResult, 'Bonds page: fetch bonds');

  const [rewardedResult] = await Promise.allSettled([
    poxInfo?.contract_id ? fetchBondRewards(poxInfo.contract_id, chain, api) : undefined,
  ]);
  const rewarded = handleSettledResult(rewardedResult, 'Bonds page: fetch bond rewards');

  const burnBlockTimes = await fetchBurnBlockTimes(
    (bondsPage?.bonds ?? []).flatMap(bond => [
      bond.schedule.activation.bitcoin_height,
      bond.schedule.unlock.bitcoin_height,
    ]),
    poxInfo?.current_burnchain_block_height ?? 0,
    chain,
    api
  );

  return (
    <BondsPageClient
      bonds={bondsPage?.bonds ?? []}
      unavailable={bondsPage === undefined || poxInfo === undefined}
      total={bondsPage?.total ?? 0}
      pageIndex={pageIndex}
      pageSize={BONDS_PAGE_SIZE}
      rewardsByBond={rewarded?.byBondIndex}
      settlementsByBond={rewarded?.settlementsByBond}
      burnBlockTimes={burnBlockTimes}
      currentBurnHeight={poxInfo?.current_burnchain_block_height ?? 0}
      nowMs={Date.now()}
    />
  );
}
