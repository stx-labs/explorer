/**
 * Evaluate the failure-diagnosis engine on live transactions.
 *
 *   pnpm diagnosis:eval                          # sample 100 recent failed contract calls
 *   pnpm diagnosis:eval -- --count 200 --per-combo 2
 *   pnpm diagnosis:eval -- --tx 0x… --tx 0x…     # specific transactions (e.g. user reports)
 *   pnpm diagnosis:eval -- --cases .ai-runs/tx-diagnosis/<run>/cases.json --baseline .ai-runs/tx-diagnosis/<run>/report.json
 *   pnpm diagnosis:eval -- --judge --judge-limit 25   # opt-in LLM grading (ANTHROPIC_API_KEY)
 *
 * Writes cases.json, report.json and report.md to .ai-runs/tx-diagnosis/<timestamp>/ (git-ignored).
 * Re-running with --cases after an engine change and --baseline pointing at the previous report
 * shows exactly which diagnoses changed.
 */
import path from 'node:path';

import { renderContextPackMarkdown } from '../../src/common/tx-diagnosis/context-pack';
import { diagnose } from '../../src/common/tx-diagnosis/diagnose';
import type { DiagnoseLoaders } from '../../src/common/tx-diagnosis/diagnose';
import {
  checkDiagnosis,
  resolutionOutcome,
  shapeKey,
} from '../../src/common/tx-diagnosis/eval/rubric';
import { ENGINE_VERSION, isFailedContractCall } from '../../src/common/tx-diagnosis/types';
import type { ContractInfo, FailedContractCallTx } from '../../src/common/tx-diagnosis/types';
import { StacksApi, mapLimit, toContractInfo } from './lib/api';
import { flag, list, num, parseArgs, str } from './lib/args';
import { judgeCases } from './lib/judge';
import { CaseRecord, Report, computeMetrics, diffAgainst, renderReport } from './lib/report';
import {
  CasesFile,
  SampledCase,
  ensureDir,
  readJson,
  repoRoot,
  timestamp,
  writeJson,
} from './lib/run';
import { sampleRecentFailures } from './lib/sample';

const log = (line: string) => process.stderr.write(`${line}\n`);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiUrl = str(args, 'api', 'https://api.hiro.so').replace(/\/$/, '');
  const chain = str(args, 'chain', 'mainnet');
  const explorer = str(args, 'explorer', 'https://explorer.hiro.so').replace(/\/$/, '');
  const count = num(args, 'count', 100);
  const perCombo = num(args, 'per-combo', 3);
  const maxPages = num(args, 'max-pages', 60);
  const concurrency = num(args, 'concurrency', 3);
  const outDir = ensureDir(
    str(args, 'out', path.join(repoRoot(), '.ai-runs', 'tx-diagnosis', timestamp()))
  );
  const api = new StacksApi(apiUrl);

  // 1. Cases: a previous sample, explicit ids, or a fresh live sample.
  let cases: SampledCase[];
  let sampleInfo = { requested: count, scanned: 0, failedSeen: 0, origin: 'recent failures' };
  const casesPath = args.values.get('cases')?.[0];
  const explicit = list(args, 'tx');
  if (casesPath) {
    const file = readJson<CasesFile>(casesPath);
    cases = file.cases;
    sampleInfo = {
      requested: cases.length,
      scanned: 0,
      failedSeen: 0,
      origin: `re-run of ${casesPath}`,
    };
    log(`loaded ${cases.length} cases from ${casesPath}`);
  } else if (explicit.length) {
    const txs = await mapLimit(explicit, concurrency, id => api.tx(id));
    cases = txs.filter(isFailedContractCall).map(tx => ({ tx, origin: 'explicit' as const }));
    const skipped = explicit.length - cases.length;
    if (skipped) log(`${skipped} id(s) skipped: not confirmed failed contract calls`);
    sampleInfo = {
      requested: explicit.length,
      scanned: 0,
      failedSeen: cases.length,
      origin: 'explicit ids',
    };
  } else {
    const s = await sampleRecentFailures(api, { count, perCombo, maxPages, log });
    cases = s.picked.map(tx => ({ tx, origin: 'recent' as const }));
    sampleInfo = {
      requested: count,
      scanned: s.scanned,
      failedSeen: s.failedSeen,
      origin: 'recent failures',
    };
  }
  if (!cases.length) {
    log('no cases to evaluate');
    process.exit(2);
  }
  writeJson(path.join(outDir, 'cases.json'), {
    apiUrl,
    sampledAt: new Date().toISOString(),
    cases,
  } satisfies CasesFile);

  // 2. Diagnose each case with live contract sources (cached within the run).
  const contracts = new Map<string, Promise<ContractInfo | null>>();
  const loadContract = (id: string) => {
    let p = contracts.get(id);
    if (!p) {
      p = api
        .contract(id)
        .then(toContractInfo)
        .catch(() => null);
      contracts.set(id, p);
    }
    return p;
  };
  const loaders: DiagnoseLoaders = { contracts: loadContract };
  if (flag(args, 'correlate')) {
    loaders.history = {
      senderTransactions: async (sender, limit) => {
        const res = await api.getJson<{
          results: {
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
          }[];
        }>(`/extended/v2/addresses/${sender}/transactions?limit=${limit}`);
        return res.results.map(r => ({
          tx_id: r.tx.tx_id,
          tx_status: r.tx.tx_status,
          block_height: r.tx.block_height,
          contract_id: r.tx.contract_call?.contract_id,
          function_name: r.tx.contract_call?.function_name,
          function_args_repr: r.tx.contract_call?.function_args?.map(a => a.repr),
        }));
      },
      addressTxCount: async address =>
        (
          await api.getJson<{ total: number }>(
            `/extended/v2/addresses/${address}/transactions?limit=1`
          )
        ).total ?? 0,
      ftBalanceAt: async (address, assetId, blockHeight) => {
        const res = await api.getJson<{
          stx?: { balance: string };
          fungible_tokens?: Record<string, { balance: string }>;
        }>(`/extended/v1/address/${address}/balances?until_block=${blockHeight}`);
        return assetId === 'STX'
          ? (res.stx?.balance ?? null)
          : (res.fungible_tokens?.[assetId]?.balance ?? null);
      },
    };
  }

  const records: CaseRecord[] = [];
  const packs: { txId: string; pack: string }[] = [];
  await mapLimit(cases, concurrency, async ({ tx }, i) => {
    const d = await diagnose(tx as FailedContractCallTx, loaders);
    records[i] = {
      txId: tx.tx_id,
      contractId: tx.contract_call.contract_id,
      functionName: tx.contract_call.function_name,
      result: tx.tx_result?.repr ?? null,
      vmError: tx.vm_error ?? null,
      blockHeight: tx.block_height,
      class: d.class,
      subkind: d.subkind,
      confidence: d.confidence,
      outcome: resolutionOutcome(d),
      shape: shapeKey(tx, d),
      headline: d.headline,
      senderAction: d.senderAction,
      errorCode: d.errorCode,
      postConditionProblem: d.postCondition?.problem,
      runtimeVariant: d.runtime?.variant,
      rubric: checkDiagnosis(tx, d),
      explorerUrl: `${explorer}/txid/${tx.tx_id}?chain=${chain}`,
    };
    packs[i] = {
      txId: tx.tx_id,
      pack: renderContextPackMarkdown({
        tx,
        diagnosis: d,
        explorerBaseUrl: explorer,
        apiUrl,
        network: chain,
      }),
    };
    if ((i + 1) % 10 === 0) log(`diagnosed ${i + 1}/${cases.length}`);
  });

  // 3. Optional LLM judge.
  let judge;
  if (flag(args, 'judge')) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      log('--judge requires ANTHROPIC_API_KEY; skipping');
    } else {
      judge = await judgeCases(packs, {
        apiKey,
        model: str(args, 'judge-model', 'claude-sonnet-5'),
        limit: num(args, 'judge-limit', 25),
        log,
      });
    }
  }

  // 4. Report.
  const report: Report = {
    engineVersion: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    apiUrl,
    sample: { ...sampleInfo, cases: records.length },
    metrics: computeMetrics(records, judge),
    cases: records,
    judge,
  };
  const baselinePath = args.values.get('baseline')?.[0];
  const diff = baselinePath ? diffAgainst(report, readJson<Report>(baselinePath)) : undefined;
  writeJson(path.join(outDir, 'report.json'), report);
  const md = renderReport(report, diff);
  require('node:fs').writeFileSync(path.join(outDir, 'report.md'), md);

  const m = report.metrics;
  log('');
  log(
    `${records.length} cases · engine v${ENGINE_VERSION} · ${api.requests.made} API requests (${api.requests.retried} retried)`
  );
  log(`rubric: ${m.rubric.casesPassing}/${records.length} cases pass every rule`);
  log(
    `classes: ${Object.entries(m.classes)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}`
  );
  log(
    `code outcomes: ${Object.entries(m.outcomes)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}`
  );
  if (m.judge)
    log(
      `judge means: ${Object.entries(m.judge)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ')}`
    );
  if (diff)
    log(
      `baseline: ${diff.metricLines.length} metric change(s), ${diff.changedCases.length} case(s) changed`
    );
  log(`report: ${path.join(outDir, 'report.md')}`);

  if (flag(args, 'strict') && m.rubric.casesPassing < records.length) process.exit(1);
}

main().catch(err => {
  log(`error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exit(1);
});
