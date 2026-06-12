'use client';

import {
  UseQueryResult,
  UseSuspenseQueryResult,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';

import { callApiWithErrorHandling } from '../../api/callApiWithErrorHandling';
import { useApiClient } from '../../api/useApiClient';
import { ContractWithParsedAbi } from '../types/contract';

export function useContractById(
  contractId?: string,
  options: any = {}
): UseQueryResult<ContractWithParsedAbi> {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['contractById', contractId],
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
  if (!contractId) throw new Error('Contract ID is required');
  return useSuspenseQuery({
    queryKey: ['contractById', contractId],
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
