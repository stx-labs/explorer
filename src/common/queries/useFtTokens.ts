'use client';

import {
  InfiniteData,
  UseInfiniteQueryResult,
  UseSuspenseInfiniteQueryResult,
  useInfiniteQuery,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';

import type { operations } from '@stacks/token-metadata-api-client/lib/generated/schema';

import { useMetadataApi } from '../api/useApi';
import { DEFAULT_LIST_LIMIT } from '../constants/constants';
import { GenericResponseType } from '../hooks/useInfiniteQueryResult';
import { getNextPageParam } from '../utils/utils';
import { FIVE_MINUTES } from './query-stale-time';

type FtBasicMetadataResponse =
  operations['getFungibleTokens']['responses']['200']['content']['application/json']['results'][number];

export const useFtTokens = (
  {
    name,
    symbol,
    address,
    order_by,
    order,
  }: {
    name?: string;
    symbol?: string;
    address?: string;
    order_by?: 'name' | 'symbol';
    order?: 'asc' | 'desc';
  },
  options: any = {}
): UseInfiniteQueryResult<InfiniteData<GenericResponseType<FtBasicMetadataResponse>>> => {
  const client = useMetadataApi();
  return useInfiniteQuery({
    queryKey: ['ftTokens', name, symbol, address, order_by, order],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const { data, error } = await client.GET('/metadata/v1/ft', {
        params: {
          query: {
            name,
            symbol,
            address,
            offset: pageParam,
            limit: DEFAULT_LIST_LIMIT,
            order_by,
            order,
            valid_metadata_only: true,
          },
        },
      });
      if (error) throw new Error('Failed to fetch FT tokens');
      return data;
    },
    getNextPageParam,
    initialPageParam: 0,
    staleTime: FIVE_MINUTES,
    ...options,
  });
};

export const useSuspenseFtTokens = (
  {
    name,
    symbol,
    address,
    order_by,
    order,
  }: {
    name?: string;
    symbol?: string;
    address?: string;
    order_by?: 'name' | 'symbol';
    order?: 'asc' | 'desc';
  },
  options: any = {}
): UseSuspenseInfiniteQueryResult<InfiniteData<GenericResponseType<FtBasicMetadataResponse>>> => {
  const client = useMetadataApi();
  return useSuspenseInfiniteQuery({
    queryKey: ['ftTokens', name, symbol, address, order_by, order],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const { data, error } = await client.GET('/metadata/v1/ft', {
        params: {
          query: {
            name,
            symbol,
            address,
            offset: pageParam,
            limit: DEFAULT_LIST_LIMIT,
            order_by,
            order,
            valid_metadata_only: true,
          },
        },
      });
      if (error) throw new Error('Failed to fetch FT tokens');
      return data;
    },
    getNextPageParam,
    initialPageParam: 0,
    staleTime: FIVE_MINUTES,
    ...options,
  });
};
