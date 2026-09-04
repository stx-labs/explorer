'use client';

import { callApiWithErrorHandling } from '@/api/callApiWithErrorHandling';
import { useApiClient } from '@/api/useApiClient';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { FIVE_MINUTES } from '@/common/queries/query-stale-time';
import { getContractByIdQueryOptions, useContractById } from '@/common/queries/useContractById';
import {
  ContractInfo,
  DiagnoseLoaders,
  Diagnosis,
  FailedContractCallTx,
  diagnoseSync,
  enrich,
  parseContractAbi,
} from '@/common/tx-diagnosis';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useTxIdPageData } from '../../TxIdPageContext';

/** The base diagnosis could still improve by looking at callee contracts. */
function needsCalleeLookup(d: Diagnosis): boolean {
  const code = d.errorCode;
  return !!code && !code.definedIn && !code.candidateNames;
}

/**
 * Tier 0 is computed synchronously from the transaction and the called contract (which the page
 * already fetches via `useContractById`, seeded from SSR when available), so the first paint costs
 * no extra browser request. Enrichment runs in two stages, each a separate query that never blocks
 * paint: callee lookups start once the contract query has settled and only when the error code is
 * still unresolved; correlations (sender history, balances) start when the card is expanded, since
 * they only render there.
 */
export function useTxDiagnosis(
  tx: FailedContractCallTx,
  { expanded = false }: { expanded?: boolean } = {}
): {
  diagnosis: Diagnosis;
  isEnriching: boolean;
} {
  const { initialContractData } = useTxIdPageData();
  const apiUrl = useGlobalContext().activeNetwork.url;
  const contractId = tx.contract_call.contract_id;
  const seeded =
    initialContractData && initialContractData.contract_id === contractId
      ? {
          ...initialContractData,
          abi: parseContractAbi(initialContractData.abi),
        }
      : undefined;
  const { data: contract, isPending: contractPending } = useContractById(
    contractId,
    seeded ? { initialData: seeded } : {}
  );
  const called: ContractInfo | null = useMemo(
    () =>
      contract?.source_code
        ? { contract_id: contractId, source_code: contract.source_code, abi: contract.abi }
        : null,
    [contract?.source_code, contract?.abi, contractId]
  );

  const base = useMemo(() => diagnoseSync(tx, called), [tx, called]);

  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const loaders = useMemo<DiagnoseLoaders>(
    () => ({
      contracts: async id => {
        const c = await queryClient.fetchQuery(getContractByIdQueryOptions(apiClient, id, apiUrl));
        return c?.source_code ? { contract_id: id, source_code: c.source_code, abi: c.abi } : null;
      },
      history: {
        senderTransactions: async (sender, limit) => {
          // This endpoint is deprecated in the generated schema. Migrating correlations to the v3
          // principal endpoint is a separate behavior change because its response shape differs.
          const res = await callApiWithErrorHandling(
            apiClient,
            '/extended/v2/addresses/{address}/transactions',
            { params: { path: { address: sender }, query: { limit } } }
          );
          return (res.results ?? []).map(result => {
            const contractCall = 'contract_call' in result.tx ? result.tx.contract_call : undefined;
            return {
              tx_id: result.tx.tx_id,
              tx_status: result.tx.tx_status,
              block_height: result.tx.block_height,
              contract_id: contractCall?.contract_id,
              function_name: contractCall?.function_name,
              function_args_repr: contractCall?.function_args?.map(arg => arg.repr),
            };
          });
        },
        addressTxCount: async address => {
          const res = await callApiWithErrorHandling(
            apiClient,
            '/extended/v2/addresses/{address}/transactions',
            { params: { path: { address }, query: { limit: 1 } } }
          );
          return res.total ?? 0;
        },
        ftBalanceAt: async (address, assetId, blockHeight) => {
          const res = await callApiWithErrorHandling(
            apiClient,
            '/extended/v1/address/{principal}/balances',
            {
              params: { path: { principal: address }, query: { until_block: String(blockHeight) } },
            }
          );
          if (assetId === 'STX') return res.stx?.balance ?? null;
          return res.fungible_tokens?.[assetId]?.balance ?? null;
        },
      },
    }),
    [apiClient, queryClient, apiUrl]
  );

  // Keys carry the API URL: the same transaction id means different data on another network.
  const contractState = contractPending ? 'pending' : called ? 'with-contract' : 'no-contract';

  const callees = useQuery({
    queryKey: ['txDiagnosis', apiUrl, tx.tx_id, contractState, 'callees'],
    queryFn: () => enrich(tx, called, { contracts: loaders.contracts }),
    enabled: !contractPending && needsCalleeLookup(base),
    staleTime: FIVE_MINUTES,
  });

  const correlations = useQuery({
    queryKey: ['txDiagnosis', apiUrl, tx.tx_id, contractState, 'correlations'],
    queryFn: () => enrich(tx, called, loaders),
    enabled: expanded && !contractPending,
    staleTime: FIVE_MINUTES,
  });

  return {
    diagnosis: correlations.data ?? callees.data ?? base,
    isEnriching: expanded && correlations.isFetching && !correlations.data,
  };
}
