import { getAllowedStakingApiUrl } from '@/api/server-api-origin';
import { handleSettledResult } from '@/app/address/[principal]/page-data';
import { NetworkModes } from '@/common/types/network';
import { redirect } from 'next/navigation';

import { UnsupportedStakingNetwork } from '../UnsupportedStakingNetwork';
import { BONDS_PAGE_SIZE } from '../consts';
import { fetchBondRewards, fetchBurnBlockTimes, fetchPoxInfo } from '../data';
import { BondsPageClient } from './PageClient';
import { fetchBondPageAtIndex } from './page-data';
import { bondPageHref, parseBondPage } from './pagination';

interface BondsSearchParams {
  chain?: string;
  api?: string;
  page?: string;
}

export default async function StakingBondsPage(props: {
  searchParams: Promise<BondsSearchParams>;
}) {
  const { chain = NetworkModes.Mainnet, api: requestedApi, page } = await props.searchParams;
  const api = getAllowedStakingApiUrl(chain, requestedApi);
  if (!api) return <UnsupportedStakingNetwork />;

  const requestedIndex = parseBondPage(page);
  const [poxInfoResult, bondsPageResult] = await Promise.allSettled([
    fetchPoxInfo(chain, api),
    fetchBondPageAtIndex(requestedIndex, chain, api),
  ]);
  const poxInfo = handleSettledResult(poxInfoResult, 'Bonds page: fetch pox info');
  const bondsPage = handleSettledResult(bondsPageResult, 'Bonds page: fetch bonds');

  const pageIndex = bondsPage?.pageIndex ?? requestedIndex;
  const canonicalPage = pageIndex > 0 ? String(pageIndex + 1) : undefined;
  if (bondsPage && page !== canonicalPage) {
    const params = new URLSearchParams();
    params.set('chain', chain);
    if (requestedApi !== undefined) params.set('api', api);
    redirect(bondPageHref(params, pageIndex));
  }

  const [rewardedResult, timesResult] = await Promise.allSettled([
    bondsPage
      ? fetchBondRewards(
          bondsPage.bonds.map(bond => bond.index),
          chain,
          api,
          poxInfo?.contract_id
        )
      : undefined,
    fetchBurnBlockTimes(
      (bondsPage?.bonds ?? []).flatMap(bond => [
        bond.schedule.activation.bitcoin_height,
        bond.schedule.unlock.bitcoin_height,
      ]),
      poxInfo?.current_burnchain_block_height ?? 0,
      chain,
      api
    ),
  ]);
  const rewarded = handleSettledResult(rewardedResult, 'Bonds page: fetch bond rewards');

  const burnBlockTimes = handleSettledResult(timesResult, 'Bonds page: burn block times');

  return (
    <BondsPageClient
      bonds={bondsPage?.bonds ?? []}
      unavailable={bondsPage === undefined || poxInfo === undefined}
      total={bondsPage?.total ?? 0}
      pageIndex={pageIndex}
      pageSize={BONDS_PAGE_SIZE}
      rewardsByBond={rewarded?.byBondIndex}
      settlementsByBond={rewarded?.settlementsByBond}
      burnBlockTimes={burnBlockTimes ?? {}}
      currentBurnHeight={poxInfo?.current_burnchain_block_height ?? 0}
      nowMs={Date.now()}
    />
  );
}
