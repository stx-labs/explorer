export interface TokenLinks {
  websites: string[];
  blockchain: string[];
  chat: string[];
  forums: string[];
  announcements: string[];
  repos: string[];
  social: string[];
}

export interface DeveloperData {
  forks: number | null;
  stars: number | null;
  subscribers: number | null;
  total_issues: number | null;
  closed_issues: number | null;
  pull_requests_merged: number | null;
  pull_request_contributors: number | null;
  code_additions_deletions_4_weeks: {
    additions: number | null;
    deletions: number | null;
  } | null;
  commit_count_4_weeks: number | null;
  last_4_weeks_commit_activity_series: [] | null;
}

export interface DeveloperDataRedesign {
  forks?: number;
  stars?: number;
  subscribers?: number;
  total_issues?: number;
  closed_issues?: number;
  pull_requests_merged?: number;
  pull_request_contributors?: number;
  code_additions_deletions_4_weeks?: {
    additions: number;
    deletions: number;
  };
  commit_count_4_weeks?: number;
  last_4_weeks_commit_activity_series?: [];
}

export interface BasicTokenInfo {
  name: string | null;
  symbol: string | null;
  totalSupply: number | null;
  circulatingSupply: number | null;
  imageUri: string | undefined;
}

export interface TokenInfoProps {
  basic?: BasicTokenInfo;
  extended?: {
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
  };
}

export interface TokenDataFromStacksApi {
  name?: string;
  symbol?: string;
  totalSupply?: number;
  circulatingSupply?: number;
  imageUri?: string;
  decimals?: number;
}

export interface TokenDataFromLunarCrush {
  name?: string;
  symbol?: string;
  categories?: string[];
  links?: TokenLinks;
  circulatingSupply?: number;
  currentPrice?: number;
  priceChangePercentage24h?: number;
  currentPriceInBtc?: number;
  priceInBtcChangePercentage24h?: number;
  marketCap?: number;
  tradingVolume24h?: number;
  tradingVolumeChangePercentage24h?: number;
  developerData?: DeveloperDataRedesign;
  marketCapRank?: number;
}

export interface MergedTokenData extends TokenDataFromStacksApi, TokenDataFromLunarCrush {}
