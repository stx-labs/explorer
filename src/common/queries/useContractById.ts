'use client';

import {
  UseQueryOptions,
  UseQueryResult,
  UseSuspenseQueryOptions,
  UseSuspenseQueryResult,
  queryOptions,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { useGlobalContext } from '../context/useGlobalContext';
import { parseContractAbi } from '../tx-diagnosis/abi';
import { ContractWithParsedAbi } from '../types/contract';

export const getContractByIdQueryKey = (contractId: string | undefined, apiUrl: string) =>
  ['contractById', contractId, apiUrl] as const;

export function getContractByIdQueryOptions(
  apiClient: ReturnType<typeof useApiClient>,
  contractId: string | undefined,
  apiUrl: string
) {
  return queryOptions({
    queryKey: getContractByIdQueryKey(contractId, apiUrl),
    queryFn: async (): Promise<ContractWithParsedAbi> => {
      if (!contractId) throw new Error('Contract ID is required');
      const contract = await callApiWithErrorHandling(
        apiClient,
        '/extended/v1/contract/{contract_id}',
        {
          params: { path: { contract_id: contractId } },
        }
      );
      return { ...contract, abi: parseContractAbi(contract.abi) };
    },
    staleTime: Infinity,
    enabled: !!contractId,
  });
}

type ContractByIdQueryKey = ReturnType<typeof getContractByIdQueryKey>;
type ContractByIdQueryOptions = Omit<
  UseQueryOptions<ContractWithParsedAbi, Error, ContractWithParsedAbi, ContractByIdQueryKey>,
  'queryKey' | 'queryFn'
>;
type SuspenseContractByIdQueryOptions = Omit<
  UseSuspenseQueryOptions<
    ContractWithParsedAbi,
    Error,
    ContractWithParsedAbi,
    ContractByIdQueryKey
  >,
  'queryKey' | 'queryFn'
>;

export function useContractById(
  contractId?: string,
  options: ContractByIdQueryOptions = {}
): UseQueryResult<ContractWithParsedAbi, Error> {
  const apiClient = useApiClient();
  // The same contract id names different code on different networks.
  const apiUrl = useGlobalContext().activeNetwork.url;
  return useQuery({
    ...getContractByIdQueryOptions(apiClient, contractId, apiUrl),
    ...options,
  });
}

export function useSuspenseContractById(
  contractId?: string,
  options: SuspenseContractByIdQueryOptions = {}
): UseSuspenseQueryResult<ContractWithParsedAbi, Error> {
  const apiClient = useApiClient();
  const apiUrl = useGlobalContext().activeNetwork.url;
  if (!contractId) throw new Error('Contract ID is required');
  return useSuspenseQuery({
    ...getContractByIdQueryOptions(apiClient, contractId, apiUrl),
    ...options,
  });
}
