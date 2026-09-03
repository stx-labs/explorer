import { fetchContractInfo, fetchTx } from '@/api/data-fetchers';
import { stacksAPIFetchJson } from '@/api/stacksAPIFetch';
import 'server-only';

import { renderContextPackJson, renderContextPackMarkdown } from './context-pack';
import { DiagnoseLoaders, diagnose } from './diagnose';
import { isFailedContractCall } from './types';

const HISTORY_REVALIDATE_SECONDS = 300;

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

function parseAbi(abi: unknown): unknown {
  if (typeof abi !== 'string') return abi ?? undefined;
  try {
    return JSON.parse(abi);
  } catch {
    return undefined;
  }
}

/** Loaders backed by the server-side Stacks API client (carries `EXPLORER_STACKS_API_KEY`). */
export function serverLoaders(apiUrl: string): DiagnoseLoaders {
  return {
    contracts: async id => {
      const c = await fetchContractInfo(apiUrl, id);
      return c?.source_code
        ? { contract_id: id, source_code: c.source_code, abi: parseAbi(c.abi) }
        : null;
    },
    history: {
      senderTransactions: async (sender, limit) => {
        const res = await stacksAPIFetchJson<{ results: AddressTxItem[] }>(
          `${apiUrl}/extended/v2/addresses/${sender}/transactions?limit=${limit}`,
          { next: { revalidate: HISTORY_REVALIDATE_SECONDS } }
        );
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
        const res = await stacksAPIFetchJson<{ total: number }>(
          `${apiUrl}/extended/v2/addresses/${address}/transactions?limit=1`,
          { next: { revalidate: HISTORY_REVALIDATE_SECONDS } }
        );
        return res.total ?? 0;
      },
      ftBalanceAt: async (address, assetId, blockHeight) => {
        const res = await stacksAPIFetchJson<{
          stx?: { balance: string };
          fungible_tokens?: Record<string, { balance: string }>;
        }>(`${apiUrl}/extended/v1/address/${address}/balances?until_block=${blockHeight}`, {
          next: { revalidate: false },
        });
        if (assetId === 'STX') return res.stx?.balance ?? null;
        return res.fungible_tokens?.[assetId]?.balance ?? null;
      },
    },
  };
}

export interface ContextPackRequest {
  txId: string;
  apiUrl: string;
  network: string;
  explorerBaseUrl: string;
}

export type ContextPackResult =
  | { status: 200; markdown: string; json: ReturnType<typeof renderContextPackJson> }
  | { status: 404; reason: string };

/** Fetch, diagnose and render the agent context pack for a confirmed failed contract call. */
export async function buildContextPack(req: ContextPackRequest): Promise<ContextPackResult> {
  let tx;
  try {
    tx = await fetchTx(req.apiUrl, req.txId);
  } catch {
    return { status: 404, reason: 'Transaction not found.' };
  }
  if (!isFailedContractCall(tx)) {
    return {
      status: 404,
      reason:
        'No diagnosis for this transaction: it is not a confirmed, failed contract call. Only transactions with status abort_by_response or abort_by_post_condition have a context pack.',
    };
  }
  const diagnosis = await diagnose(tx, serverLoaders(req.apiUrl));
  const input = {
    tx,
    diagnosis,
    explorerBaseUrl: req.explorerBaseUrl,
    apiUrl: req.apiUrl,
    network: req.network,
  };
  return {
    status: 200,
    markdown: renderContextPackMarkdown(input),
    json: renderContextPackJson(input),
  };
}
