'use client';

import { callApiWithErrorHandling } from '@/api/callApiWithErrorHandling';
import { useApiClient } from '@/api/useApiClient';
import { useContractById } from '@/common/queries/useContractById';
import {
  ContractInfo,
  DiagnoseLoaders,
  Diagnosis,
  FailedContractCallTx,
  diagnoseSync,
  enrich,
} from '@/common/tx-diagnosis';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useTxIdPageData } from '../../TxIdPageContext';

const ENRICHMENT_STALE_TIME = 5 * 60 * 1000;

interface AddressTxItem {
  tx: {
    tx_id: string;
    tx_status: string;
    block_height?: number;
    contract_call?: {
      contract_id: string;
      function_name: string;
      function_args?: { repr: string }[];
    };
  };
}

/**
 * Tier 0 is computed synchronously from the transaction and the called contract (which the page
 * already fetches via `useContractById`, seeded from SSR when available). Tier 1 enrichment —
 * bounded callee lookups and correlations — runs in a separate query and never blocks first paint.
 */
export function useTxDiagnosis(tx: FailedContractCallTx): {
  diagnosis: Diagnosis;
  isEnriching: boolean;
} {
  const { initialContractData } = useTxIdPageData();
  const contractId = tx.contract_call.contract_id;
  const seeded =
    initialContractData && initialContractData.contract_id === contractId
      ? {
          ...initialContractData,
          abi: initialContractData.abi ? JSON.parse(initialContractData.abi) : undefined,
        }
      : undefined;
  const { data: contract } = useContractById(contractId, seeded ? { initialData: seeded } : {});
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
        const c = await queryClient.fetchQuery({
          queryKey: ['contractById', id],
          queryFn: async () => {
            const raw = await callApiWithErrorHandling(
              apiClient,
              '/extended/v1/contract/{contract_id}',
              { params: { path: { contract_id: id } } }
            );
            return { ...raw, abi: raw.abi ? JSON.parse(raw.abi) : undefined };
          },
          staleTime: Infinity,
        });
        return c?.source_code ? { contract_id: id, source_code: c.source_code } : null;
      },
      history: {
        senderTransactions: async (sender, limit) => {
          const res = (await callApiWithErrorHandling(
            apiClient,
            '/extended/v2/addresses/{address}/transactions',
            { params: { path: { address: sender }, query: { limit } } }
          )) as unknown as { results: AddressTxItem[] };
          return (res.results ?? []).map(r => ({
            tx_id: r.tx.tx_id,
            tx_status: r.tx.tx_status,
            block_height: r.tx.block_height,
            contract_id: r.tx.contract_call?.contract_id,
            function_name: r.tx.contract_call?.function_name,
            function_args_repr: r.tx.contract_call?.function_args?.map(a => a.repr),
          }));
        },
        addressTxCount: async address => {
          const res = (await callApiWithErrorHandling(
            apiClient,
            '/extended/v2/addresses/{address}/transactions',
            { params: { path: { address }, query: { limit: 1 } } }
          )) as unknown as { total: number };
          return res.total ?? 0;
        },
        ftBalanceAt: async (address, assetId, blockHeight) => {
          const res = (await callApiWithErrorHandling(
            apiClient,
            '/extended/v1/address/{principal}/balances',
            {
              params: { path: { principal: address }, query: { until_block: String(blockHeight) } },
            }
          )) as unknown as {
            stx?: { balance: string };
            fungible_tokens?: Record<string, { balance: string }>;
          };
          if (assetId === 'STX') return res.stx?.balance ?? null;
          return res.fungible_tokens?.[assetId]?.balance ?? null;
        },
      },
    }),
    [apiClient, queryClient]
  );

  const { data: enriched, isFetching } = useQuery({
    queryKey: ['txDiagnosis', tx.tx_id, called ? 'with-contract' : 'no-contract'],
    queryFn: () => enrich(tx, called, loaders),
    staleTime: ENRICHMENT_STALE_TIME,
  });

  return { diagnosis: enriched ?? base, isEnriching: isFetching && !enriched };
}
