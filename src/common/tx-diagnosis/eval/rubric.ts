/**
 * Deterministic quality rubric for a diagnosis: claims the engine makes must be consistent with the
 * evidence it holds. Used by the golden-corpus test and by the evaluation harness
 * (`pnpm diagnosis:eval`), so a copy or classification change that breaks a rule fails here first.
 */
import { DETERMINISTIC_TAGS, SemanticTag } from '../tags';
import type { Diagnosis, FailedContractCallTx } from '../types';

export type ResolutionOutcome =
  | 'named'
  | 'ambiguous'
  | 'masked'
  | 'native_certain'
  | 'native_tentative'
  | 'unresolved'
  | 'not_applicable';

/** How far the engine got with an explicit error code. */
export function resolutionOutcome(d: Diagnosis): ResolutionOutcome {
  if (d.class !== 'contract_error' && d.class !== 'post_condition_masked_error')
    return 'not_applicable';
  const ec = d.errorCode;
  if (!ec) return 'unresolved';
  if (ec.foldMask) return 'masked';
  if (ec.candidateNames?.length) return 'ambiguous';
  if (ec.name) return 'named';
  if (ec.nativeFunction) return ec.nativeTentative ? 'native_tentative' : 'native_certain';
  return 'unresolved';
}

/** A stable key for "the same kind of failure": contract, function, class and code or variant. */
export function shapeKey(tx: FailedContractCallTx, d: Diagnosis): string {
  const detail =
    d.errorCode?.code ?? d.runtime?.variant ?? d.postCondition?.problem ?? d.subkind ?? 'unknown';
  return `${tx.contract_call.contract_id}::${tx.contract_call.function_name}::${d.class}::${detail}`;
}

export interface RubricFailure {
  rule: string;
  detail: string;
}

export interface RubricResult {
  passed: string[];
  failed: RubricFailure[];
}

interface Rule {
  id: string;
  description: string;
  /** Returns a short failure detail, or null when the rule holds. */
  check: (tx: FailedContractCallTx, d: Diagnosis) => string | null;
}

function tagOf(d: Diagnosis): SemanticTag | undefined {
  return d.evidence.find(e => e.id === 'tag')?.value as SemanticTag | undefined;
}

function allText(d: Diagnosis): string {
  const parts = d.whatHappened.flatMap(f =>
    f.parts.map(p => (typeof p === 'string' ? p : `${p.label} ${p.value}`))
  );
  const dev = (d.developerNote ?? []).map(p => (typeof p === 'string' ? p : p.value));
  return [d.headline, d.senderAction, d.invariant, ...parts, ...dev].join(' ');
}

export const RULES: Rule[] = [
  {
    id: 'headline-length',
    description: 'The headline is one sentence of 20 to 200 characters.',
    check: (_tx, d) =>
      d.headline.length < 20 || d.headline.length > 200 ? `${d.headline.length} chars` : null,
  },
  {
    id: 'sender-action',
    description: 'A sender action is always present.',
    check: (_tx, d) => (d.senderAction.trim().length < 10 ? 'missing' : null),
  },
  {
    id: 'fee-invariant',
    description: 'The invariant states that only the fee was spent.',
    check: (_tx, d) => (/fee was spent/.test(d.invariant) ? null : d.invariant),
  },
  {
    id: 'no-would-have-succeeded',
    description: 'An (err …) result is never described as having succeeded.',
    check: (tx, d) =>
      (tx.tx_result?.repr ?? '').startsWith('(err') && /would have succeeded/i.test(allText(d))
        ? 'found in rendered diagnosis copy'
        : null,
  },
  {
    id: 'certain-native-action',
    description: 'A certain built-in error keeps its specific sender remedy.',
    check: (_tx, d) => {
      const ec = d.errorCode;
      if (!ec?.nativeFunction || ec.nativeTentative || !ec.nativeSender) return null;
      return d.senderAction === ec.nativeSender
        ? null
        : `expected “${ec.nativeSender}”; got “${d.senderAction}”`;
    },
  },
  {
    id: 'no-template-artefacts',
    description: 'No undefined / NaN / template leaks in the copy.',
    check: (_tx, d) => {
      const m = allText(d).match(/\bundefined\b|\bNaN\b|\$\{|\[object Object\]/);
      return m ? m[0] : null;
    },
  },
  {
    id: 'tentative-native-hedged',
    description:
      'A built-in that is only a candidate is presented with a hedge and low confidence.',
    check: (_tx, d) => {
      const ec = d.errorCode;
      if (!ec?.nativeFunction || !ec.nativeTentative) return null;
      if (!/possibly/.test(d.headline)) return `headline not hedged: ${d.headline}`;
      if (d.confidence !== 'low') return `confidence ${d.confidence}`;
      return null;
    },
  },
  {
    id: 'ambiguous-low',
    description: 'Several candidate constants mean low confidence and no single named constant.',
    check: (_tx, d) => {
      const ec = d.errorCode;
      if (!ec?.candidateNames?.length) return null;
      if (ec.name) return `name ${ec.name} set alongside candidates`;
      if (d.confidence !== 'low') return `confidence ${d.confidence}`;
      if (!/definitions|candidates/.test(d.headline))
        return `headline does not mention the candidates`;
      return null;
    },
  },
  {
    id: 'unreachable-not-high',
    description: 'A constant not thrown in reachable code is never presented with high confidence.',
    check: (_tx, d) =>
      d.errorCode?.name && d.errorCode.reachable === false && d.confidence === 'high'
        ? `high confidence on unreachable ${d.errorCode.name}`
        : null,
  },
  {
    id: 'masked-placeholder',
    description: 'A fold-masked code is called a placeholder at medium confidence.',
    check: (_tx, d) => {
      if (!d.errorCode?.foldMask) return null;
      if (d.confidence !== 'medium') return `confidence ${d.confidence}`;
      if (!/real (cause|error)|placeholder/i.test(d.headline)) return d.headline;
      return null;
    },
  },
  {
    id: 'unknown-low',
    description: 'An unrecognised vm_error is low confidence and never called an app bug.',
    check: (_tx, d) => {
      if (d.class !== 'unknown_vm_error') return null;
      if (d.confidence !== 'low') return `confidence ${d.confidence}`;
      if (/app bug/i.test(d.headline + d.senderAction)) return 'called an app bug';
      return null;
    },
  },
  {
    id: 'deterministic-no-retry',
    description:
      'Failures decided by state (taken, already, unauthorised, dust, limit) never advise a plain retry.',
    check: (_tx, d) => {
      const tag = tagOf(d);
      if (!tag || !DETERMINISTIC_TAGS.has(tag)) return null;
      const advice = d.senderAction.replace(/\b(?:nothing|no need) to retry\b/gi, '');
      return /\bretr(?:y|ied|ying)\b/i.test(advice) ? d.senderAction : null;
    },
  },
  {
    id: 'source-line-in-excerpt',
    description: 'The failing line, when known, is inside the rendered excerpt.',
    check: (_tx, d) =>
      d.source?.failingLine && !d.source.lines.some(l => l.n === d.source!.failingLine)
        ? `line ${d.source.failingLine} not in excerpt`
        : null,
  },
  {
    id: 'links-well-formed',
    description: 'Fact links are same-page queries or absolute explorer paths.',
    check: (_tx, d) => {
      const bad = d.whatHappened
        .map(f => f.link?.href)
        .filter((h): h is string => !!h && !h.startsWith('?') && !h.startsWith('/'));
      return bad.length ? bad.join(', ') : null;
    },
  },
  {
    id: 'chips-have-values',
    description: 'Every identifier chip has a value to copy.',
    check: (_tx, d) => {
      const empty = d.whatHappened
        .flatMap(f => [...f.parts, ...(f.chips ?? [])])
        .filter(p => typeof p !== 'string' && !p.value.trim());
      return empty.length ? `${empty.length} empty chips` : null;
    },
  },
  {
    id: 'masked-pc-explains-post-condition',
    description:
      'A post-condition failure caused by a contract error says why the post-condition failed.',
    check: (_tx, d) =>
      d.class === 'post_condition_masked_error' && !/post-condition/i.test(allText(d))
        ? 'no post-condition explanation'
        : null,
  },
  {
    id: 'post-condition-row-exists',
    description: 'An implicated post-condition index points at a real post-condition.',
    check: (tx, d) =>
      d.postCondition?.index !== undefined && !tx.post_conditions?.[d.postCondition.index]
        ? `index ${d.postCondition.index} out of range`
        : null,
  },
];

export function checkDiagnosis(tx: FailedContractCallTx, d: Diagnosis): RubricResult {
  const result: RubricResult = { passed: [], failed: [] };
  for (const rule of RULES) {
    const detail = rule.check(tx, d);
    if (detail === null) result.passed.push(rule.id);
    else result.failed.push({ rule: rule.id, detail });
  }
  return result;
}
