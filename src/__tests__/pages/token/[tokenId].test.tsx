import '@testing-library/jest-dom';

import { getTokenInfo } from '../../../app/token/[tokenId]/getTokenInfo';

global.fetch = jest.fn();
const fetch = global.fetch as jest.MockedFunction<any>;

jest.mock('../../../api/getApiClient', () => ({
  getApiClient: jest.fn(),
}));

jest.mock('@hirosystems/token-metadata-api-client', () => ({
  Configuration: jest.fn(),
}));

console.error = jest.fn();

describe('getTokenInfo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('skips fetching token for custom api', async () => {
    const tokenId = 'token1';
    const chain = 'mainnet';
    const api = 'custom';

    const result = await getTokenInfo(tokenId, chain, api);

    expect(result).toEqual({});
    expect(console.error).toBeCalledWith(new Error('cannot fetch token info for this request'));
  });

  it('skips fetching token if missing from tokenMetadataApi', async () => {
    const tokenId = 'token1';
    const chain = 'mainnet';

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({ name: null, symbol: 'SYMBOL' }),
    });

    const result = await getTokenInfo(tokenId, chain);

    expect(result).toEqual({});
    expect(console.error).toBeCalledWith(new Error('token not found'));
  });

  it('returns token info', async () => {
    const tokenId = 'token1';
    const chain = 'mainnet';

    fetch
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ name: 'NAME', symbol: 'SYMBOL' }),
      })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ coins: [{ id: 'ID', symbol: 'SYMBOL' }] }),
      })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ name: 'NAME', symbol: 'SYMBOL' }),
      });

    const result = await getTokenInfo(tokenId, chain);

    expect(result).toEqual({
      basic: {
        name: 'NAME',
        symbol: 'SYMBOL',
        totalSupply: null,
        circulatingSupply: null,
      },
      extended: {
        categories: [],
        circulatingSupply: null,
        currentPrice: null,
        currentPriceInBtc: null,
        links: {
          announcements: [],
          blockchain: [],
          chat: [],
          forums: [],
          repos: [],
          websites: [],
          social: [],
        },
        marketCap: null,
        priceChangePercentage24h: null,
        tradingVolume24h: null,
        tradingVolumeChangePercentage24h: null,
        marketCapRank: null,
        priceInBtcChangePercentage24h: null,
        developerData: {
          closed_issues: null,
          code_additions_deletions_4_weeks: null,
          commit_count_4_weeks: null,
          forks: null,
          last_4_weeks_commit_activity_series: null,
          pull_request_contributors: null,
          pull_requests_merged: null,
          stars: null,
          subscribers: null,
          total_issues: null,
        },
      },
    });
  });
});
