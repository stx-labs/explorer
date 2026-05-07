import { Network } from '../../types/network';
import { SearchResultType } from '../../types/search-results';
import {
  advancedSearchConfig,
  blockToSearchResult,
  buildAdvancedSearchQuery,
  formatTransactionType,
  getSearchPageUrl,
  isValidDateString,
  parseAdvancedSearchQuery,
} from '../useSearchQuery';

const STX_ADDRESS_1 = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const STX_ADDRESS_2 = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';

describe('parseAdvancedSearchQuery', () => {
  test('should return an empty query if no advanced search terms are present', () => {
    const result = parseAdvancedSearchQuery('simple query');
    expect(result).toEqual([]);
  });

  test('should parse from: address correctly', () => {
    const result = parseAdvancedSearchQuery(`FROM:${STX_ADDRESS_1}`);
    expect(result).toEqual([{ filterName: 'fromAddress', filterValue: STX_ADDRESS_1 }]);
  });

  test('should parse to: address correctly', () => {
    const result = parseAdvancedSearchQuery(`TO:${STX_ADDRESS_2}`);
    expect(result).toEqual([{ filterName: 'toAddress', filterValue: STX_ADDRESS_2 }]);
  });

  test('should parse before: date correctly', () => {
    const result = parseAdvancedSearchQuery('BEFORE:2023-07-21');
    expect(result).toEqual([{ filterName: 'endTime', filterValue: 1689983999 }]);
  });

  test('should parse after: date correctly', () => {
    const result = parseAdvancedSearchQuery('AFTER:2023-07-21');
    expect(result).toEqual([{ filterName: 'startTime', filterValue: 1689897600 }]);
  });

  test('should parse txtype: correctly', () => {
    const result = parseAdvancedSearchQuery('TXTYPE:token_transfer');
    expect(result).toEqual([{ filterName: 'transactionType', filterValue: ['token_transfer'] }]);
  });

  test('should parse comma-separated txtype: correctly', () => {
    const result = parseAdvancedSearchQuery('TXTYPE:token_transfer,contract_call');
    expect(result).toEqual([
      { filterName: 'transactionType', filterValue: ['token_transfer', 'contract_call'] },
    ]);
  });

  test('should parse multiple advanced search terms correctly including txtype', () => {
    const beforeDateInput = '2023-07-01';
    const afterDateInput = '2023-06-27';
    const beforeDateTimestamp = 1688255999;
    const afterDateTimestamp = 1687824000;
    const result = parseAdvancedSearchQuery(
      `FROM:${STX_ADDRESS_1} TO:${STX_ADDRESS_2} TXTYPE:contract_call BEFORE:${beforeDateInput}AFTER:${afterDateInput}`
    );
    expect(result).toEqual([
      { filterName: 'fromAddress', filterValue: STX_ADDRESS_1 },
      { filterName: 'toAddress', filterValue: STX_ADDRESS_2 },
      { filterName: 'endTime', filterValue: beforeDateTimestamp },
      { filterName: 'startTime', filterValue: afterDateTimestamp },
      { filterName: 'transactionType', filterValue: ['contract_call'] },
    ]);

    expect(advancedSearchConfig['BEFORE:'].build(beforeDateTimestamp)).toEqual(beforeDateInput);
    expect(advancedSearchConfig['AFTER:'].build(afterDateTimestamp)).toEqual(afterDateInput);
  });

  test('should parse multiple advanced search terms correctly', () => {
    const beforeDateInput = '2023-07-01';
    const afterDateInput = '2023-06-27';
    const beforeDateTimestamp = 1688255999;
    const afterDateTimestamp = 1687824000;
    const result = parseAdvancedSearchQuery(
      `FROM:${STX_ADDRESS_1} TO:${STX_ADDRESS_2}   BEFORE:${beforeDateInput}AFTER:${afterDateInput}`
    );
    expect(result).toEqual([
      { filterName: 'fromAddress', filterValue: STX_ADDRESS_1 },
      { filterName: 'toAddress', filterValue: STX_ADDRESS_2 },
      { filterName: 'endTime', filterValue: beforeDateTimestamp },
      { filterName: 'startTime', filterValue: afterDateTimestamp },
    ]);

    expect(advancedSearchConfig['BEFORE:'].build(beforeDateTimestamp)).toEqual(beforeDateInput);
    expect(advancedSearchConfig['AFTER:'].build(afterDateTimestamp)).toEqual(afterDateInput);
  });

  test('should ignore multiple spaces', () => {
    const result = parseAdvancedSearchQuery(`FROM:${STX_ADDRESS_1}       BEFORE:2022-07-01 `);
    expect(result).toEqual([
      { filterName: 'fromAddress', filterValue: STX_ADDRESS_1 },
      { filterName: 'endTime', filterValue: 1656719999 },
    ]);
  });
});

describe('buildAdvancedSearchQuery', () => {
  test('should build a query string with transaction type', () => {
    const query = {
      fromAddress: STX_ADDRESS_1,
      transactionType: 'token_transfer',
      endTime: 1689983999,
    };
    const result = buildAdvancedSearchQuery(query);
    expect(result).toBe(`FROM:${STX_ADDRESS_1} TXTYPE:token_transfer BEFORE:2023-07-21`);
  });

  test('should build a query string with multiple transaction types', () => {
    const query = {
      fromAddress: STX_ADDRESS_1,
      transactionType: 'token_transfer,contract_call',
      endTime: 1689983999,
    };
    const result = buildAdvancedSearchQuery(query);
    expect(result).toBe(
      `FROM:${STX_ADDRESS_1} TXTYPE:token_transfer,contract_call BEFORE:2023-07-21`
    );
  });

  test('should build a query string from a parsed object', () => {
    const query = {
      fromAddress: STX_ADDRESS_1,
      toAddress: STX_ADDRESS_2,
      endTime: 1689983999,
      startTime: 1689897600,
    };
    const result = buildAdvancedSearchQuery(query);
    expect(result).toBe(
      `FROM:${STX_ADDRESS_1} TO:${STX_ADDRESS_2} BEFORE:2023-07-21 AFTER:2023-07-21`
    );
  });

  test('should build a query string with partial query object', () => {
    const query = {
      fromAddress: STX_ADDRESS_1,
      toAddress: null,
    };
    const result = buildAdvancedSearchQuery(query);
    expect(result).toBe(`FROM:${STX_ADDRESS_1}`);
  });

  test('should handle empty query object correctly', () => {
    const query = {};
    const result = buildAdvancedSearchQuery(query);
    expect(result).toBe('');
  });

  test('should transform and then build to match original value', () => {
    const originalDate = '2023-07-21';
    const transformedDate = advancedSearchConfig['BEFORE:'].transform(originalDate);
    const rebuiltDate = advancedSearchConfig['BEFORE:'].build(transformedDate);
    expect(rebuiltDate).toEqual(originalDate);

    const originalDate2 = '2023-07-21';
    const transformedDate2 = advancedSearchConfig['AFTER:'].transform(originalDate2);
    const rebuiltDate2 = advancedSearchConfig['AFTER:'].build(transformedDate2);
    expect(rebuiltDate2).toEqual(originalDate2);
  });
});

describe('getSearchPageUrl', () => {
  test('should return a URL with a single advanced search parameter', () => {
    const result = getSearchPageUrl(`FROM:${STX_ADDRESS_1}`, {} as Network);
    expect(result).toBe(`/search?chain=mainnet&fromAddress=${encodeURIComponent(STX_ADDRESS_1)}`);
  });

  test('should return a URL with multiple advanced search parameters', () => {
    const searchTerm = `FROM:${STX_ADDRESS_1} TO:${STX_ADDRESS_2} BEFORE:2023-07-21`;
    const result = getSearchPageUrl(searchTerm, {} as Network);
    expect(result).toBe(
      `/search?chain=mainnet&fromAddress=${encodeURIComponent(
        STX_ADDRESS_1
      )}&toAddress=${encodeURIComponent(STX_ADDRESS_2)}&endTime=1689983999`
    );
  });

  test('should correctly handle an empty search term', () => {
    const result = getSearchPageUrl('', {} as Network);
    expect(result).toBe('/search?chain=mainnet');
  });

  test('should ignore spaces between advanced search terms', () => {
    const searchTerm = `FROM:${STX_ADDRESS_1}   TO:${STX_ADDRESS_2}   BEFORE:2023-07-21 `;
    const result = getSearchPageUrl(searchTerm, {} as Network);
    expect(result).toBe(
      `/search?chain=mainnet&fromAddress=${encodeURIComponent(
        STX_ADDRESS_1
      )}&toAddress=${encodeURIComponent(STX_ADDRESS_2)}&endTime=1689983999`
    );
  });
});

describe('isValidDateString', () => {
  test('should return true for valid date formats', () => {
    expect(isValidDateString('2023-01-01')).toBe(true);
    expect(isValidDateString('2024-02-29')).toBe(true);
    expect(isValidDateString('2023-12-31')).toBe(true);
  });

  test('should return false for invalid date formats', () => {
    expect(isValidDateString('01-01-2023')).toBe(false);
    expect(isValidDateString('2023/01/01')).toBe(false);
    expect(isValidDateString('20230101')).toBe(false);
    expect(isValidDateString('2023-1-1')).toBe(false);
    expect(isValidDateString('23-01-01')).toBe(false);
  });

  test('should return false for dates with invalid ranges', () => {
    expect(isValidDateString('2023-00-01')).toBe(false);
    expect(isValidDateString('2023-13-01')).toBe(false);
    expect(isValidDateString('2023-01-00')).toBe(false);
    expect(isValidDateString('2023-01-32')).toBe(false);
  });

  test('should return false for invalid calendar dates', () => {
    expect(isValidDateString('2023-02-29')).toBe(false);
    expect(isValidDateString('2023-04-31')).toBe(false);
    expect(isValidDateString('2023-06-31')).toBe(false);
    expect(isValidDateString('2023-09-31')).toBe(false);
    expect(isValidDateString('2023-11-31')).toBe(false);
  });

  test('should handle leap years correctly', () => {
    expect(isValidDateString('2020-02-29')).toBe(true);
    expect(isValidDateString('2000-02-29')).toBe(true);
    expect(isValidDateString('2100-02-29')).toBe(false);
  });
});

describe('formatTransactionType', () => {
  test('should return single transaction type unchanged', () => {
    expect(formatTransactionType('token_transfer')).toBe('token_transfer');
    expect(formatTransactionType('contract_call')).toBe('contract_call');
    expect(formatTransactionType('smart_contract')).toBe('smart_contract');
  });

  test('should format comma-separated transaction types with spaces', () => {
    expect(formatTransactionType('token_transfer,contract_call')).toBe(
      'token_transfer, contract_call'
    );
    expect(formatTransactionType('token_transfer,contract_call,smart_contract')).toBe(
      'token_transfer, contract_call, smart_contract'
    );
  });

  test('should handle empty string', () => {
    expect(formatTransactionType('')).toBe('');
  });
});

describe('blockToSearchResult', () => {
  const baseBlock = {
    canonical: true,
    height: 12345,
    hash: '0xabc',
    block_time: 0,
    block_time_iso: '',
    tenure_height: 0,
    index_block_hash: '',
    parent_block_hash: '',
    parent_index_block_hash: '',
    burn_block_time: 0,
    burn_block_time_iso: '',
    burn_block_hash: '',
    burn_block_height: 0,
    miner_txid: '',
    tx_count: 7,
    execution_cost_read_count: 0,
    execution_cost_read_length: 0,
    execution_cost_runtime: 0,
    execution_cost_write_count: 0,
    execution_cost_write_length: 0,
  };

  test('maps tx_count and hash through to the result', () => {
    const result = blockToSearchResult(baseBlock);
    expect(result.found).toBe(true);
    expect(result.result.entity_type).toBe(SearchResultType.BlockHash);
    expect(result.result.entity_id).toBe('0xabc');
    if (result.result.entity_type === SearchResultType.BlockHash) {
      expect(result.result.tx_count).toBe(7);
    }
  });

  test('falls back to 0 when tx_count is missing', () => {
    const result = blockToSearchResult({ ...baseBlock, tx_count: undefined as unknown as number });
    if (result.result.entity_type === SearchResultType.BlockHash) {
      expect(result.result.tx_count).toBe(0);
    }
  });
});
