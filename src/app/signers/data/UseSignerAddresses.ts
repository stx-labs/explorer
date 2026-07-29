import {
  InfiniteData,
  UseInfiniteQueryResult,
  useInfiniteQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';

import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { GenericResponseType } from '../../../common/hooks/useInfiniteQueryResult';
import { TEN_MINUTES, TWO_MINUTES } from '../../../common/queries/query-stale-time';
import { ApiResponseWithResultsOffset } from '../../../common/types/api';
import { getNextPageParam } from '../../../common/utils/utils';

const SIGNER_STACKERS_QUERY_KEY = 'signer-stackers';
const SIGNER_STACKERS_INFINITE_QUERY_KEY = 'signer-stackers-infinite';

export interface SignersStackersData {
  stacker_address: string;
  stacked_amount: string;
  pox_address: string;
  stacker_type: string;
}
export function useGetStackersBySignerQuery() {
  const { url: activeNetworkUrl } = useGlobalContext().activeNetwork;

  return (cycleId: number, signerKey: string) => ({
    queryKey: [SIGNER_STACKERS_QUERY_KEY, cycleId, signerKey],
    queryFn: () =>
      fetch(
        `${activeNetworkUrl}/extended/v2/pox/cycles/${cycleId}/signers/${signerKey}/stackers`
      ).then(res => res.json()) as Promise<SignersStackersData>,
    staleTime: TWO_MINUTES,
    cacheTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!cycleId && !!signerKey,
  });
}

export function useSuspenseSignerStackers(cycleId: number, signerKey: string) {
  const { url: activeNetworkUrl } = useGlobalContext().activeNetwork;

  return useSuspenseQuery<ApiResponseWithResultsOffset<SignersStackersData>>({
    queryKey: [SIGNER_STACKERS_QUERY_KEY, cycleId, signerKey],
    queryFn: () =>
      fetch(
        `${activeNetworkUrl}/extended/v2/pox/cycles/${cycleId}/signers/${signerKey}/stackers`
      ).then(res => res.json()),
    staleTime: TEN_MINUTES,
  });
}

const DEFAULT_LIST_LIMIT = 10;

const fetchStackers = async (
  apiUrl: string,
  cycleId: number,
  signerKey: string,
  pageParam: number,
  options: { limit?: number; offset?: number } = { limit: DEFAULT_LIST_LIMIT, offset: 0 }
): Promise<GenericResponseType<SignersStackersData>> => {
  const limit = options.limit || DEFAULT_LIST_LIMIT;
  const offset = pageParam || 0;
  const queryString = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  }).toString();
  const response = await fetch(
    `${apiUrl}/extended/v2/pox/cycles/${cycleId}/signers/${signerKey}/stackers${
      queryString ? `?${queryString}` : ''
    }`
  );
  return response.json();
};

export function useSuspenseSignerStackersInfinite(
  cycleId: number,
  signerKey: string,
  options: { limit?: number; offset?: number; enabled?: boolean } = {
    limit: DEFAULT_LIST_LIMIT,
    offset: 0,
  }
): UseInfiniteQueryResult<InfiniteData<GenericResponseType<SignersStackersData>>> {
  const { url: activeNetworkUrl } = useGlobalContext().activeNetwork;
  const { enabled = true, ...fetchOptions } = options;

  return useInfiniteQuery<GenericResponseType<SignersStackersData>>({
    queryKey: [SIGNER_STACKERS_INFINITE_QUERY_KEY, activeNetworkUrl, cycleId, signerKey],
    queryFn: ({ pageParam = 0 }) =>
      fetchStackers(activeNetworkUrl, cycleId, signerKey, pageParam as number, fetchOptions),
    getNextPageParam,
    initialPageParam: 0,
    staleTime: TWO_MINUTES,
    enabled: !!cycleId && !!signerKey && enabled,
  });
}
