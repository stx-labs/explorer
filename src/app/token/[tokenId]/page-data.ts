import { fetchTokenDataFromLunarCrush, fetchTokenMetadata } from '@/api/data-fetchers';
import { logError } from '@/common/utils/error-utils';

import { getFtDecimalAdjustedBalance } from '../../../common/utils/utils';
import { getIsSBTC } from '../../tokens/utils';
import {
  DeveloperDataRedesign,
  MergedTokenData,
  TokenDataFromLunarCrush,
  TokenDataFromStacksApi,
  TokenLinks,
} from './types';

async function getTokenDataFromStacksApi(
  tokenId: string,
  apiUrl: string
): Promise<TokenDataFromStacksApi | undefined> {
  try {
    const tokenMetadata = await fetchTokenMetadata(apiUrl, tokenId);

    const name = safeGet(tokenMetadata?.name, tokenMetadata?.metadata?.name);
    const symbol = tokenMetadata?.symbol;
    const decimals = tokenMetadata?.decimals;
    const totalSupply = tokenMetadata?.total_supply;
    const imageUri = tokenMetadata?.image_uri;

    if (!name || !symbol) {
      throw new Error(`Token not found. tokenId: ${tokenId}, apiUrl: ${apiUrl}`);
    }

    return {
      name,
      symbol,
      totalSupply:
        totalSupply && decimals ? getFtDecimalAdjustedBalance(totalSupply, decimals) : undefined,
      decimals,
      imageUri,
    };
  } catch (error) {
    logError(error as Error, 'getTokenInfoFromStacksApi', { tokenId, apiUrl }, 'error');
    return undefined;
  }
}

async function getTokenDataFromLunarCrush(
  tokenId: string
): Promise<TokenDataFromLunarCrush | undefined> {
  try {
    const tokenDataResponse = await fetchTokenDataFromLunarCrush(tokenId);

    const name = tokenDataResponse?.data?.name;
    const symbol = tokenDataResponse?.data?.symbol;

    const categories: string[] = [];

    const circulatingSupply = tokenDataResponse?.data?.circulating_supply;

    const currentPrice = tokenDataResponse?.data?.price;
    const currentPriceInBtc = tokenDataResponse?.data?.price_btc;
    const priceChangePercentage24h = tokenDataResponse?.data?.percent_change_24h;
    const priceInBtcChangePercentage24h = undefined; // TODO: Why do we need this?

    const marketCap = tokenDataResponse?.data?.market_cap;
    const tradingVolume24h = tokenDataResponse?.data?.volume_24h;
    const tradingVolumeChangePercentage24h = undefined; // TODO: Why do we need this?
    const developerData: DeveloperDataRedesign = {
      // TODO: Why do we need this?
      forks: undefined,
      stars: undefined,
      subscribers: undefined,
      total_issues: undefined,
      closed_issues: undefined,
      pull_requests_merged: undefined,
      pull_request_contributors: undefined,
      code_additions_deletions_4_weeks: undefined,
      commit_count_4_weeks: undefined,
      last_4_weeks_commit_activity_series: undefined,
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

    const marketCapRank = tokenDataResponse?.data?.market_cap_rank || undefined;

    const tokenData = {
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

    return tokenData;
  } catch (error) {
    logError(error as Error, 'getTokenInfoFromLunarCrush', { tokenId });
    return undefined;
  }
}

export async function getTokenDataRedesign(
  tokenId: string,
  apiUrl: string,
  isCustomApi: boolean
): Promise<MergedTokenData> {
  let tokenDataFromStacksApi: TokenDataFromStacksApi | undefined;
  let tokenDataFromLunarCrush: TokenDataFromLunarCrush | undefined;

  try {
    tokenDataFromStacksApi = !isCustomApi
      ? await getTokenDataFromStacksApi(tokenId, apiUrl)
      : undefined;
    tokenDataFromLunarCrush = await getTokenDataFromLunarCrush(tokenId);

    const mergedTokenData =
      tokenDataFromStacksApi && tokenDataFromLunarCrush
        ? redesignMergeTokenData(tokenDataFromStacksApi, tokenDataFromLunarCrush, tokenId)
        : {};
    return mergedTokenData;
  } catch (error) {
    logError(
      error as Error,
      'getTokenInfoRedesign',
      { tokenId, apiUrl, isCustomApi, tokenDataFromStacksApi, tokenDataFromLunarCrush },
      'error'
    );
    return {} as MergedTokenData;
  }
}

// Helper function to safely get a value with fallback
const safeGet = <T>(primary: T | undefined, fallback?: T | undefined): T | undefined => {
  return primary ?? fallback;
};

function redesignMergeTokenData(
  tokenDataFromStacksApi: TokenDataFromStacksApi | undefined,
  tokenDataFromLunarCrush: TokenDataFromLunarCrush | undefined,
  tokenId: string
): MergedTokenData {
  // Determine if this is SBTC token for special handling
  const isSBTC = getIsSBTC(tokenId);

  // Basic token information
  const name = safeGet(tokenDataFromLunarCrush?.name, tokenDataFromStacksApi?.name);

  const symbol = safeGet(tokenDataFromStacksApi?.symbol, tokenDataFromLunarCrush?.symbol);

  const totalSupply = safeGet(tokenDataFromStacksApi?.totalSupply);

  // Special handling for circulating supply based on token type
  const circulatingSupply = isSBTC
    ? safeGet(tokenDataFromStacksApi?.circulatingSupply)
    : safeGet(
        tokenDataFromLunarCrush?.circulatingSupply,
        tokenDataFromStacksApi?.circulatingSupply
      );

  const imageUri = safeGet(tokenDataFromStacksApi?.imageUri);

  // Price information (primarily from LunarCrush)
  const currentPrice = safeGet(tokenDataFromLunarCrush?.currentPrice);
  const currentPriceInBtc = safeGet(tokenDataFromLunarCrush?.currentPriceInBtc);
  const priceChangePercentage24h = safeGet(tokenDataFromLunarCrush?.priceChangePercentage24h);
  const priceInBtcChangePercentage24h = undefined; // Not available from current sources

  // Market data (primarily from LunarCrush)
  const marketCap = safeGet(tokenDataFromLunarCrush?.marketCap);
  const tradingVolume24h = safeGet(tokenDataFromLunarCrush?.tradingVolume24h);
  const tradingVolumeChangePercentage24h = undefined; // Not available from current sources
  const marketCapRank = safeGet(tokenDataFromLunarCrush?.marketCapRank);

  // Categories and links (LunarCrush only)
  const categories = Array.isArray(tokenDataFromLunarCrush?.categories)
    ? tokenDataFromLunarCrush.categories
    : [];

  const links = tokenDataFromLunarCrush?.links || undefined;
  const developerData = tokenDataFromLunarCrush?.developerData || undefined;

  return {
    name,
    symbol,
    totalSupply,
    imageUri,
    circulatingSupply,
    categories,
    links,
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
}
