import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { ExplorerError } from '@/common/types/Error';
import { ContractResponse } from '@/common/types/tx';
import { FtMetadataResponse } from '@hirosystems/token-metadata-api-client';

import { FungibleTokenHolderList } from '@stacks/stacks-blockchain-api-types';

import { getIsSBTC } from '../../../app/tokens/utils';
import { LUNAR_CRUSH_API_KEY } from '../../../common/constants/env';
import { LunarCrushCoin } from '../../../common/types/lunarCrush';
import { getApiUrl } from '../../../common/utils/network-utils';
import { getFtDecimalAdjustedBalance } from '../../../common/utils/utils';
import { BasicTokenInfo, DeveloperData, TokenInfoProps, TokenLinks } from './types';

function createExplorerError(message: string, status?: number): ExplorerError {
  const error = new Error(message) as ExplorerError;
  if (status) {
    error.status = status;
  }
  return error;
}

async function getTokenInfoFromLunarCrush(tokenId: string): Promise<LunarCrushCoin | undefined> {
  try {
    return await (
      await fetch(`https://lunarcrush.com/api4/public/coins/${tokenId}/v1`, {
        cache: 'default',
        next: { revalidate: 60 * 10 }, // Revalidate every 10 minutes
        headers: {
          Authorization: `Bearer ${LUNAR_CRUSH_API_KEY}`,
        },
      })
    ).json();
  } catch (error) {
    console.error(error);
  }
}

async function getCirculatingSupplyFromHoldersEndpoint(apiUrl: string, tokenId: string) {
  const contractInfoResponse = await stacksAPIFetch(`${apiUrl}/extended/v1/contract/${tokenId}`);
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
  const holdersResponse = await stacksAPIFetch(
    `${apiUrl}/extended/v1/tokens/ft/${fullyQualifiedTokenId}/holders`
  );
  if (!holdersResponse.ok) {
    console.error('Failed to fetch holders info');
    return null;
  }
  const holdersInfo: FungibleTokenHolderList = await holdersResponse.json();
  if (!holdersInfo?.total_supply) {
    console.error('No total supply found in holders info');
    return null;
  }
  const holdersCirculatingSupply = holdersInfo.total_supply;
  return holdersCirculatingSupply;
}

async function getBasicTokenInfoFromStacksApi(
  tokenId: string,
  chain: string,
  api?: string
): Promise<BasicTokenInfo> {
  const isCustomApi = !!api;

  const apiUrl = isCustomApi ? api : getApiUrl(chain);
  if (!tokenId || !apiUrl || isCustomApi) {
    throw createExplorerError('Unable to fetch token info for this request');
  }

  const tokenMetadataUrl = `${apiUrl}/metadata/v1/ft/${tokenId}`;
  const tokenMetadataResponse = await stacksAPIFetch(tokenMetadataUrl);

  if (!tokenMetadataResponse.ok) {
    throw createExplorerError(
      `Failed to fetch token metadata: ${tokenMetadataResponse.statusText}`,
      tokenMetadataResponse.status
    );
  }

  const tokenMetadata: FtMetadataResponse = await tokenMetadataResponse.json();

  const tokenName = tokenMetadata?.name;
  const tokenSymbol = tokenMetadata?.symbol;
  const tokenDecimals = tokenMetadata?.decimals;

  if (!tokenName || !tokenSymbol) {
    throw createExplorerError('Token not found', 404);
  }

  const holdersCirculatingSupply = await getCirculatingSupplyFromHoldersEndpoint(apiUrl, tokenId);

  return {
    name: tokenMetadata?.metadata?.name || tokenName,
    symbol: tokenSymbol,
    totalSupply:
      tokenMetadata?.total_supply && tokenDecimals
        ? getFtDecimalAdjustedBalance(tokenMetadata?.total_supply, tokenDecimals)
        : null,
    circulatingSupply: holdersCirculatingSupply
      ? getFtDecimalAdjustedBalance(holdersCirculatingSupply, tokenDecimals || 0)
      : null,
    imageUri: tokenMetadata?.image_uri,
  };
}

async function getDetailedTokenInfoFromLunarCrush(tokenId: string, basicTokenInfo: BasicTokenInfo) {
  try {
    const tokenInfoResponse = await getTokenInfoFromLunarCrush(tokenId);
    if (!tokenInfoResponse || tokenInfoResponse?.error) {
      console.error('token not found in LunarCrush');
      return {
        basic: basicTokenInfo,
      };
    }

    const isSBTC = getIsSBTC(tokenId);

    const name = tokenInfoResponse?.data?.name || basicTokenInfo.name || null;
    const symbol = basicTokenInfo.symbol || tokenInfoResponse?.data?.symbol || null;
    const categories: string[] = [];

    const totalSupply = basicTokenInfo.totalSupply || null;
    const circulatingSupplyFromBasicTokenInfo = basicTokenInfo.circulatingSupply || null;
    const circulatingSupply = isSBTC
      ? circulatingSupplyFromBasicTokenInfo // LunarCrush is returning an incorrect circulating supply for SBTC. Use the circulating supply from the holders endpoint on Stacks API instead.
      : tokenInfoResponse?.data?.circulating_supply || circulatingSupplyFromBasicTokenInfo || null;
    const imageUri = basicTokenInfo.imageUri || undefined;

    const currentPrice = tokenInfoResponse?.data?.price || null;
    const currentPriceInBtc = tokenInfoResponse?.data?.price_btc || null;
    const priceChangePercentage24h = tokenInfoResponse?.data?.percent_change_24h || null;
    const priceInBtcChangePercentage24h = null;

    const marketCap = tokenInfoResponse?.data?.market_cap || null;
    const tradingVolume24h = tokenInfoResponse?.data?.volume_24h || null;
    const tradingVolumeChangePercentage24h = null;
    const developerData: DeveloperData = {
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
      basic: {
        name,
        symbol,
        totalSupply,
        imageUri,
        circulatingSupply,
      },
      extended: {
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
      },
    };

    return tokenInfo;
  } catch (error) {
    console.error(error);
    return {
      basic: basicTokenInfo,
    };
  }
}

export async function getTokenInfo(
  tokenId: string,
  chain: string,
  api?: string
): Promise<TokenInfoProps> {
  const isCustomApi = !!api;

  if (!tokenId || isCustomApi) {
    throw createExplorerError('Cannot fetch token info for this request');
  }

  const basicTokenInfo = await getBasicTokenInfoFromStacksApi(tokenId, chain, api);
  const detailedTokenInfo = await getDetailedTokenInfoFromLunarCrush(tokenId, basicTokenInfo);
  return detailedTokenInfo;
}
