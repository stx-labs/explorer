import {
  contractCallTargets,
  contractDeployer,
  contractPrincipalsIn,
  excerpt,
  findFunctionBody,
  reachableFunctions,
  siteLines,
} from './clarity-source';
import { Classification, classifyFailure } from './classify';
import { correlate } from './correlate';
import {
  Resolution,
  ResolveOptions,
  resolveErrorCode,
  resolveErrorCodeSync,
} from './resolve-error-code';
import {
  buildAnalysisError,
  buildContractError,
  buildPostCondition,
  buildRuntimePanic,
  correlationFacts,
  summarizePostCondition,
} from './templates';
import {
  ContractInfo,
  ContractLoader,
  Correlations,
  Diagnosis,
  ENGINE_VERSION,
  FailedContractCallTx,
  HistoryLoader,
  RuntimeFinding,
  SourceRef,
} from './types';

export interface DiagnoseLoaders {
  contracts: ContractLoader;
  history?: HistoryLoader;
}

interface AnalysisState {
  cls: Classification;
  resolution?: Resolution;
  runtime?: RuntimeFinding;
  runtimeSource?: SourceRef;
  related: Correlations;
}

const SITE_PATTERNS: Record<string, RegExp> = {
  ArithmeticUnderflow: /\(-\s/,
  ArithmeticOverflow: /\((?:\+|\*|pow)\s/,
  DivisionByZero: /\((?:\/|mod)\s/,
  UnwrapFailure: /\(unwrap-(?:panic|err-panic)\s/,
};

function runtimeFinding(
  tx: FailedContractCallTx,
  cls: Classification,
  called: ContractInfo | null
): {
  runtime: RuntimeFinding;
  source?: SourceRef;
} {
  const variant = cls.vmError?.kind === 'runtime' ? cls.vmError.variant : cls.subkind;
  const detail = cls.vmError?.kind === 'runtime' ? cls.vmError.detail : undefined;
  const fromArgs = contractPrincipalsIn(
    (tx.contract_call.function_args ?? []).map(a => a.repr ?? '')
  );
  let callees: string[] = [...fromArgs];
  let candidateLines: number[] = [];
  let source: SourceRef | undefined;

  if (called) {
    const deployer = contractDeployer(tx.contract_call.contract_id);
    const bodies = reachableFunctions(called.source_code, tx.contract_call.function_name);
    callees.push(...bodies.flatMap(b => contractCallTargets(b.text, deployer)));
    const pattern = SITE_PATTERNS[variant];
    if (pattern) {
      candidateLines = bodies.flatMap(b => siteLines(called.source_code, b, pattern));
    }
    const entry = findFunctionBody(called.source_code, tx.contract_call.function_name);
    if (entry) {
      const line = candidateLines.length === 1 ? candidateLines[0] : entry.line;
      source = {
        contractId: tx.contract_call.contract_id,
        functionName: entry.name,
        lines: excerpt(
          called.source_code,
          line,
          candidateLines.length === 1 ? 2 : 0,
          candidateLines.length === 1 ? 1 : 3
        ),
        failingLine: candidateLines.length === 1 ? line : undefined,
        note:
          candidateLines.length === 1
            ? undefined
            : 'No failing line is known — the network keeps no trace. This is the entry point of the call.',
      };
    }
  }
  callees = Array.from(new Set(callees)).filter(c => c !== tx.contract_call.contract_id);
  return { runtime: { variant, detail, calleeCandidates: callees, candidateLines }, source };
}

function build(tx: FailedContractCallTx, state: AnalysisState): Diagnosis {
  const { cls } = state;
  let built;
  let source: SourceRef | undefined;

  switch (cls.class) {
    case 'contract_error':
      built = buildContractError(tx, cls, state.resolution);
      source = state.resolution?.source;
      break;
    case 'post_condition_masked_error':
      built = buildContractError(tx, cls, state.resolution, {
        pcSummary: summarizePostCondition(cls),
      });
      source = state.resolution?.source;
      break;
    case 'runtime_panic':
      built = buildRuntimePanic(tx, cls, state.runtime!);
      source = state.runtimeSource;
      break;
    case 'analysis_error':
      built = buildAnalysisError(tx, cls);
      break;
    default:
      built = buildPostCondition(tx, cls);
  }

  const whatHappened = [...built.whatHappened, ...correlationFacts(tx, state.related, cls)];

  return {
    engineVersion: ENGINE_VERSION,
    txId: tx.tx_id,
    class: cls.class,
    subkind: cls.subkind,
    confidence: built.confidence,
    headline: built.headline,
    senderAction: built.senderAction,
    invariant: built.invariant,
    whatHappened,
    developerNote: built.developerNote,
    evidence: built.evidence,
    errorCode: state.resolution?.info,
    postCondition: cls.postCondition,
    runtime: state.runtime,
    source,
    args: (tx.contract_call.function_args ?? []).map(a => ({
      name: a.name,
      value: a.repr,
      type: a.type,
    })),
    related: state.related,
    raw: { vmError: tx.vm_error ?? null, txResult: tx.tx_result ?? null },
  };
}

function initialState(tx: FailedContractCallTx, called: ContractInfo | null): AnalysisState {
  const cls = classifyFailure(tx);
  const state: AnalysisState = { cls, related: {} };
  if (cls.errorCode) {
    state.resolution = resolveErrorCodeSync(cls.errorCode, tx, called);
  }
  if (cls.class === 'runtime_panic') {
    const rt = runtimeFinding(tx, cls, called);
    state.runtime = rt.runtime;
    state.runtimeSource = rt.source;
  }
  return state;
}

/**
 * Tier 0: everything derivable without I/O from the transaction and (if available) the called
 * contract, which the transaction page already has.
 */
export function diagnoseSync(tx: FailedContractCallTx, called: ContractInfo | null): Diagnosis {
  return build(tx, initialState(tx, called));
}

/**
 * Tier 1: callee lookups (bounded) and correlations. Never throws; falls back to the sync result.
 */
export async function enrich(
  tx: FailedContractCallTx,
  called: ContractInfo | null,
  loaders: DiagnoseLoaders,
  options: ResolveOptions = {}
): Promise<Diagnosis> {
  const state = initialState(tx, called);
  if (state.cls.errorCode && state.resolution && !state.resolution.complete) {
    try {
      state.resolution = await resolveErrorCode(
        state.cls.errorCode,
        tx,
        called,
        loaders.contracts,
        options
      );
    } catch {
      // keep the sync resolution
    }
  }
  const provisional = build(tx, state);
  state.related = await correlate(tx, provisional, loaders.history);
  return build(tx, state);
}

/** Convenience: load the called contract, then run both tiers. */
export async function diagnose(
  tx: FailedContractCallTx,
  loaders: DiagnoseLoaders,
  options: ResolveOptions = {}
): Promise<Diagnosis> {
  let called: ContractInfo | null = null;
  try {
    called = await loaders.contracts(tx.contract_call.contract_id);
  } catch {
    called = null;
  }
  return enrich(tx, called, loaders, options);
}
