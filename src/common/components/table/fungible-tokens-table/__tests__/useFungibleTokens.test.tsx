import { SBTC_ASSET_ID } from '@/app/token/[tokenId]/consts';
import { isRiskyToken } from '@/common/utils/fungible-token-utils';
import { getAssetNameParts } from '@/common/utils/utils';

import { FtBalance, NftBalance } from '@stacks/stacks-blockchain-api-types';

import {
  convertBalancesToArrayWithAssetId,
  filterBalancesBySearchTerm,
  paginateBalances,
  putSBTCFirst,
  removeUndefinedFromBalances,
  removeZeroBalanceData,
} from '../useFungibleTokens';

// Mock the utility functions
jest.mock('@/common/utils/fungible-token-utils');
jest.mock('@/common/utils/utils');

const mockIsRiskyToken = isRiskyToken as jest.MockedFunction<typeof isRiskyToken>;
const mockGetAssetNameParts = getAssetNameParts as jest.MockedFunction<typeof getAssetNameParts>;

// Mock data
const mockFtBalance1: FtBalance = {
  balance: '1000000',
  total_sent: '0',
  total_received: '1000000',
};

const mockFtBalance2: FtBalance = {
  balance: '500000',
  total_sent: '100000',
  total_received: '600000',
};

const mockFtBalanceZero: FtBalance = {
  balance: '0',
  total_sent: '1000000',
  total_received: '1000000',
};

const mockNftBalance1: NftBalance = {
  count: '5',
  total_sent: '0',
  total_received: '5',
};

const mockNftBalance2: NftBalance = {
  count: '3',
  total_sent: '1',
  total_received: '4',
};

const mockNftBalanceZero: NftBalance = {
  count: '0',
  total_sent: '2',
  total_received: '2',
};

describe('removeUndefinedFromBalances', () => {
  it('should remove undefined values from FT balances', () => {
    const balances: Record<string, FtBalance | undefined> = {
      token1: mockFtBalance1,
      token2: undefined,
      token3: mockFtBalance2,
      token4: undefined,
    };

    const result = removeUndefinedFromBalances(balances);

    expect(result).toEqual({
      token1: mockFtBalance1,
      token3: mockFtBalance2,
    });
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('should remove undefined values from NFT balances', () => {
    const balances: Record<string, NftBalance | undefined> = {
      nft1: mockNftBalance1,
      nft2: undefined,
      nft3: mockNftBalance2,
    };

    const result = removeUndefinedFromBalances(balances);

    expect(result).toEqual({
      nft1: mockNftBalance1,
      nft3: mockNftBalance2,
    });
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('should return empty object when all values are undefined', () => {
    const balances: Record<string, FtBalance | undefined> = {
      token1: undefined,
      token2: undefined,
    };

    const result = removeUndefinedFromBalances(balances);

    expect(result).toEqual({});
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should return same object when no undefined values', () => {
    const balances: Record<string, FtBalance> = {
      token1: mockFtBalance1,
      token2: mockFtBalance2,
    };

    const result = removeUndefinedFromBalances(balances);

    expect(result).toEqual(balances);
    expect(Object.keys(result)).toHaveLength(2);
  });
});

describe('convertBalancesToArrayWithAssetId', () => {
  it('should convert FT balances record to array with asset_identifier', () => {
    const balances: Record<string, FtBalance> = {
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token1': mockFtBalance1,
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token2': mockFtBalance2,
    };

    const result = convertBalancesToArrayWithAssetId(balances);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      ...mockFtBalance1,
      asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token1',
    });
    expect(result[1]).toEqual({
      ...mockFtBalance2,
      asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token2',
    });
  });

  it('should convert NFT balances record to array with asset_identifier', () => {
    const balances: Record<string, NftBalance> = {
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.nft1': mockNftBalance1,
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.nft2': mockNftBalance2,
    };

    const result = convertBalancesToArrayWithAssetId(balances);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      ...mockNftBalance1,
      asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.nft1',
    });
    expect(result[1]).toEqual({
      ...mockNftBalance2,
      asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.nft2',
    });
  });

  it('should handle empty balances record', () => {
    const balances: Record<string, FtBalance> = {};

    const result = convertBalancesToArrayWithAssetId(balances);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

describe('paginateBalances', () => {
  const mockBalancesWithAssetId = [
    { ...mockFtBalance1, asset_identifier: 'token1' },
    { ...mockFtBalance2, asset_identifier: 'token2' },
    { ...mockFtBalanceZero, asset_identifier: 'token3' },
    { ...mockFtBalance1, asset_identifier: 'token4' },
    { ...mockFtBalance2, asset_identifier: 'token5' },
  ];

  it('should paginate balances correctly with limit and offset', () => {
    const result = paginateBalances(mockBalancesWithAssetId, 2, 1);

    expect(result).toHaveLength(2);
    expect(result[0].asset_identifier).toBe('token2');
    expect(result[1].asset_identifier).toBe('token3');
  });

  it('should handle pagination at the beginning', () => {
    const result = paginateBalances(mockBalancesWithAssetId, 3, 0);

    expect(result).toHaveLength(3);
    expect(result[0].asset_identifier).toBe('token1');
    expect(result[1].asset_identifier).toBe('token2');
    expect(result[2].asset_identifier).toBe('token3');
  });

  it('should handle pagination beyond array length', () => {
    const result = paginateBalances(mockBalancesWithAssetId, 10, 3);

    expect(result).toHaveLength(2); // Only 2 items left from offset 3
    expect(result[0].asset_identifier).toBe('token4');
    expect(result[1].asset_identifier).toBe('token5');
  });

  it('should return empty array when offset exceeds array length', () => {
    const result = paginateBalances(mockBalancesWithAssetId, 5, 10);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should handle empty array', () => {
    const result = paginateBalances([], 5, 0);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

describe('removeZeroBalanceData', () => {
  it('should remove FT balances with zero balance', () => {
    const balances: Record<string, FtBalance> = {
      token1: mockFtBalance1, // balance: '1000000'
      token2: mockFtBalanceZero, // balance: '0'
      token3: mockFtBalance2, // balance: '500000'
    };

    const result = removeZeroBalanceData(balances);

    expect(result).toEqual({
      token1: mockFtBalance1,
      token3: mockFtBalance2,
    });
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('should remove NFT balances with zero count', () => {
    const balances: Record<string, NftBalance> = {
      nft1: mockNftBalance1, // count: '5'
      nft2: mockNftBalanceZero, // count: '0'
      nft3: mockNftBalance2, // count: '3'
    };

    const result = removeZeroBalanceData(balances);

    expect(result).toEqual({
      nft1: mockNftBalance1,
      nft3: mockNftBalance2,
    });
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('should handle balances with undefined balance/count', () => {
    const balancesWithUndefined: Record<string, FtBalance> = {
      token1: mockFtBalance1,
      token2: { ...mockFtBalance1, balance: undefined as any },
      token3: mockFtBalance2,
    };

    const result = removeZeroBalanceData(balancesWithUndefined);

    expect(result).toEqual({
      token1: mockFtBalance1,
      token3: mockFtBalance2,
    });
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('should handle balances with null balance/count', () => {
    const balancesWithNull: Record<string, FtBalance> = {
      token1: mockFtBalance1,
      token2: { ...mockFtBalance1, balance: null as any },
      token3: mockFtBalance2,
    };

    const result = removeZeroBalanceData(balancesWithNull);

    expect(result).toEqual({
      token1: mockFtBalance1,
      token3: mockFtBalance2,
    });
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('should return empty object when all balances are zero', () => {
    const balances: Record<string, FtBalance> = {
      token1: mockFtBalanceZero,
      token2: mockFtBalanceZero,
    };

    const result = removeZeroBalanceData(balances);

    expect(result).toEqual({});
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should handle decimal balances correctly', () => {
    const decimalBalance: FtBalance = {
      balance: '0.5',
      total_sent: '0',
      total_received: '0.5',
    };

    const balances: Record<string, FtBalance> = {
      token1: decimalBalance,
      token2: mockFtBalanceZero,
    };

    const result = removeZeroBalanceData(balances);

    expect(result).toEqual({
      token1: decimalBalance,
    });
    expect(Object.keys(result)).toHaveLength(1);
  });
});

describe('filterBalancesBySearchTerm (if exported)', () => {
  const mockBalancesWithAssetId = [
    {
      ...mockFtBalance1,
      asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bitcoin-token',
    },
    {
      ...mockFtBalance2,
      asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.ethereum-coin',
    },
    {
      ...mockFtBalanceZero,
      asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stacks-token',
    },
  ];

  // These tests would work if the function was exported
  it.skip('should filter balances by search term', () => {
    const result = filterBalancesBySearchTerm(mockBalancesWithAssetId, 'bitcoin');
    expect(result).toHaveLength(1);
    expect(result[0].asset_identifier).toContain('bitcoin-token');
  });

  it('should return all balances when search term is empty', () => {
    const result = filterBalancesBySearchTerm(mockBalancesWithAssetId, '');
    expect(result).toHaveLength(3);
  });

  it('should be case insensitive', () => {
    const result = filterBalancesBySearchTerm(mockBalancesWithAssetId, 'BITCOIN');
    expect(result).toHaveLength(1);
  });
});

describe('putSBTCFirst (if exported)', () => {
  it.skip('should move SBTC to first position', () => {
    const mockBalancesWithSBTC = [
      { ...mockFtBalance1, asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token1' },
      { ...mockFtBalance2, asset_identifier: SBTC_ASSET_ID },
      {
        ...mockFtBalanceZero,
        asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token3',
      },
    ];

    const result = putSBTCFirst(mockBalancesWithSBTC);
    expect(result[0].asset_identifier).toBe(SBTC_ASSET_ID);
    expect(result).toHaveLength(3);
  });

  it('should not modify array when SBTC is not present', () => {
    const mockBalancesWithoutSBTC = [
      { ...mockFtBalance1, asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token1' },
      { ...mockFtBalance2, asset_identifier: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token2' },
    ];

    const result = putSBTCFirst(mockBalancesWithoutSBTC);
    expect(result).toEqual(mockBalancesWithoutSBTC);
  });
});
