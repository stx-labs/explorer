'use client';

import { UTCDate } from '@date-fns/utc';
import { useQuery } from '@tanstack/react-query';
import { getNameInfo } from 'bns-v2-sdk';

import { OperationResponse } from '@stacks/blockchain-api-client';
import { Block, Transaction, TransactionType } from '@stacks/stacks-blockchain-api-types';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { blur, focus } from '../../features/search/search-slice';
import { useGlobalContext } from '../context/useGlobalContext';
import { useAppDispatch } from '../state/hooks';
import { Network, NetworkModes } from '../types/network';
import {
  BlockSearchResult,
  BnsSearchResult,
  FoundResult,
  NotFoundResult,
  SearchResultType,
} from '../types/search-results';
import { buildUrl } from '../utils/buildUrl';
import { hasBnsExtension, isNumeric } from '../utils/utils';

type NakamotoBlock = OperationResponse['/extended/v2/blocks/{height_or_hash}'];

export function blockToSearchResult(block: NakamotoBlock): FoundResult {
  const blockResult: BlockSearchResult = {
    entity_id: block.hash,
    entity_type: SearchResultType.BlockHash,
    block_data: block as unknown as Partial<Block>,
    tx_count: block.tx_count ?? 0,
  };
  return {
    found: true,
    result: blockResult,
  };
}

export function nftHistoryToSearchResult(nftHistoryEntry: any, bnsName: string): FoundResult {
  const blockResult: BnsSearchResult = {
    entity_id: nftHistoryEntry.recipient,
    entity_type: SearchResultType.BnsAddress,
    display_name: bnsName,
  };
  return {
    found: true,
    result: blockResult,
  };
}

export async function searchByBnsName(
  networkMode: NetworkModes,
  bnsName: string
): Promise<FoundResult | NotFoundResult> {
  try {
    const nameInfo = await getNameInfo({
      fullyQualifiedName: bnsName,
      network: networkMode,
    });
    if (nameInfo?.owner) {
      return nftHistoryToSearchResult({ recipient: nameInfo.owner }, bnsName);
    }
    return {
      found: false,
      result: {
        entity_type: SearchResultType.UnknownHash,
      },
      error: 'BNS name not found',
    } as NotFoundResult;
  } catch (e) {
    return {
      found: false,
      result: {
        entity_type: SearchResultType.UnknownHash,
      },
      error: 'BNS name not found',
    } as NotFoundResult;
  }
}

export type AdvancedSearchKeywords = 'FROM:' | 'TO:' | 'BEFORE:' | 'AFTER:' | 'TERM:' | 'TXTYPE:';

type AdvancedSearchConfig = Record<
  string,
  { filter: string; type: string; transform: (value: string) => any; build: (value: any) => string }
>;

export function getKeywordByFilter(keyword: string) {
  switch (keyword) {
    case 'fromAddress':
      return 'FROM:';
    case 'toAddress':
      return 'TO:';
    case 'endTime':
      return 'BEFORE:';
    case 'startTime':
      return 'AFTER:';
    case 'transactionType':
      return 'TXTYPE:';
    default:
      return '';
  }
}

export function formatTimestamp(value: string) {
  const utcDate = new UTCDate(Number(value) * 1000);
  const month = utcDate.getUTCMonth();
  const day = utcDate.getUTCDate();
  const year = utcDate.getUTCFullYear();
  if (isNaN(month) || isNaN(day) || isNaN(year)) return 'invalid date';
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatTransactionType(value: string) {
  if (value.includes(',')) {
    return value
      .split(',')
      .map(type => type.trim())
      .join(', ');
  }
  return value;
}

export const filterToFormattedValueMap: Record<string, (value: string) => string> = {
  fromAddress: (value: string) => value,
  toAddress: (value: string) => value,
  endTime: formatTimestamp,
  startTime: formatTimestamp,
  transactionType: formatTransactionType,
};

export function isValidDateString(dateString: string): boolean {
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateFormatRegex.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split('-').map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const utcDate = new UTCDate(year, month - 1, day);
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

export const advancedSearchConfig: AdvancedSearchConfig = {
  'FROM:': {
    filter: 'fromAddress',
    type: 'ADDRESS',
    transform: (value: string) => value,
    build: (value: string) => value,
  },
  'TO:': {
    filter: 'toAddress',
    type: 'ADDRESS',
    transform: (value: string) => value,
    build: (value: string) => value,
  },
  'BEFORE:': {
    filter: 'endTime',
    type: 'YYYY-MM-DD',
    transform: (value: string) => {
      if (!isValidDateString(value)) {
        return null;
      }
      const [year, month, day] = value.split('-').map(Number);
      const utcDate = new UTCDate(year, month - 1, day, 23, 59, 59);
      return Math.floor(utcDate.getTime() / 1000);
    },
    build: (value: number) => {
      const date = new Date(value * 1000);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
  },
  'AFTER:': {
    filter: 'startTime',
    type: 'YYYY-MM-DD',
    transform: (value: string) => {
      if (!isValidDateString(value)) {
        return null;
      }
      const [year, month, day] = value.split('-').map(Number);
      const utcDate = new UTCDate(year, month - 1, day, 0, 0, 0);
      return Math.floor(utcDate.getTime() / 1000);
    },
    build: (value: number) => {
      const date = new Date(value * 1000);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
  },
  'TERM:': {
    filter: 'term',
    type: 'string',
    transform: (value: string) => value,
    build: (value: string) => value,
  },
  'TXTYPE:': {
    filter: 'transactionType',
    type: 'token_transfer,contract_call,contract_deploy,coinbase,tenure_change',
    transform: (value: string) => {
      return value
        .split(',')
        .map(type => type.trim())
        .filter(Boolean);
    },
    build: (value: string | string[]) => {
      if (Array.isArray(value)) {
        return value.join(',');
      }
      return value;
    },
  },
};

export const advancedSearchKeywords: string[] = Object.keys(
  advancedSearchConfig
) as AdvancedSearchKeywords[];

const splitRegex = new RegExp(` +|(${advancedSearchKeywords.join('|')})`);

export function parseAdvancedSearchQuery(id: string) {
  const query: { filterName: string; filterValue: string }[] = [];
  const isAdvancedSearch = advancedSearchKeywords.some(term => id.includes(term));
  if (!isAdvancedSearch) return query;
  const startsWithTerm = !advancedSearchKeywords.some(term => id.startsWith(term));
  if (startsWithTerm) {
    const term = id.split(splitRegex)[0].trim();
    query.push({ filterName: 'term', filterValue: term });
  }
  Object.entries(advancedSearchConfig).forEach(([key, config]) => {
    const index = id.indexOf(key);
    if (index !== -1) {
      const [filterValue, ...termValue] = id
        .slice(index + key.length)
        .split(splitRegex)[0]
        .trim()
        .split(' ');
      query.push({
        filterName: config.filter,
        filterValue: config.transform(filterValue),
      });
      if (termValue.length) {
        query.push({ filterName: 'term', filterValue: termValue.join(' ') });
      }
    }
  });
  return query;
}

export function buildAdvancedSearchQuery(query: Record<string, string | number | null>): string {
  let searchTerm = '';
  Object.entries(query).forEach(([filter, value]) => {
    if (!value) return;
    const keyword = getKeywordByFilter(filter);
    if (!keyword) {
      // term
      searchTerm += `${value} `;
    } else {
      const config = advancedSearchConfig[keyword];
      const transformedValue = config.build(value as string | number);
      searchTerm += `${keyword}${transformedValue} `;
    }
  });
  return searchTerm.trim();
}

export function getSearchPageUrl(searchTerm: string, network: Network) {
  const advancedSearchQuery = parseAdvancedSearchQuery(searchTerm);
  const searchQueryParams = new URLSearchParams();
  let termCount = 0;
  advancedSearchQuery.forEach(({ filterName, filterValue }) => {
    if (filterName === 'term') {
      searchQueryParams.append(`${filterName}_${++termCount}`, filterValue);
    } else {
      searchQueryParams.append(filterName, filterValue);
    }
  });
  const hasQueryParams = searchQueryParams.toString().length > 0;
  return `${buildUrl('/search', network)}${
    hasQueryParams ? '&' : ''
  }${searchQueryParams.toString()}`;
}

const RECENT_RESULTS_KEY = 'recentResults';
const RECENT_RESULTS_LIMIT = 3;

export function updateRecentResultsLocalStorage(resultItem: FoundResult) {
  const lastFoundResults = JSON.parse(localStorage.getItem(RECENT_RESULTS_KEY) || '[]');
  const filteredResults = lastFoundResults.filter(
    (result: FoundResult) => result.result.entity_id !== resultItem.result.entity_id
  );
  localStorage.setItem(
    RECENT_RESULTS_KEY,
    JSON.stringify([resultItem, ...filteredResults].slice(0, RECENT_RESULTS_LIMIT))
  );
}

export function useRecentResultsLocalStorage() {
  try {
    const recentResultsJson = localStorage.getItem(RECENT_RESULTS_KEY) || '[]';
    return JSON.parse(recentResultsJson) as FoundResult[];
  } catch (e) {
    return [];
  }
}

export function useSearchQuery(id: string, isRedesign?: boolean) {
  const dispatch = useAppDispatch();
  const { activeNetwork } = useGlobalContext();
  const isBnsName = hasBnsExtension(id);
  const advancedSearchQuery = parseAdvancedSearchQuery(id);
  const isAdvancedSearch = advancedSearchQuery.length > 0;
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['search', isAdvancedSearch ? JSON.stringify(advancedSearchQuery) : id],
    queryFn: async () => {
      let foundResult: FoundResult | undefined = undefined;
      let notFoundResult: NotFoundResult | undefined = undefined;
      if (isAdvancedSearch) {
        const hasTerm = advancedSearchQuery.some(({ filterName }) => filterName === 'term');
        if (hasTerm) {
          // not supported, return no results
          notFoundResult = {
            found: false,
            result: {
              entity_type: SearchResultType.InvalidTerm,
            },
            error: 'Not supported',
          };
          return notFoundResult;
        }
        const fromFilter = advancedSearchQuery.find(
          ({ filterName }) => filterName === 'fromAddress'
        );
        const toFilter = advancedSearchQuery.find(({ filterName }) => filterName === 'toAddress');
        if (hasBnsExtension(fromFilter?.filterValue)) {
          const fromResult = await searchByBnsName(activeNetwork.mode, fromFilter!.filterValue);
          fromFilter!.filterValue =
            (fromResult?.found ? fromResult.result.entity_id : undefined) ||
            fromFilter!.filterValue;
        }
        if (hasBnsExtension(toFilter?.filterValue)) {
          const toResult = await searchByBnsName(activeNetwork.mode, toFilter!.filterValue);
          toFilter!.filterValue =
            (toResult?.found ? toResult.result.entity_id : undefined) || toFilter!.filterValue;
        }
        const fromAddress = advancedSearchQuery.find(
          ({ filterName }) => filterName === 'fromAddress'
        )?.filterValue;
        const toAddress = advancedSearchQuery.find(
          ({ filterName }) => filterName === 'toAddress'
        )?.filterValue;
        const startTime = advancedSearchQuery.find(
          ({ filterName }) => filterName === 'startTime'
        )?.filterValue;
        const endTime = advancedSearchQuery.find(
          ({ filterName }) => filterName === 'endTime'
        )?.filterValue;
        const transactionType = advancedSearchQuery.find(
          ({ filterName }) => filterName === 'transactionType'
        )?.filterValue;
        const term = advancedSearchQuery
          .filter(({ filterName }) => filterName === 'term')
          .reduce((acc, { filterValue }) => acc + filterValue + ' ', '')
          .trim();
        // TODO: use term when it's supported
        const txsResponse = await callApiWithErrorHandling(apiClient, '/extended/v1/tx/', {
          params: {
            query: {
              limit: 5,
              offset: 0,
              unanchored: true,
              order: 'desc',
              sort_by: 'burn_block_time',
              ...(fromAddress && { from_address: fromAddress }),
              ...(toAddress && { to_address: toAddress }),
              ...(startTime && { start_time: Number(startTime) }),
              ...(endTime && { end_time: Number(endTime) }),
              ...(transactionType && {
                type: (Array.isArray(transactionType)
                  ? transactionType
                  : [transactionType]) as TransactionType[],
              }),
            },
          },
        });
        const txs = (txsResponse?.results as Transaction[]) || ([] as Transaction[]);
        foundResult = {
          found: true,
          result: {
            entity_id: id,
            entity_type: SearchResultType.TxList,
            txs,
            metadata: {
              totalCount: txsResponse.total,
            },
          },
        };
      } else if (isBnsName) {
        const bnsResult = await searchByBnsName(activeNetwork.mode, id);
        if (bnsResult?.found) {
          foundResult = bnsResult as FoundResult;
        } else {
          notFoundResult = bnsResult as NotFoundResult;
        }
      } else if (isNumeric(id)) {
        // Fetch block height if numeric
        try {
          const height = parseInt(id);
          const block = await callApiWithErrorHandling(
            apiClient,
            '/extended/v2/blocks/{height_or_hash}',
            {
              params: { path: { height_or_hash: height } },
            }
          );
          if (block) {
            foundResult = blockToSearchResult(block);
          }
        } catch (e) {
          notFoundResult = {
            found: false,
            result: {
              entity_type: SearchResultType.UnknownHash,
            },
            error: 'Not found',
          };
        }
      } else {
        try {
          const data = await callApiWithErrorHandling(apiClient, '/extended/v1/search/{id}', {
            params: { path: { id }, query: { include_metadata: true } },
          });
          foundResult = data as FoundResult;
        } catch (e: any) {
          try {
            const data = await e.json();
            if (data && 'found' in data) {
              // An address for which the API doesn't have data is still a valid address that can be shown on the explorer
              if (
                (data as NotFoundResult).result?.entity_type === SearchResultType.StandardAddress &&
                data.found === false
              ) {
                foundResult = {
                  found: true,
                  result: {
                    entity_type: SearchResultType.StandardAddress,
                    entity_id: id,
                  },
                };
              } else {
                notFoundResult = data;
              }
            } else {
              notFoundResult = data;
            }
          } catch (e) {
            notFoundResult = {
              found: false,
              result: {
                entity_type: SearchResultType.UnknownHash,
              },
              error: 'Unknown',
            };
          }
        }
      }

      if (foundResult && isRedesign) {
        updateRecentResultsLocalStorage(foundResult);
      }

      if (foundResult) {
        if (foundResult.result.entity_type !== SearchResultType.TxList) {
          if (isRedesign) {
            return foundResult as FoundResult;
          }
          // single result, blur and go to entity page directly
          dispatch(blur());
        } else {
          dispatch(focus());
        }
        return foundResult as FoundResult;
      } else if (notFoundResult) {
        dispatch(focus());
        return notFoundResult as NotFoundResult;
      } else {
        return null;
      }
    },
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1 * 60 * 1000,
  });
}
