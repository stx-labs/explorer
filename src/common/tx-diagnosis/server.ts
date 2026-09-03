import { fetchContractInfo, fetchTx } from '@/api/data-fetchers';
import { StacksApiResponseError } from '@/api/stacksAPIFetch';
import 'server-only';

import { parseContractAbi } from './abi';
import { renderContextPackJson, renderContextPackMarkdown } from './context-pack';
import { DiagnoseLoaders, diagnose } from './diagnose';
import { isFailedContractCall } from './types';

/** Loaders backed by the server-side Stacks API client (carries `EXPLORER_STACKS_API_KEY`). */
export function serverLoaders(apiUrl: string): DiagnoseLoaders {
  return {
    contracts: async id => {
      const c = await fetchContractInfo(apiUrl, id);
      return c?.source_code
        ? { contract_id: id, source_code: c.source_code, abi: parseContractAbi(c.abi) }
        : null;
    },
  };
}

export interface ContextPackRequest {
  txId: string;
  apiUrl: string;
  network: string;
  explorerBaseUrl: string;
  /**
   * The representation's validator and the client's `If-None-Match`. When they match, the pack is
   * not rebuilt: a 304 is returned as soon as the transaction is known to have a pack.
   */
  etag?: string;
  ifNoneMatch?: string | null;
}

export type ContextPackResult =
  | { status: 200; markdown: string; json: ReturnType<typeof renderContextPackJson> }
  | { status: 304 }
  | { status: 404 | 429 | 502 | 503; reason: string; retryAfter?: string };

/** Fetch, diagnose and render the agent context pack for a confirmed failed contract call. */
export async function buildContextPack(req: ContextPackRequest): Promise<ContextPackResult> {
  let tx;
  try {
    tx = await fetchTx(req.apiUrl, req.txId);
  } catch (error) {
    if (error instanceof StacksApiResponseError) {
      if (error.status === 404) return { status: 404, reason: 'Transaction not found.' };
      if (error.status === 429) {
        return {
          status: 429,
          reason: 'The transaction service is rate-limited. Try again shortly.',
          retryAfter: error.retryAfter,
        };
      }
      return {
        status: error.status >= 500 ? 503 : 502,
        reason: 'The transaction service could not provide this transaction.',
      };
    }
    return {
      status: 503,
      reason: 'The transaction service is temporarily unavailable.',
    };
  }
  if (!isFailedContractCall(tx)) {
    return {
      status: 404,
      reason:
        'No diagnosis for this transaction: it is not a confirmed, failed contract call. Only transactions with status abort_by_response or abort_by_post_condition have a context pack.',
    };
  }
  // The representation exists and is stable within an engine version, so a matching validator is
  // answered here — after the transaction is validated, before any contract source is fetched.
  if (req.etag && req.ifNoneMatch === req.etag) return { status: 304 };

  const { contracts } = serverLoaders(req.apiUrl);
  // Context packs use immutable transaction and contract data only. Browser enrichment can include
  // current history, but embedding it here would make the year-long edge cache factually stale.
  const diagnosis = await diagnose(tx, { contracts });
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
