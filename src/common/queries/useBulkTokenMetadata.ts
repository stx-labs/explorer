'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createClient } from '@stacks/token-metadata-api-client';
import type { operations } from '@stacks/token-metadata-api-client/lib/generated/schema';

import { useGlobalContext } from '../context/useGlobalContext';

type FtMetadataResponse =
  operations['getFtMetadata']['responses']['200']['content']['application/json'];
type SearchResultItem =
  operations['searchTokens']['responses']['200']['content']['application/json'][number];

const BULK_SEARCH_BATCH_SIZE = 50;

async function fetchBulkTokenMetadata(
  baseUrl: string,
  contractIds: string[]
): Promise<SearchResultItem[]> {
  if (contractIds.length === 0) return [];

  const client = createClient({ baseUrl });

  const batches: string[][] = [];
  for (let i = 0; i < contractIds.length; i += BULK_SEARCH_BATCH_SIZE) {
    batches.push(contractIds.slice(i, i + BULK_SEARCH_BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(async batch => {
      const { data, error } = await client.GET('/metadata/v1/search', {
        params: { query: { contract: batch } },
      });
      if (error) throw new Error('Failed to fetch bulk token metadata');
      return data;
    })
  );

  return results.flat();
}

export function searchResultToFtMetadataResponse(item: SearchResultItem): FtMetadataResponse {
  return {
    name: item.name,
    symbol: item.symbol,
    decimals: item.decimals,
    total_supply: item.total_supply,
    token_uri: item.token_uri,
    description: item.description,
    image_uri: item.image_uri,
    image_canonical_uri: item.image_canonical_uri,
    tx_id: item.tx_id,
    sender_address: item.sender_address,
    asset_identifier: item.contract_id,
    metadata: {
      sip: 10,
      name: item.name,
      description: item.description,
      cached_image: item.image_uri,
      image: item.image_canonical_uri,
    },
  };
}

const BULK_TOKEN_METADATA_QUERY_KEY = 'bulk-token-metadata';

export function useBulkFtMetadata(contractIds: string[]) {
  const basePath = useGlobalContext().activeNetworkKey;

  const sortedIds = useMemo(
    () => Array.from(new Set(contractIds.filter(Boolean))).sort(),
    [contractIds]
  );

  const query = useQuery({
    queryKey: [BULK_TOKEN_METADATA_QUERY_KEY, sortedIds],
    queryFn: () => fetchBulkTokenMetadata(basePath, sortedIds),
    enabled: sortedIds.length > 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const metadataMap = useMemo(() => {
    const map = new Map<string, FtMetadataResponse>();
    query.data?.forEach(item => {
      const converted = searchResultToFtMetadataResponse(item);
      // Key by contract_id for FT lookups
      map.set(item.contract_id, converted);
      // Also key by contract_id:token_number for NFT lookups where
      // multiple tokens from the same contract have different metadata
      if (item.token_number) {
        map.set(`${item.contract_id}:${item.token_number}`, converted);
      }
    });
    return map;
  }, [query.data]);

  return {
    metadataMap,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
