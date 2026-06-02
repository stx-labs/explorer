import { handleSettledResult } from '@/app/address/[principal]/page-data';
import { getTokenPrice } from '@/app/getTokenPriceInfo';
import { getTokenDataFromLunarCrush } from '@/app/token/[tokenId]/page-data';
import { TokenIdPageDataProvider } from '@/app/token/[tokenId]/redesign/context/TokenIdPageContext';
import { MergedTokenData } from '@/app/token/[tokenId]/types';
import { CommonSearchParams } from '@/app/transactions/page';
import { NetworkModes } from '@/common/types/network';
import { logError } from '@/common/utils/error-utils';
import { getApiUrl } from '@/common/utils/network-utils';

import { FungibleTokenHolderList } from '@stacks/stacks-blockchain-api-types';

import StxTokenPageRedesign from './StxTokenPageRedesign';
import {
  STX_ASSET_ID,
  STX_DECIMALS,
  STX_LOGO_URL,
  STX_LUNARCRUSH_ID,
  STX_NAME,
  STX_SYMBOL,
} from './consts';
import { fetchStxHolders, fetchStxSupply } from './data';

// stx_supply returns supply in whole STX; convert to micro-STX (raw) so the
// shared decimal-adjusting components divide it back by 10^STX_DECIMALS.
function stxToMicro(stx: string | undefined): number | undefined {
  if (!stx) return undefined;
  const parsed = parseFloat(stx);
  return Number.isFinite(parsed) ? Math.round(parsed * 10 ** STX_DECIMALS) : undefined;
}

export default async function (props: { searchParams: Promise<CommonSearchParams> }) {
  const searchParams = await props.searchParams;
  const { chain, api } = searchParams;
  const apiUrl = getApiUrl(chain || NetworkModes.Mainnet, api);

  let tokenPrice = { stxPrice: 0, btcPrice: 0 };
  let tokenData: MergedTokenData | undefined;
  let holders: FungibleTokenHolderList | undefined;

  const isSSRDisabled = searchParams?.ssr === 'false';

  if (!isSSRDisabled) {
    try {
      const [priceResult, lunarCrushResult, supplyResult, holdersResult] = await Promise.allSettled(
        [
          getTokenPrice(),
          getTokenDataFromLunarCrush(STX_LUNARCRUSH_ID),
          fetchStxSupply(apiUrl),
          fetchStxHolders(apiUrl, 10, 0),
        ]
      );

      tokenPrice = handleSettledResult(priceResult, 'Failed to fetch token price') || {
        stxPrice: 0,
        btcPrice: 0,
      };
      const lunarCrush = handleSettledResult(lunarCrushResult, 'Failed to fetch STX market data');
      const supply = handleSettledResult(supplyResult, 'Failed to fetch STX supply');
      holders = handleSettledResult(holdersResult, 'Failed to fetch STX holders');

      tokenData = {
        ...lunarCrush,
        name: STX_NAME,
        symbol: STX_SYMBOL,
        imageUri: STX_LOGO_URL,
        decimals: STX_DECIMALS,
        totalSupply: stxToMicro(supply?.total_stx),
      };
    } catch (error) {
      logError(error as Error, 'STX token page server-side fetch', { chain, api }, 'error');
    }
  }

  return (
    <TokenIdPageDataProvider
      tokenId={STX_ASSET_ID}
      tokenData={tokenData}
      stxPrice={tokenPrice.stxPrice}
      btcPrice={tokenPrice.btcPrice}
      initialAddressRecentTransactionsData={undefined}
      txBlockTime={undefined}
      txId={undefined}
      assetId={STX_ASSET_ID}
      holders={holders}
      numFunctions={undefined}
    >
      <StxTokenPageRedesign />
    </TokenIdPageDataProvider>
  );
}
