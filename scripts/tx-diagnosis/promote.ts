/**
 * Promote live transactions into the golden corpus under src/common/tx-diagnosis/__fixtures__:
 * the transaction, every contract the diagnosis touched, a label drafted from the current engine
 * output (verify it — that is the point), and the id appended to corpus-txids.json for the live
 * acceptance test.
 *
 *   pnpm diagnosis:promote -- --tx 0x… [--tx 0x…] [--notes "why this case matters"] [--dry-run]
 *
 * The drafted label is a starting point, not ground truth: verify it against the source and edit
 * it to the correct values when the engine is wrong — that is how a new failure shape becomes a
 * regression test. --dry-run prints the drafted labels and writes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';

import { findFunctionBody, reachableFunctions } from '../../src/common/tx-diagnosis/clarity-source';
import { diagnose } from '../../src/common/tx-diagnosis/diagnose';
import { ENGINE_VERSION, isFailedContractCall } from '../../src/common/tx-diagnosis/types';
import type { ContractInfo, FailedContractCallTx } from '../../src/common/tx-diagnosis/types';
import { StacksApi, toContractInfo } from './lib/api';
import { flag, list, parseArgs, str } from './lib/args';
import { readJson, repoRoot, writeJson } from './lib/run';

const log = (line: string) => process.stderr.write(`${line}\n`);

interface Label {
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

const EXCERPT_THRESHOLD = 100_000;

/** Keep large contracts small: constants plus the functions the call reaches. */
function excerptSource(source: string, fnName: string): string {
  if (source.length <= EXCERPT_THRESHOLD) return source;
  const constants = source.split('\n').filter(l => /^\s*\(define-constant\s/.test(l));
  const bodies = reachableFunctions(source, fnName);
  if (!bodies.length && !findFunctionBody(source, fnName))
    return source.slice(0, EXCERPT_THRESHOLD);
  return [
    ';; Excerpt for the golden corpus: define-constant lines and the functions reachable from the called function.',
    ...constants,
    '',
    ...bodies.sort((a, b) => a.start - b.start).map(b => b.text),
  ].join('\n');
}

function trimTx(tx: FailedContractCallTx): FailedContractCallTx {
  const copy = JSON.parse(JSON.stringify(tx)) as FailedContractCallTx;
  for (const a of copy.contract_call.function_args ?? []) {
    if (a.hex && a.hex.length > 2048) a.hex = `${a.hex.slice(0, 66)}…`;
    if (a.repr && a.repr.length > 4096) a.repr = `${a.repr.slice(0, 4096)}…`;
  }
  delete (copy as { events?: unknown }).events;
  return copy;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ids = list(args, 'tx');
  if (!ids.length) {
    log(
      'usage: pnpm diagnosis:promote -- --tx <txid> [--tx <txid>] [--api <url>] [--notes <text>] [--dry-run]'
    );
    process.exit(2);
  }
  const api = new StacksApi(str(args, 'api', 'https://api.hiro.so').replace(/\/$/, ''));
  const notes = args.values.get('notes')?.[0];
  const dryRun = flag(args, 'dry-run');
  const drafted: Label[] = [];
  const fixtures = path.join(repoRoot(), 'src', 'common', 'tx-diagnosis', '__fixtures__');
  const labelsPath = path.join(fixtures, 'labels.json');
  const corpusPath = path.join(fixtures, 'corpus-txids.json');
  const labels = readJson<Label[]>(labelsPath);
  const corpus = readJson<string[]>(corpusPath);

  for (const id of ids) {
    if (labels.some(l => l.tx_id === id || l.all_tx_ids.includes(id))) {
      log(`${id}: already in the golden corpus`);
      continue;
    }
    const tx = await api.tx(id);
    if (!isFailedContractCall(tx)) {
      log(`${id}: not a confirmed failed contract call (${tx.tx_type} / ${tx.tx_status})`);
      continue;
    }
    // Record every contract the diagnosis fetched so the offline test reproduces the same result.
    const fetched = new Map<string, ContractInfo>();
    const d = await diagnose(tx, {
      contracts: async cid => {
        try {
          const c = toContractInfo(await api.contract(cid));
          fetched.set(cid, c);
          return c;
        } catch {
          return null;
        }
      },
    });
    const tag = d.evidence.find(e => e.id === 'tag')?.value ?? null;
    const label: Label = {
      contract: tx.contract_call.contract_id,
      fn: tx.contract_call.function_name,
      result: tx.tx_result?.repr ?? '',
      count: 1,
      expected_class: d.class,
      expected_subkind: d.subkind ?? null,
      err_code: d.errorCode?.code ?? null,
      expected_err_name: d.errorCode?.name ?? null,
      expected_defined_in: d.errorCode?.definedIn ?? null,
      expected_tag: tag,
      native_candidates: d.errorCode?.nativeFunction ? [d.errorCode.nativeFunction] : null,
      trait_args: d.errorCode?.dynamicDispatch ?? null,
      pc_mode: tx.post_condition_mode ?? null,
      n_pc: tx.post_conditions?.length ?? null,
      notes: `${notes ? `${notes} — ` : ''}promoted ${new Date().toISOString().slice(0, 10)} from a live sample; expectations drafted from engine v${ENGINE_VERSION}, verify before relying on them`,
      tx_id: id,
      all_tx_ids: [id],
    };
    drafted.push(label);
    if (!dryRun) {
      writeJson(path.join(fixtures, 'txs', `${id}.json`), trimTx(tx));
      for (const [cid, c] of Array.from(fetched)) {
        const file = path.join(fixtures, 'contracts', `${cid}.json`);
        if (fs.existsSync(file)) continue;
        const fnName = cid === tx.contract_call.contract_id ? tx.contract_call.function_name : '';
        writeJson(file, {
          contract_id: cid,
          source_code: fnName ? excerptSource(c.source_code, fnName) : c.source_code,
        });
      }
      labels.push(label);
      if (!corpus.includes(id)) corpus.push(id);
    }
    log(
      `${id}: ${d.class} · ${d.errorCode?.name ?? d.runtime?.variant ?? d.postCondition?.problem ?? d.subkind} · ${fetched.size} contract(s) ${dryRun ? 'fetched' : 'saved'}`
    );
  }
  if (dryRun) {
    process.stdout.write(`${JSON.stringify(drafted, null, 2)}\n`);
    log(`dry run: ${drafted.length} label(s) drafted, nothing written`);
    return;
  }
  writeJson(labelsPath, labels);
  writeJson(corpusPath, corpus);
  log(
    `labels: ${labels.length} · corpus ids: ${corpus.length}. Review the new label(s) in ${path.relative(repoRoot(), labelsPath)} and run pnpm test:unit.`
  );
}

main().catch(err => {
  log(`error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exit(1);
});
