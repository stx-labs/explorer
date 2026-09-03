import {
  ConstantMatch,
  FunctionBody,
  allFunctionBodies,
  contractCallTargets,
  contractDeployer,
  contractPrincipalsIn,
  excerpt,
  findErrorConstant,
  findFunctionBody,
  hasTraitParams,
  nativeAssetCalls,
  reachableFunctions,
  usageLines,
} from './clarity-source';
import { nativeErrorFor } from './native-errors';
import { RegistryEntry, lookupRegistry } from './registry';
import { SemanticTag, tagForName } from './tags';
import type {
  ContractInfo,
  ContractLoader,
  ErrorCodeInfo,
  FailedContractCallTx,
  SourceRef,
} from './types';

export interface Resolution {
  info: ErrorCodeInfo;
  tag?: SemanticTag;
  registry?: RegistryEntry;
  source?: SourceRef;
  /** Resolution finished without needing more fetches. */
  complete: boolean;
}

export interface ResolveOptions {
  /** Maximum callee contracts to fetch when the code is not defined in the called contract. */
  maxCalleeFetches?: number;
}

const DEFAULT_MAX_FETCHES = 3;

function sourceRefFor(
  contractId: string,
  source: string,
  match: ConstantMatch,
  body: FunctionBody | null
): SourceRef {
  const lines = body ? usageLines(source, body, match.name) : [];
  const failingLine = lines[0];
  return {
    contractId,
    functionName: body?.name,
    failingLine,
    lines: excerpt(source, failingLine ?? match.line, 2, 1),
    note: failingLine
      ? undefined
      : `Defined at line ${match.line}; used outside the called function.`,
  };
}

function bodyForCall(called: ContractInfo | null, fnName: string): FunctionBody | null {
  return called ? findFunctionBody(called.source_code, fnName) : null;
}

/**
 * Synchronous part: the called contract only (already on the page). Returns `complete: false` when
 * a callee fetch might still find the definition.
 */
export function resolveErrorCodeSync(
  code: string,
  tx: FailedContractCallTx,
  called: ContractInfo | null
): Resolution {
  const contractId = tx.contract_call.contract_id;
  const fnName = tx.contract_call.function_name;
  const registry = lookupRegistry(contractId, code);
  const body = bodyForCall(called, fnName);
  const dynamicDispatch = body ? hasTraitParams(body) : false;

  const base: ErrorCodeInfo = {
    code,
    dynamicDispatch,
    candidatesTried: [],
    name: registry?.name,
  };

  if (!called) {
    return { info: base, registry, tag: registry?.tag, complete: false };
  }

  const match = findErrorConstant(called.source_code, code);
  if (match) {
    const info: ErrorCodeInfo = {
      ...base,
      name: match.name,
      definedIn: contractId,
      definitionLine: match.line,
      usageLines: body ? usageLines(called.source_code, body, match.name) : [],
      comments: match.comments,
    };
    return {
      info,
      registry,
      tag: registry?.tag ?? tagForName(match.name),
      source: sourceRefFor(contractId, called.source_code, match, body),
      complete: true,
    };
  }

  // Native fallback is only conclusive when a single built-in could have produced the code.
  if (body && /^u[1-4]$/.test(code)) {
    const natives = nativeAssetCalls(body).filter(fn => nativeErrorFor(fn, code));
    if (natives.length === 1) {
      const native = nativeErrorFor(natives[0], code)!;
      return {
        info: { ...base, nativeFunction: natives[0], nativeMeaning: native.meaning },
        registry,
        tag: registry?.tag ?? 'insufficient',
        complete: false, // a callee may still define it; native stays as fallback
      };
    }
  }

  return { info: base, registry, tag: registry?.tag, complete: false };
}

/** Candidate callee contracts, most likely first: runtime-chosen (from args) before static references. */
export function calleeCandidates(tx: FailedContractCallTx, called: ContractInfo | null): string[] {
  const contractId = tx.contract_call.contract_id;
  const deployer = contractDeployer(contractId);
  const fromArgs = contractPrincipalsIn(
    (tx.contract_call.function_args ?? []).map(a => a.repr ?? '')
  );
  let fromBody: string[] = [];
  let fromSource: string[] = [];
  if (called) {
    const bodies = reachableFunctions(called.source_code, tx.contract_call.function_name);
    fromBody = bodies.flatMap(b => contractCallTargets(b.text, deployer));
    fromSource = contractCallTargets(called.source_code, deployer);
  }
  return Array.from(new Set(fromArgs.concat(fromBody, fromSource))).filter(c => c !== contractId);
}

/**
 * Asynchronous part: fetch up to `maxCalleeFetches` callee contracts and look for the definition
 * there. Falls back to the sync result (native / registry / unresolved).
 */
export async function resolveErrorCode(
  code: string,
  tx: FailedContractCallTx,
  called: ContractInfo | null,
  load: ContractLoader,
  options: ResolveOptions = {}
): Promise<Resolution> {
  const sync = resolveErrorCodeSync(code, tx, called);
  if (sync.complete) return sync;

  const max = options.maxCalleeFetches ?? DEFAULT_MAX_FETCHES;
  const candidates = calleeCandidates(tx, called).slice(0, max);
  const fetched = await Promise.all(
    candidates.map(async id => {
      try {
        return await load(id);
      } catch {
        return null;
      }
    })
  );

  for (let i = 0; i < candidates.length; i++) {
    const callee = fetched[i];
    if (!callee) continue;
    const match = findErrorConstant(callee.source_code, code);
    if (!match) continue;
    // Usage inside the callee: search all of its functions for the first usage site.
    let body: FunctionBody | null = null;
    for (const b of allFunctionBodies(callee.source_code)) {
      if (usageLines(callee.source_code, b, match.name).length) {
        body = b;
        break;
      }
    }
    const info: ErrorCodeInfo = {
      ...sync.info,
      name: match.name,
      definedIn: candidates[i],
      definitionLine: match.line,
      comments: match.comments,
      candidatesTried: candidates.slice(0, i + 1),
    };
    return {
      info,
      registry: sync.registry ?? lookupRegistry(candidates[i], code),
      tag: sync.registry?.tag ?? tagForName(match.name),
      source: sourceRefFor(candidates[i], callee.source_code, match, body),
      complete: true,
    };
  }

  return {
    ...sync,
    info: { ...sync.info, candidatesTried: candidates },
    complete: true,
  };
}
