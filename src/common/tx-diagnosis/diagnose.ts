import {
  contractCallTargets,
  contractDeployer,
  contractPrincipalsIn,
  excerpt,
  findFunctionBody,
  functionSourceLines,
  listItemCount,
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
  buildUnknownVmError,
  correlationFacts,
  summarizePostCondition,
} from './templates';
import {
  BatchInfo,
  ContractInfo,
  ContractLoader,
  Correlations,
  Diagnosis,
  ENGINE_VERSION,
  FailedContractCallTx,
  FunctionSource,
  HistoryLoader,
  ReadOnlyFunction,
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

/** Enough for a whole entry point plus its helpers without turning the pack into the contract. */
const FUNCTION_SOURCE_MAX_LINES = 250;

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

/** The first list-typed argument: batch calls fail as a whole, and agents need the item count. */
function batchInfo(tx: FailedContractCallTx): BatchInfo | undefined {
  for (const a of tx.contract_call.function_args ?? []) {
    const n = listItemCount(a.repr ?? '');
    if (n !== null) return { argName: a.name, itemCount: n };
  }
  return undefined;
}

/** The called function and every in-contract helper it reaches, verbatim (capped). */
function functionSource(
  tx: FailedContractCallTx,
  called: ContractInfo | null
): FunctionSource | undefined {
  if (!called) return undefined;
  const fnName = tx.contract_call.function_name;
  const bodies = reachableFunctions(called.source_code, fnName);
  if (!bodies.length) return undefined;
  const { lines, truncated } = functionSourceLines(
    called.source_code,
    bodies,
    FUNCTION_SOURCE_MAX_LINES
  );
  return {
    contractId: tx.contract_call.contract_id,
    functionName: fnName,
    helpers: bodies.map(b => b.name).filter(n => n !== fnName),
    lines,
    truncated,
  };
}

interface AbiLike {
  functions?: { name: string; access: string; args?: { name: string; type: unknown }[] }[];
}

function abiType(t: unknown): string {
  if (typeof t === 'string') return t;
  try {
    return JSON.stringify(t);
  } catch {
    return 'unknown';
  }
}

/** Read-only functions from the ABI: what an agent can call at this block to test hypotheses. */
function readOnlyFunctions(called: ContractInfo | null): ReadOnlyFunction[] | undefined {
  const abi = called?.abi as AbiLike | undefined;
  if (!abi || !Array.isArray(abi.functions)) return undefined;
  return abi.functions
    .filter(f => f.access === 'read_only')
    .map(f => ({
      name: f.name,
      args: (f.args ?? []).map(a => `${a.name}: ${abiType(a.type)}`),
    }));
}

function build(
  tx: FailedContractCallTx,
  called: ContractInfo | null,
  state: AnalysisState
): Diagnosis {
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
    case 'unknown_vm_error':
      built = buildUnknownVmError(tx, cls);
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
    batch: batchInfo(tx),
    functionSource: functionSource(tx, called),
    readOnlyFunctions: readOnlyFunctions(called),
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
  return build(tx, called, initialState(tx, called));
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
  const provisional = build(tx, called, state);
  state.related = await correlate(tx, provisional, loaders.history);
  return build(tx, called, state);
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
