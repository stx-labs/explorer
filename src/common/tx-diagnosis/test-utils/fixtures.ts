import fs from 'fs';
import path from 'path';

import type { ContractInfo, FailedContractCallTx } from '../types';

export interface GoldenLabel {
  contract: string;
  fn: string;
  result: string;
  count: number;
  expected_class: string;
  expected_subkind: string | null;
  err_code: string | null;
  expected_err_name: string | null;
  expected_defined_in: string | null;
  expected_tag: string | null;
  native_candidates: string[] | null;
  trait_args: boolean | null;
  pc_mode: string | null;
  n_pc: number | null;
  notes: string | null;
  tx_id: string;
  all_tx_ids: string[];
}

const ROOT = path.join(__dirname, '..', '__fixtures__');

export const labels: GoldenLabel[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'labels.json'), 'utf8')
);

export function loadTx(txId: string): FailedContractCallTx {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'txs', `${txId}.json`), 'utf8'));
}

export function loadContract(contractId: string): ContractInfo | null {
  const p = path.join(ROOT, 'contracts', `${contractId}.json`);
  if (!fs.existsSync(p)) return null;
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { contract_id: c.contract_id, source_code: c.source_code };
}

/** Loader that only knows the committed fixtures (never hits the network). */
export const fixtureLoader = async (contractId: string) => loadContract(contractId);

export const SBTC_TX_ID = '0x22b61b960238b6e2a5c9749f61ed3f87084fac2002e8d4cd7b02339b3400d0f1';
