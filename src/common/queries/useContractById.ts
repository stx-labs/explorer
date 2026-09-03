'use client';

import {
  UseQueryResult,
  UseSuspenseQueryResult,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { useGlobalContext } from '../context/useGlobalContext';
import { ContractWithParsedAbi } from '../types/contract';

export function useContractById(
  contractId?: string,
  options: any = {}
): UseQueryResult<ContractWithParsedAbi> {
  const apiClient = useApiClient();
  // The same contract id names different code on different networks.
  const apiUrl = useGlobalContext().activeNetwork.url;
  return useQuery({
    queryKey: ['contractById', contractId, apiUrl],
    queryFn: async () => {
      if (!contractId) return undefined;
      const contract = await callApiWithErrorHandling(
        apiClient,
        '/extended/v1/contract/{contract_id}',
        {
          params: { path: { contract_id: contractId } },
        }
      );
      return {
        ...contract,
        abi: contract.abi ? JSON.parse(contract.abi) : undefined,
      } as ContractWithParsedAbi;
    },
    staleTime: Infinity,
    enabled: !!contractId,
    ...options,
  });
}

export function useSuspenseContractById(
  contractId?: string,
  options: any = {}
): UseSuspenseQueryResult<ContractWithParsedAbi> {
  const apiClient = useApiClient();
  const apiUrl = useGlobalContext().activeNetwork.url;
  if (!contractId) throw new Error('Contract ID is required');
  return useSuspenseQuery({
    queryKey: ['contractById', contractId, apiUrl],
    queryFn: async () => {
      if (!contractId) return undefined;
      const contract = await callApiWithErrorHandling(
        apiClient,
        '/extended/v1/contract/{contract_id}',
        {
          params: { path: { contract_id: contractId } },
        }
      );
      return {
        ...contract,
        abi: contract.abi ? JSON.parse(contract.abi) : undefined,
      } as ContractWithParsedAbi;
    },
    staleTime: Infinity,
    ...options,
  });
}
