import { FtBalance } from '@stacks/stacks-blockchain-api-types';

export const FT_BALANCES_PAGE_SIZE = 200;

// Cap the parallel page fan-out for whale addresses (e.g. >1000 distinct FTs).
// Without a cap, a 5000-FT address would issue 25 simultaneous requests.
const MAX_CONCURRENT_PAGES = 5;

export interface FtBalancesPage {
  results?: { token: string; balance: string }[];
  total?: number;
}

export interface FetchAllFtBalancesOptions {
  // Called when a non-first page rejects so the caller can log without aborting.
  // First-page errors are intentionally allowed to escalate to the caller.
  onPageError?: (error: unknown, offset: number) => void;
}

export async function fetchAllFtBalances(
  fetchPage: (offset: number) => Promise<FtBalancesPage>,
  { onPageError }: FetchAllFtBalancesOptions = {}
): Promise<Record<string, FtBalance>> {
  const fungibleTokens: Record<string, FtBalance> = {};

  const firstPage = await fetchPage(0);
  for (const { token, balance } of firstPage.results ?? []) {
    fungibleTokens[token] = { balance, total_sent: '0', total_received: '0' };
  }

  const total = firstPage.total ?? 0;
  if (total <= FT_BALANCES_PAGE_SIZE) return fungibleTokens;

  const offsets: number[] = [];
  for (let offset = FT_BALANCES_PAGE_SIZE; offset < total; offset += FT_BALANCES_PAGE_SIZE) {
    offsets.push(offset);
  }

  for (let i = 0; i < offsets.length; i += MAX_CONCURRENT_PAGES) {
    const batch = offsets.slice(i, i + MAX_CONCURRENT_PAGES);
    const results = await Promise.allSettled(batch.map(offset => fetchPage(offset)));
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        for (const { token, balance } of result.value.results ?? []) {
          fungibleTokens[token] = { balance, total_sent: '0', total_received: '0' };
        }
      } else {
        onPageError?.(result.reason, batch[idx]);
      }
    });
  }

  return fungibleTokens;
}
