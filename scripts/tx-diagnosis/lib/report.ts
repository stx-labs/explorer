import { RULES } from '../../../src/common/tx-diagnosis/eval/rubric';
import type { ResolutionOutcome, RubricResult } from '../../../src/common/tx-diagnosis/eval/rubric';
import type { Diagnosis } from '../../../src/common/tx-diagnosis/types';
import type { JudgeScore } from './judge';

export interface CaseRecord {
  txId: string;
  contractId: string;
  functionName: string;
  result: string | null;
  vmError: string | null;
  blockHeight: number;
  class: Diagnosis['class'];
  subkind: string;
  confidence: Diagnosis['confidence'];
  outcome: ResolutionOutcome;
  shape: string;
  headline: string;
  senderAction: string;
  errorCode?: Diagnosis['errorCode'];
  postConditionProblem?: string;
  runtimeVariant?: string;
  rubric: RubricResult;
  explorerUrl: string;
}

export interface Report {
  engineVersion: string;
  generatedAt: string;
  apiUrl: string;
  sample: { requested: number; scanned: number; failedSeen: number; cases: number; origin: string };
  metrics: Metrics;
  cases: CaseRecord[];
  judge?: JudgeScore[];
}

export interface Metrics {
  classes: Record<string, number>;
  outcomes: Record<string, number>;
  confidence: Record<string, number>;
  rubric: { casesPassing: number; failuresByRule: Record<string, number> };
  judge?: Record<string, number>;
}

function count<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) out[key(it)] = (out[key(it)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

export function computeMetrics(cases: CaseRecord[], judge?: JudgeScore[]): Metrics {
  const failuresByRule: Record<string, number> = {};
  let casesPassing = 0;
  for (const c of cases) {
    if (!c.rubric.failed.length) casesPassing++;
    for (const f of c.rubric.failed) failuresByRule[f.rule] = (failuresByRule[f.rule] ?? 0) + 1;
  }
  const metrics: Metrics = {
    classes: count(cases, c => c.class),
    outcomes: count(
      cases.filter(c => c.outcome !== 'not_applicable'),
      c => c.outcome
    ),
    confidence: count(cases, c => c.confidence),
    rubric: { casesPassing, failuresByRule },
  };
  const graded = (judge ?? []).filter(j => !j.error);
  if (graded.length) {
    const mean = (k: keyof JudgeScore) =>
      Math.round((graded.reduce((s, j) => s + (j[k] as number), 0) / graded.length) * 100) / 100;
    metrics.judge = {
      graded: graded.length,
      correctness: mean('correctness'),
      clarity: mean('clarity'),
      actionability: mean('actionability'),
      honesty: mean('honesty'),
      safety: mean('safety'),
    };
  }
  return metrics;
}

function pct(n: number, total: number): string {
  return total ? `${Math.round((n / total) * 1000) / 10}%` : '–';
}

function table(rows: [string, string | number][]): string[] {
  return ['| | |', '|---|---|', ...rows.map(([k, v]) => `| ${k} | ${v} |`)];
}

const MARKDOWN_TABLE_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '\\': '\\\\',
  '|': '\\|',
  '\r': ' ',
  '\n': ' ',
};

/** Keep untrusted diagnostic text inside one Markdown table cell. */
export function escapeMarkdownTableCell(value: string): string {
  return value.replace(/[&<>\\|\r\n]/g, character => MARKDOWN_TABLE_ESCAPES[character]);
}

interface Shape {
  key: string;
  count: number;
  outcome: ResolutionOutcome;
  class: string;
  example: CaseRecord;
}

function shapes(cases: CaseRecord[]): Shape[] {
  const byKey = new Map<string, Shape>();
  for (const c of cases) {
    const s = byKey.get(c.shape);
    if (s) s.count++;
    else
      byKey.set(c.shape, {
        key: c.shape,
        count: 1,
        outcome: c.outcome,
        class: c.class,
        example: c,
      });
  }
  return Array.from(byKey.values()).sort((a, b) => b.count - a.count);
}

function shapeRow(s: Shape): string {
  const [contract, fn, , detail] = s.key.split('::');
  return `| ${s.count} | \`${contract.split('.')[1] ?? contract}\` :: \`${fn}\` | \`${detail}\` | ${s.outcome === 'not_applicable' ? s.class : s.outcome} | ${s.example.confidence} | [${s.example.txId.slice(0, 10)}…](${s.example.explorerUrl}) |`;
}

export interface BaselineDiff {
  label: string;
  metricLines: string[];
  changedCases: string[];
}

export function diffAgainst(current: Report, baseline: Report): BaselineDiff {
  const metricLines: string[] = [];
  const total = current.cases.length;
  const baseTotal = baseline.cases.length;
  const compare = (label: string, cur: Record<string, number>, base: Record<string, number>) => {
    for (const k of Array.from(new Set([...Object.keys(cur), ...Object.keys(base)]))) {
      const a = pct(base[k] ?? 0, baseTotal);
      const b = pct(cur[k] ?? 0, total);
      if (a !== b) metricLines.push(`- ${label} \`${k}\`: ${a} → ${b}`);
    }
  };
  compare('class', current.metrics.classes, baseline.metrics.classes);
  compare('outcome', current.metrics.outcomes, baseline.metrics.outcomes);
  compare('confidence', current.metrics.confidence, baseline.metrics.confidence);
  const rubricBefore = pct(baseline.metrics.rubric.casesPassing, baseTotal);
  const rubricAfter = pct(current.metrics.rubric.casesPassing, total);
  if (rubricBefore !== rubricAfter)
    metricLines.push(`- rubric: ${rubricBefore} → ${rubricAfter} of cases pass every rule`);
  const baseById = new Map(baseline.cases.map(c => [c.txId, c]));
  const changedCases: string[] = [];
  for (const c of current.cases) {
    const b = baseById.get(c.txId);
    if (!b) continue;
    const changes: string[] = [];
    if (b.class !== c.class) changes.push(`class ${b.class} → ${c.class}`);
    if (b.outcome !== c.outcome) changes.push(`outcome ${b.outcome} → ${c.outcome}`);
    if (b.confidence !== c.confidence) changes.push(`confidence ${b.confidence} → ${c.confidence}`);
    if ((b.errorCode?.name ?? '') !== (c.errorCode?.name ?? ''))
      changes.push(`constant ${b.errorCode?.name ?? '–'} → ${c.errorCode?.name ?? '–'}`);
    if (b.headline !== c.headline) changes.push('headline changed');
    if (changes.length)
      changedCases.push(`- [${c.txId.slice(0, 10)}…](${c.explorerUrl}): ${changes.join('; ')}`);
  }
  return {
    label: `engine v${baseline.engineVersion}, ${baseline.generatedAt}, ${baseTotal} cases`,
    metricLines,
    changedCases,
  };
}

export function renderReport(report: Report, diff?: BaselineDiff): string {
  const { metrics, cases } = report;
  const total = cases.length;
  const lines: string[] = [];
  lines.push(`# Transaction-failure diagnosis evaluation`);
  lines.push('');
  lines.push(
    `Engine v${report.engineVersion} · ${report.generatedAt} · ${report.apiUrl} · ${total} failed contract calls (${report.sample.origin}${report.sample.scanned ? `; ${report.sample.failedSeen} failures among ${report.sample.scanned} recent calls scanned` : ''})`
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(
    ...table([
      [
        'Cases passing every rubric rule',
        `${metrics.rubric.casesPassing} / ${total} (${pct(metrics.rubric.casesPassing, total)})`,
      ],
      ...Object.entries(metrics.classes).map(
        ([k, v]) => [`Class \`${k}\``, `${v} (${pct(v, total)})`] as [string, string]
      ),
      ...Object.entries(metrics.outcomes).map(
        ([k, v]) => [`Code outcome \`${k}\``, `${v}`] as [string, string]
      ),
      ...Object.entries(metrics.confidence).map(
        ([k, v]) => [`Confidence \`${k}\``, `${v} (${pct(v, total)})`] as [string, string]
      ),
    ])
  );
  lines.push('');
  if (metrics.judge) {
    lines.push('## LLM judge (1–5, mean over graded cases)');
    lines.push('');
    lines.push(
      ...table(Object.entries(metrics.judge).map(([k, v]) => [k, String(v)] as [string, string]))
    );
    lines.push('');
    const low = (report.judge ?? []).filter(
      j => !j.error && Math.min(j.correctness, j.clarity, j.actionability, j.honesty, j.safety) <= 2
    );
    if (low.length) {
      lines.push('Cases with a score of 2 or less in some dimension:');
      lines.push('');
      for (const j of low) {
        const c = cases.find(x => x.txId === j.txId);
        lines.push(
          `- [${j.txId.slice(0, 10)}…](${c?.explorerUrl ?? ''}) — correctness ${j.correctness}, clarity ${j.clarity}, actionability ${j.actionability}, honesty ${j.honesty}, safety ${j.safety}: ${j.issues.join('; ')}`
        );
      }
      lines.push('');
    }
    const errored = (report.judge ?? []).filter(j => j.error);
    if (errored.length)
      lines.push(`${errored.length} case(s) could not be graded: ${errored[0].error}`);
    lines.push('');
  }
  if (diff) {
    lines.push('## Against the baseline');
    lines.push('');
    lines.push(`Baseline: ${diff.label}.`);
    lines.push('');
    lines.push(...(diff.metricLines.length ? diff.metricLines : ['- no metric changes']));
    lines.push('');
    if (diff.changedCases.length) {
      lines.push('Cases whose diagnosis changed:');
      lines.push('');
      lines.push(...diff.changedCases);
      lines.push('');
    }
  }
  const triage = shapes(cases).filter(
    s =>
      s.outcome === 'unresolved' ||
      s.outcome === 'ambiguous' ||
      s.outcome === 'native_tentative' ||
      s.class === 'unknown_vm_error' ||
      s.class === 'runtime_panic'
  );
  lines.push('## Shapes to triage');
  lines.push('');
  lines.push(
    'Unresolved or ambiguous codes are candidates for a registry entry or a resolver fix; unknown `vm_error` strings for the parser. Promote a representative transaction into the golden corpus with `pnpm diagnosis:promote -- --tx <txid>`.'
  );
  lines.push('');
  if (triage.length) {
    lines.push('| Count | Call | Code / variant | Outcome | Confidence | Example |');
    lines.push('|---|---|---|---|---|---|');
    for (const s of triage) lines.push(shapeRow(s));
  } else {
    lines.push(
      'Nothing to triage: every code resolved to a single constant or a certain built-in.'
    );
  }
  lines.push('');
  const failing = cases.filter(c => c.rubric.failed.length);
  lines.push('## Rubric failures');
  lines.push('');
  if (failing.length) {
    lines.push('| Case | Rule | Detail |');
    lines.push('|---|---|---|');
    for (const c of failing)
      for (const f of c.rubric.failed)
        lines.push(
          `| [${c.txId.slice(0, 10)}…](${c.explorerUrl}) | \`${f.rule}\` | ${escapeMarkdownTableCell(f.detail.slice(0, 160))} |`
        );
  } else {
    lines.push('None.');
  }
  lines.push('');
  lines.push('## All shapes');
  lines.push('');
  lines.push('| Count | Call | Code / variant | Outcome | Confidence | Example |');
  lines.push('|---|---|---|---|---|---|');
  for (const s of shapes(cases)) lines.push(shapeRow(s));
  lines.push('');
  lines.push('## Rules');
  lines.push('');
  for (const r of RULES) lines.push(`- \`${r.id}\`: ${r.description}`);
  lines.push('');
  return lines.join('\n');
}
