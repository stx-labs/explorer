import type { Transaction } from '@stacks/stacks-blockchain-api-types';

import type { ContractInfo } from '../../../src/common/tx-diagnosis/types';

export interface ContractRecord {
  contract_id: string;
  tx_id: string;
  source_code: string;
  abi?: string | null;
}

/** Run `fn` over `items` with at most `limit` in flight, preserving order. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    })
  );
  return out;
}

/**
 * Thin client for the public Stacks API: retries 429 / 5xx with backoff and keeps well under the
 * unauthenticated 20 req/s. No API key is ever sent from here.
 */
export class StacksApi {
  readonly requests = { made: 0, retried: 0 };

  constructor(readonly baseUrl: string) {}

  async getJson<T>(path: string, attempt = 0): Promise<T> {
    this.requests.made++;
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { accept: 'application/json' },
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      this.requests.retried++;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      return this.getJson<T>(path, attempt + 1);
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
    return (await res.json()) as T;
  }

  /** One page of recent confirmed contract calls, newest first. */
  recentContractCalls(offset: number, limit = 50) {
    return this.getJson<{ total: number; results: Transaction[] }>(
      `/extended/v1/tx?type=contract_call&limit=${limit}&offset=${offset}`
    );
  }

  tx(txId: string) {
    return this.getJson<Transaction>(`/extended/v1/tx/${txId}`);
  }

  contract(contractId: string) {
    return this.getJson<ContractRecord>(`/extended/v1/contract/${contractId}`);
  }
}

export function toContractInfo(c: ContractRecord): ContractInfo {
  let abi: unknown;
  try {
    abi = c.abi ? JSON.parse(c.abi) : undefined;
  } catch {
    abi = undefined;
  }
  return { contract_id: c.contract_id, source_code: c.source_code, abi };
}
