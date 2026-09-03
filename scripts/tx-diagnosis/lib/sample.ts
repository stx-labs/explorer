import { isFailedContractCall } from '../../../src/common/tx-diagnosis/types';
import type { FailedContractCallTx } from '../../../src/common/tx-diagnosis/types';
import { StacksApi } from './api';

export interface SampleOptions {
  /** Failures to collect. */
  count: number;
  /** Cap per (contract, function, result) so one busy protocol does not dominate the sample. */
  perCombo: number;
  /** Pages of 50 recent contract calls to walk at most. */
  maxPages: number;
  log?: (line: string) => void;
}

/**
 * Walk recent confirmed contract calls newest-first and keep the failed ones, stratified by
 * (contract, function, result). Live data every run: the sample reflects what users see today.
 */
export async function sampleRecentFailures(
  api: StacksApi,
  opts: SampleOptions
): Promise<{ picked: FailedContractCallTx[]; scanned: number; failedSeen: number }> {
  const picked: FailedContractCallTx[] = [];
  const perCombo = new Map<string, number>();
  let scanned = 0;
  let failedSeen = 0;
  for (let page = 0; page < opts.maxPages && picked.length < opts.count; page++) {
    const { results } = await api.recentContractCalls(page * 50);
    if (!results.length) break;
    scanned += results.length;
    for (const tx of results) {
      if (!isFailedContractCall(tx)) continue;
      failedSeen++;
      const key = `${tx.contract_call.contract_id}::${tx.contract_call.function_name}::${tx.tx_result?.repr ?? ''}`;
      const n = perCombo.get(key) ?? 0;
      if (n >= opts.perCombo) continue;
      perCombo.set(key, n + 1);
      picked.push(tx);
      if (picked.length >= opts.count) break;
    }
    opts.log?.(
      `page ${page + 1}: scanned ${scanned} calls, ${failedSeen} failed, ${picked.length} picked`
    );
  }
  return { picked, scanned, failedSeen };
}
