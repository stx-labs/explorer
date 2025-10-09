import { fetchTokenInfoFromLunarCrush, fetchTokenMetadata } from '@/api/data-fetchers';
import { ContractResponse } from '@/common/types/tx';
import { logError } from '@/common/utils/error-utils';

import { getFtDecimalAdjustedBalance } from '../../../common/utils/utils';
import { getIsSBTC } from '../../tokens/utils';
import { HolderResponseType } from './Tabs/data/useHolders';
import { DeveloperData, MergedTokenData, TokenDataFromStacksApi, TokenLinks } from './types';

async function getCirculatingSupplyFromHoldersEndpoint(apiUrl: string, tokenId: string) {
  const contractInfoResponse = await fetch(`${apiUrl}/extended/v1/contract/${tokenId}`);
  if (!contractInfoResponse.ok) {
    console.error('Failed to fetch contract info');
    return null;
  }
  const contractInfo: ContractResponse = await contractInfoResponse.json();
  if (!contractInfo.abi) {
    console.error('No ABI found for token');
    return null;
  }
  const abi = JSON.parse(contractInfo.abi);
  if (!abi?.fungible_tokens || abi.fungible_tokens.length === 0) {
    console.error('No fungible tokens found in ABI');
    return null;
  }
  const ftName = abi.fungible_tokens[0].name;
  const fullyQualifiedTokenId = `${tokenId}::${ftName}`;
  const holdersResponse = await fetch(
    `${apiUrl}/extended/v1/tokens/ft/${fullyQualifiedTokenId}/holders`
  );
  if (!holdersResponse.ok) {
    console.error('Failed to fetch holders info');
    return null;
  }
  const holdersInfo: HolderResponseType = await holdersResponse.json();
  if (!holdersInfo?.total_supply) {
    console.error('No total supply found in holders info');
    return null;
  }
  const holdersCirculatingSupply = holdersInfo.total_supply;
  return holdersCirculatingSupply;
}

async function getTokenInfoFromStacksApi(
  tokenId: string,
  apiUrl: string
): Promise<TokenDataFromStacksApi | undefined> {
  try {
    const tokenMetadata = await fetchTokenMetadata(apiUrl, tokenId);

    const name = tokenMetadata?.name || tokenMetadata?.metadata?.name || null;
    const symbol = tokenMetadata?.symbol || null;
    const decimals = tokenMetadata?.decimals || null;
    const totalSupply = tokenMetadata?.total_supply || null;
    const imageUri = tokenMetadata?.image_uri || null;

    if (!name || !symbol) {
      throw new Error(`Token not found. tokenId: ${tokenId}, apiUrl: ${apiUrl}`);
    }

    const holdersCirculatingSupply = await getCirculatingSupplyFromHoldersEndpoint(apiUrl, tokenId);

    return {
      name,
      symbol,
      totalSupply:
        totalSupply && decimals ? getFtDecimalAdjustedBalance(totalSupply, decimals) : null,
      circulatingSupply:
        holdersCirculatingSupply && decimals
          ? getFtDecimalAdjustedBalance(holdersCirculatingSupply, decimals)
          : null,
      imageUri,
    };
  } catch (error) {
    logError(error as Error, 'getTokenInfoFromStacksApi', { tokenId, apiUrl }, 'error');
    return undefined;
  }
}

interface TokenDataFromLunarCrush {
  name: string | null;
  symbol: string | null;
  categories: string[];
  links: TokenLinks;
  circulatingSupply: number | null;
  currentPrice: number | null;
  priceChangePercentage24h: number | null;
  currentPriceInBtc: number | null;
  priceInBtcChangePercentage24h: number | null;
  marketCap: number | null;
  tradingVolume24h: number | null;
  tradingVolumeChangePercentage24h: number | null;
  developerData: DeveloperData;
  marketCapRank: number | null;
}

async function getTokenInfoFromLunarCrush(
  tokenId: string
): Promise<TokenDataFromLunarCrush | undefined> {
  try {
    const tokenInfoResponse = await fetchTokenInfoFromLunarCrush(tokenId);

    const name = tokenInfoResponse?.data?.name || null;
    const symbol = tokenInfoResponse?.data?.symbol || null;

    const categories: string[] = [];

    const circulatingSupply = tokenInfoResponse?.data?.circulating_supply || null;

    const currentPrice = tokenInfoResponse?.data?.price || null;
    const currentPriceInBtc = tokenInfoResponse?.data?.price_btc || null;
    const priceChangePercentage24h = tokenInfoResponse?.data?.percent_change_24h || null;
    const priceInBtcChangePercentage24h = null; // TODO: Why do we need this?

    const marketCap = tokenInfoResponse?.data?.market_cap || null;
    const tradingVolume24h = tokenInfoResponse?.data?.volume_24h || null;
    const tradingVolumeChangePercentage24h = null; // TODO: Why do we need this?
    const developerData: DeveloperData = {
      // TODO: Why do we need this?
      forks: null,
      stars: null,
      subscribers: null,
      total_issues: null,
      closed_issues: null,
      pull_requests_merged: null,
      pull_request_contributors: null,
      code_additions_deletions_4_weeks: null,
      commit_count_4_weeks: null,
      last_4_weeks_commit_activity_series: null,
    };

    const links: TokenLinks = {
      // TODO: Why do we need this?
      websites: [],
      blockchain: [],
      chat: [],
      forums: [],
      announcements: [],
      repos: [],
      social: [],
    };

    const marketCapRank = tokenInfoResponse?.data?.market_cap_rank || null;

    const tokenInfo = {
      name,
      symbol,
      categories,
      links,
      circulatingSupply,
      currentPrice,
      priceChangePercentage24h,
      currentPriceInBtc,
      priceInBtcChangePercentage24h,
      marketCap,
      tradingVolume24h,
      tradingVolumeChangePercentage24h,
      developerData,
      marketCapRank,
    };

    return tokenInfo;
  } catch (error) {
    logError(error as Error, 'getTokenInfoFromLunarCrush', { tokenId });
    return undefined;
  }
}

function mergeTokenData(
  tokenId: string,
  stacksApiTokenData: TokenDataFromStacksApi,
  lunarCrushTokenData: TokenDataFromLunarCrush
) {
  const isSBTC = getIsSBTC(tokenId);

  const name = lunarCrushTokenData?.name || stacksApiTokenData.name || null;
  const symbol = stacksApiTokenData.symbol || lunarCrushTokenData?.symbol || null;
  const categories: string[] = lunarCrushTokenData?.categories || [];

  const totalSupply = stacksApiTokenData.totalSupply || null;
  const circulatingSupply = isSBTC // LunarCrush is returning an incorrect circulating supply for SBTC. Use the circulating supply from the holders endpoint on Stacks API instead.
    ? stacksApiTokenData.circulatingSupply
    : lunarCrushTokenData?.circulatingSupply
      ? lunarCrushTokenData.circulatingSupply
      : null;
  const imageUri = stacksApiTokenData.imageUri || null;

  const currentPrice = lunarCrushTokenData?.currentPrice || null;
  const currentPriceInBtc = lunarCrushTokenData?.currentPriceInBtc || null;
  const priceChangePercentage24h = lunarCrushTokenData?.priceChangePercentage24h || null;
  const priceInBtcChangePercentage24h = null;

  const marketCap = lunarCrushTokenData?.marketCap || null;
  const tradingVolume24h = lunarCrushTokenData?.tradingVolume24h || null;
  const tradingVolumeChangePercentage24h = null;

  const marketCapRank = lunarCrushTokenData?.marketCapRank || null;

  return {
    basic: {
      name,
      symbol,
      totalSupply,
      imageUri,
      circulatingSupply,
    },
    extended: {
      categories,
      links: lunarCrushTokenData?.links,
      circulatingSupply,
      currentPrice,
      priceChangePercentage24h,
      currentPriceInBtc,
      priceInBtcChangePercentage24h,
      marketCap,
      tradingVolume24h,
      tradingVolumeChangePercentage24h,
      developerData: lunarCrushTokenData?.developerData,
      marketCapRank,
    },
  };
}

export async function getTokenInfo(
  tokenId: string,
  apiUrl: string,
  isCustomApi: boolean
): Promise<MergedTokenData> {
  let tokenDataFromStacksApi: TokenDataFromStacksApi | undefined;
  let tokenDataFromLunarCrush: TokenDataFromLunarCrush | undefined;

  try {
    tokenDataFromStacksApi = !isCustomApi
      ? await getTokenInfoFromStacksApi(tokenId, apiUrl)
      : undefined;
    tokenDataFromLunarCrush = await getTokenInfoFromLunarCrush(tokenId);

    return tokenDataFromStacksApi && tokenDataFromLunarCrush
      ? mergeTokenData(tokenId, tokenDataFromStacksApi, tokenDataFromLunarCrush)
      : {};
  } catch (error) {
    logError(
      error as Error,
      'getTokenInfo',
      { tokenId, apiUrl, isCustomApi, tokenDataFromStacksApi, tokenDataFromLunarCrush },
      'error'
    );
    return {};
  }
}
