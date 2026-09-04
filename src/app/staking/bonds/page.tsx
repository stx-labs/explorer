import { NetworkModes } from '@/common/types/network';

import { BONDS_PAGE_SIZE } from '../consts';
import { fetchBondRewards, fetchBondsPage, fetchHighestBondIndex, fetchPoxInfo } from '../data';
import { load } from '../load';
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

  const requestedPage = Number.parseInt(page ?? '1', 10);
  let pageIndex = Number.isFinite(requestedPage) && requestedPage > 1 ? requestedPage - 1 : 0;

  let cursor: string | undefined;
  if (pageIndex > 0) {
    const head = await load(
      fetchHighestBondIndex(chain, api),
      'Bonds page: fetch bond index head',
      chain
    );
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

  const [poxInfo, bondsPage] = await Promise.all([
    load(fetchPoxInfo(chain, api), 'Bonds page: fetch pox info', chain),
    load(fetchBondsPage(chain, api, BONDS_PAGE_SIZE, cursor), 'Bonds page: fetch bonds', chain),
  ]);

  const rewarded = poxInfo?.contract_id
    ? await load(
        fetchBondRewards(poxInfo.contract_id, chain, api),
        'Bonds page: fetch bond rewards',
        chain
      )
    : undefined;

  return (
    <BondsPageClient
      bonds={bondsPage?.bonds ?? []}
      total={bondsPage?.total ?? 0}
      pageIndex={pageIndex}
      pageSize={BONDS_PAGE_SIZE}
      rewardsByBond={rewarded?.byBondIndex}
      rewardCycleLength={poxInfo?.reward_cycle_length ?? 0}
      currentBurnHeight={poxInfo?.current_burnchain_block_height ?? 0}
      nowMs={Date.now()}
    />
  );
}
